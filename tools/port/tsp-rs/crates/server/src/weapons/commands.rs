//! Weapon client commands (`ClientCommand` 0xad838; weapons.md §7.1, architecture.md §4).

use super::host::with_host;
use super::inventory::{self, Drop};
use super::{ArmamentEntry, PendingLoadout, SvState, net};
use crate::commands::Args;
use crate::messages::{self, Msg};
use crate::player::Player;
use crate::world::Cx;
use goldsrc::server::engine;
use shared::weapons::{MAX_AMMO, info};

/// `sscanf("%i")`-like: optional sign, decimal / 0x hex / leading-0 octal, stops at the first
/// non-digit. `None` if no digits.
fn scan_int(s: &str) -> Option<(i32, &str)> {
    let s = s.trim_start();
    let (neg, rest) = match s.as_bytes().first() {
        Some(b'-') => (true, &s[1..]),
        Some(b'+') => (false, &s[1..]),
        _ => (false, s),
    };
    let (radix, digits) = if rest.starts_with("0x") || rest.starts_with("0X") {
        (16, &rest[2..])
    } else if rest.len() > 1 && rest.starts_with('0') {
        (8, &rest[1..])
    } else {
        (10, rest)
    };
    let end = digits.find(|c: char| !c.is_digit(radix)).unwrap_or(digits.len());
    if end == 0 {
        return if radix == 8 { Some((0, &rest[1..])) } else { None };
    }
    let v = i64::from_str_radix(&digits[..end], radix).ok()? as i32;
    // `-2147483648` (or a bigger value wrapped to i32::MIN) negates past i32: wrap like C.
    Some((if neg { v.wrapping_neg() } else { v }, &digits[end..]))
}

/// `sscanf("%i_%i")`. The second value defaults to 0 when missing.
fn scan_pair(s: &str) -> Option<(i32, i32)> {
    let (a, rest) = scan_int(s)?;
    let b = rest.strip_prefix('_').and_then(scan_int).map(|(b, _)| b).unwrap_or(0);
    Some((a, b))
}

/// `CBasePlayer::AddItemToArmament` (0x93ea4): the entry goes into the first of the 32 slots whose
/// id is 0. An id-0 entry therefore leaves that slot free for the next one (and `BuyArmament`
/// skips it), so it takes no room.
pub(crate) fn add_armament(armament: &mut Vec<ArmamentEntry>, e: ArmamentEntry) {
    if e.id != 0 && armament.len() < 32 {
        armament.push(e);
    }
}

/// Why the server refused a loadout entry.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Refused {
    /// The loadout would cost more than the budget allows.
    Budget,
    /// The loadout would take more slots than there are.
    Slots,
}

/// The budget and the slot limit a loadout is checked against: the tables' numbers
/// (`combat.toml`'s `budget` and `slots.total`), never a constant here, so a ruleset that
/// changes them is checked against its own.
fn limits() -> (i32, i32) {
    let t = shared::weapons::tables();
    (t.combat.budget, t.combat.slots.total)
}

/// What a loadout entry costs and the slots it takes: a weapon's price and its attachments, or
/// an item's price and the kevlar's slots (the shoes take none).
fn entry_cost_slots(e: &ArmamentEntry) -> (i32, i32) {
    if e.item {
        let slots = if e.id & shared::weapons::att::KEVLAR as i32 != 0 { shared::weapons::tables().combat.slots.kevlar } else { 0 };
        return (shared::weapons::item_price(e.id), slots);
    }
    let Some(w) = info(e.id as u8) else { return (0, 0) };
    (w.cost.saturating_add(shared::weapons::attachments_price(e.attachments)), w.slots)
}

/// The price of one purchase of ammo type `t`.
fn ammo_price(t: u8) -> i32 {
    shared::weapons::tables().ammo(t).map_or(0, |a| a.price)
}

/// How many purchases of ammo type `t` can add anything: each buys `per_buy` rounds, up to the
/// type's carry limit.
fn max_buys(t: u8) -> i32 {
    let Some(a) = shared::weapons::tables().ammo(t) else { return 0 };
    let per = a.per_buy.max(1);
    let carry = super::max_carry(t).max(0);
    if carry == 0 {
        return 0;
    }
    (carry + per - 1) / per
}

/// Admits a loadout entry: its cost goes on the running total and its slots on the running
/// slot count, and it is kept only if the budget and the slots allow it.
fn admit(sv: &mut SvState, e: &ArmamentEntry) -> Option<Refused> {
    // TS's loadout has 32 entries (`AddItemToArmament`): a full one takes no more.
    if sv.armament.len() >= 32 {
        return None;
    }
    let (cost, slots) = entry_cost_slots(e);
    let (budget, max_slots) = limits();
    let total = sv.pending.cost.saturating_add(cost);
    let used = sv.pending.slots.saturating_add(slots);
    if total > budget {
        return Some(Refused::Budget);
    }
    if used > max_slots {
        return Some(Refused::Slots);
    }
    sv.pending.cost = total;
    sv.pending.slots = used;
    add_armament(&mut sv.armament, *e);
    None
}

/// The loadout commands (`rst_cfg`, `tkw`, `tki`, `tka`).
///
/// TS trusts the client's own buy menu: the budget and the slot limit live in the menu, and the
/// server applies whatever it is sent. The browser's DOM menu is a second way in, so the server
/// checks the numbers too.
///
/// `rst_cfg` starts a fresh loadout (the entries, the ammo and the pending totals). `tkw` and
/// `tki` add entries: each entry's cost goes on the running total and its slots on the running
/// slot count, and an entry that would break the budget or the slot limit is refused.
/// `tka` sets the ammo counts, bounded by what the player can carry and by the budget.
///
/// The first refusal is returned, so the caller can tell the player; the rest of that command
/// is then left alone.
pub fn loadout_command(sv: &mut SvState, cmd: &str, args: &Args) -> Option<Refused> {
    match cmd {
        "rst_cfg" => {
            sv.armament.clear();
            sv.armament_ammo = [0; MAX_AMMO];
            sv.pending = PendingLoadout::default();
            None
        }
        "tkw" => {
            for i in 1..args.argc() {
                let Some((id, n)) = scan_pair(args.str(i)) else { continue };
                let stack = (0..38).contains(&id) && info(id as u8).map(|w| w.stack).unwrap_or(false);
                if !stack {
                    let e = ArmamentEntry { id, attachments: n as u32, item: false };
                    if let Some(r) = admit(sv, &e) {
                        return Some(r);
                    }
                } else {
                    let max = info(id as u8).map(|w| w.pellets).unwrap_or(1);
                    let count = if max < 2 { 1 } else { n.clamp(1, max) };
                    for _ in 0..count {
                        let e = ArmamentEntry { id, attachments: 0, item: false };
                        if let Some(r) = admit(sv, &e) {
                            return Some(r);
                        }
                    }
                }
            }
            None
        }
        "tki" => {
            for i in 1..args.argc() {
                if let Some((id, _)) = scan_int(args.str(i)) {
                    let e = ArmamentEntry { id, attachments: 0, item: true };
                    if let Some(r) = admit(sv, &e) {
                        return Some(r);
                    }
                }
            }
            None
        }
        "tka" => {
            for i in 1..args.argc() {
                let Some((t, n)) = scan_pair(args.str(i)) else { continue };
                if !(0..MAX_AMMO as i32).contains(&t) {
                    continue;
                }
                // The count is bounded by what the player can carry: more purchases than that
                // would add nothing, and the spawn loop would run them all.
                let n = n.clamp(0, max_buys(t as u8));
                let total = sv.pending.cost.saturating_add(ammo_price(t as u8).saturating_mul(n));
                if total > limits().0 {
                    return Some(Refused::Budget);
                }
                sv.pending.cost = total;
                sv.pending.ammo = sv.pending.ammo.saturating_add(n);
                sv.armament_ammo[t as usize] = n;
            }
            None
        }
        _ => None,
    }
}

/// Tells the player that the server refused an entry.
fn refuse(cx: &Cx, refused: Refused) {
    let text = match refused {
        Refused::Budget => "Buy menu: not enough money.",
        Refused::Slots => "Buy menu: too many slots.",
    };
    crate::rules::msg::ts_message_one(cx.edict, [195, 45, 45], 8, 100, text);
}

pub fn client_command(p: &mut Player, cx: &mut Cx, cmd: &str, args: &Args) -> bool {
    if let Some(n) = cmd.strip_prefix("weapon_") {
        // weapon_<id>: select (remembers lastinv)
        let Some((id, _)) = scan_int(n) else { return true };
        if !super::gun_active(p) {
            return true;
        }
        p.inv.sv.last_inv = p.inv.gun.current;
        if (0..38).contains(&id) {
            with_host(p, cx, |gun, h| gun.switch_to(id as u8, h));
        }
        return true;
    }
    if let Some(n) = cmd.strip_prefix("lasclr_") {
        let v = scan_int(n).map(|(v, _)| v).unwrap_or(0);
        let mut w = messages::all(Msg::PlInfo);
        w = w.byte(cx.index()).byte(0).byte(v);
        w.end();
        return true;
    }
    if let Some(n) = cmd.strip_prefix("drop_") {
        let id = scan_int(n).map(|(v, _)| v).unwrap_or(-1);
        if (0..38).contains(&id) {
            inventory::drop_weapon(p, cx, Drop::Id(id as u8));
        } else {
            inventory::drop_weapon(p, cx, Drop::Current);
        }
        return true;
    }
    match cmd {
        "drop" => {
            inventory::drop_weapon(p, cx, Drop::Current);
            true
        }
        // The loadout commands: the budget and the slots are checked as the loadout arrives.
        "rst_cfg" | "tkw" | "tki" | "tka" => {
            if let Some(refused) = loadout_command(&mut p.inv.sv, cmd, args) {
                refuse(cx, refused);
            }
            true
        }
        "firemode" => {
            if super::gun_active(p) {
                p.inv.gun.switch_fire_mode();
            }
            true
        }
        "useitems" => {
            if super::gun_active(p) {
                with_host(p, cx, |gun, h| gun.switch_items(h));
            }
            true
        }
        "lastinv" => {
            if !super::gun_active(p) || p.inv.gun.current == 0 {
                return true;
            }
            let target = p.inv.sv.last_inv;
            p.inv.sv.last_inv = p.inv.gun.current;
            with_host(p, cx, |gun, h| gun.switch_to(target, h));
            true
        }
        // Not TS: debug log switch, forwarded here when typed in a listen server's console.
        "ts_weapons_debug" => {
            if engine().cvar_float(c"sv_cheats") != 0.0 && args.argc() > 1 {
                engine().set_cvar_float(c"ts_weapons_debug", args.float(1));
            }
            true
        }
        // Not TS: console helper to arm yourself on servers with sv_cheats (testing).
        "ts_give" => {
            if engine().cvar_float(c"sv_cheats") == 0.0 {
                return true;
            }
            for i in 1..args.argc() {
                if let Some((id, att)) = scan_pair(args.str(i))
                    && (1..38).contains(&id)
                {
                    super::give_weapon(p, cx, id as u8, u32::from(att as u8));
                    if let Some(w) = info(id as u8) {
                        super::give_ammo(p, cx, w.ammo, 999);
                    }
                }
            }
            net::force_update(p);
            true
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The arguments of a loadout command, as the client sends them.
    fn args(line: &str) -> Args {
        Args::parse(line).expect("a command line")
    }

    /// A fresh loadout state, on the default ruleset's tables.
    fn state() -> SvState {
        ts30_gameplay::tables::make_default();
        SvState::default()
    }

    /// A loadout command, on a fresh state.
    fn loadout(cmd: &str, line: &str) -> (SvState, Option<Refused>) {
        let mut sv = state();
        let refused = loadout_command(&mut sv, cmd, &args(line));
        (sv, refused)
    }

    #[test]
    fn id_zero_armament_entries_take_no_slot() {
        let mut a = Vec::new();
        let e = |id| ArmamentEntry { id, attachments: 0, item: false };
        for _ in 0..40 {
            add_armament(&mut a, e(0));
        }
        assert!(a.is_empty(), "AddItemToArmament leaves the slot it wrote id 0 into free");
        for i in 1..=40 {
            add_armament(&mut a, e(i));
        }
        assert_eq!(a.len(), 32);
        assert_eq!(a[31].id, 32);
    }

    #[test]
    fn scanf_like_parsing() {
        assert_eq!(scan_pair("13_8"), Some((13, 8)));
        assert_eq!(scan_pair("24"), Some((24, 0)));
        assert_eq!(scan_pair("0x10_1"), Some((16, 1)));
        assert_eq!(scan_pair("x"), None);
        assert_eq!(scan_int("12abc"), Some((12, "abc")));
        assert_eq!(scan_int("0"), Some((0, "")));
        // Client-supplied extremes wrap like C instead of overflowing the negation.
        assert_eq!(scan_int("-2147483648"), Some((i32::MIN, "")));
        assert_eq!(scan_int("-0x80000000"), Some((i32::MIN, "")));
        assert_eq!(scan_pair("-2147483648_-2147483648"), Some((i32::MIN, i32::MIN)));
    }

    /// A loadout that costs more than the budget is refused, even when the slots allow it: the
    /// stealth shoes take no slots, so only the budget can stop them.
    #[test]
    fn an_over_budget_loadout_is_refused() {
        let mut sv = state();
        // The katana: 2900 for 10 slots. Eight of them are 23200 and 80 slots: as much as a
        // loadout can cost on weapons alone.
        assert_eq!(loadout_command(&mut sv, "tkw", &args("tkw 34_0 34_0 34_0 34_0 34_0 34_0 34_0 34_0")), None);
        assert_eq!((sv.pending.cost, sv.pending.slots), (23200, 80));
        // The shoes: 700 each and no slots at all. Nine fit under the budget, the tenth does not.
        let refused = loadout_command(&mut sv, "tki", &args("tki 32 32 32 32 32 32 32 32 32 32"));
        assert_eq!(refused, Some(Refused::Budget), "the loadout is over the budget");
        assert_eq!(sv.pending.cost, 23200 + 9 * 700, "the shoes that fit were kept");
        assert_eq!(sv.pending.slots, 80, "the shoes took no slots of their own");
    }

    /// A loadout that takes more slots than there are is refused.
    #[test]
    fn an_over_slot_loadout_is_refused() {
        // The AK47: 3000 for 40 slots. Two fit (80 of the 81), the third does not.
        let (sv, refused) = loadout("tkw", "tkw 13_0 13_0");
        assert_eq!(refused, None);
        assert_eq!((sv.pending.cost, sv.pending.slots), (6000, 80));
        let (sv, refused) = loadout("tkw", "tkw 13_0 13_0 13_0");
        assert_eq!(refused, Some(Refused::Slots), "the loadout is over the slot limit");
        assert_eq!(sv.armament.len(), 2, "the third AK47 was refused");
        assert_eq!(sv.pending.slots, 80);
    }

    /// A legal loadout is kept whole: the entries the server applies at the spawn, the ammo
    /// purchases and the totals it checked them against.
    #[test]
    fn a_legal_loadout_is_applied() {
        let mut sv = state();
        assert_eq!(loadout_command(&mut sv, "rst_cfg", &args("rst_cfg")), None);
        assert_eq!(loadout_command(&mut sv, "tkw", &args("tkw 13_1")), None);
        // The AK47 (3000) with a silencer (900), the kevlar (1900, 10 slots) and three buys of
        // the 7.62 ammo (100 each).
        assert_eq!(loadout_command(&mut sv, "tki", &args("tki 16")), None);
        assert_eq!(loadout_command(&mut sv, "tka", &args("tka 6_3")), None);
        // The state the server applies at the spawn.
        assert_eq!(sv.pending.cost, 3000 + 900 + 1900 + 3 * 100);
        assert_eq!(sv.pending.slots, 40 + 10);
        assert_eq!(sv.pending.ammo, 3);
        assert_eq!(
            sv.armament,
            vec![ArmamentEntry { id: 13, attachments: 1, item: false }, ArmamentEntry { id: 16, attachments: 0, item: true },],
            "the loadout the server applies"
        );
        assert_eq!(sv.armament_ammo[6], 3, "three buys of the 7.62 ammo");
    }

    /// `rst_cfg` starts a fresh loadout: the entries, the ammo and the pending totals.
    #[test]
    fn rst_cfg_starts_a_fresh_loadout() {
        let mut sv = state();
        assert_eq!(loadout_command(&mut sv, "tkw", &args("tkw 13_0")), None);
        assert_eq!(sv.pending.cost, 3000);
        let mut sv2 = state();
        assert_eq!(loadout_command(&mut sv2, "tka", &args("tka 6_3")), None);
        assert_eq!(sv2.pending.cost, 300);
        assert_eq!(loadout_command(&mut sv, "rst_cfg", &args("rst_cfg")), None);
        assert!(sv.armament.is_empty());
        assert_eq!(sv.armament_ammo, [0; MAX_AMMO]);
        assert_eq!(sv.pending, PendingLoadout::default());
    }

    /// The ammo count is bounded by what the player can carry: more purchases than that would
    /// add nothing at the spawn.
    #[test]
    fn the_ammo_count_is_bounded() {
        // The 7.62 ammo: 30 rounds a buy, 90 rounds carried: three buys.
        let (sv, refused) = loadout("tka", "tka 6_99");
        assert_eq!(refused, None);
        assert_eq!(sv.armament_ammo[6], 3, "three buys fill the reserve");
        assert_eq!(sv.pending.cost, 3 * 100);
        // A negative count buys nothing.
        let (sv, refused) = loadout("tka", "tka 6_-5");
        assert_eq!(refused, None);
        assert_eq!(sv.armament_ammo[6], 0);
    }
}
