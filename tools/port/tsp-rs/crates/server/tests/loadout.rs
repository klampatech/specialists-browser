//! The server's saved loadout: what a client's `rst_cfg`/`tkw`/`tki`/`tka` leaves behind, what
//! the death path clears, and what a re-submit after a death restores.
//!
//! The browser client submits a loadout as four commands (`rst_cfg`, then `tkw`, `tki` and
//! `tka`), and the server keeps the result in `p.inv.sv`: the entries, the ammo purchases and
//! the running budget and slot totals. The spawn buys what is in there
//! (`CBasePlayer::BuyArmament`), so the saved loadout is the whole of what the player gets.
//!
//! Two paths clear it: the death path (`CBasePlayer::Killed` -> `ResetArmament`) and the HUD
//! reset (`CTSGameRules::InitHUD` -> `ResetArmament`). Both are exercised here, on a plain
//! player, with no engine: a player who holds no gun and carries no flag never reaches an
//! engine call on either path.

use goldsrc::sys::edict_t;
use shared::weapons::MAX_AMMO;
use ts_server::commands::Args;
use ts_server::player::Player;
use ts_server::weapons::{ArmamentEntry, PendingLoadout, client_command, init_hud_reset, on_killed, ts_init};
use ts_server::world::Cx;

/// The 3.0 tables, as the plugin registers them: the prices and the slots the loadout is
/// checked against.
fn setup() {
    ts30_gameplay::tables::make_default();
}

/// The arguments of a loadout command, as the client sends them.
fn args(line: &str) -> Args {
    Args::parse(line).expect("a command line")
}

/// The loadout the browser client's "Use Loadout A" sends: the AK47 with a silencer, the
/// kevlar, and three buys of the 7.62 ammo.
fn submit(p: &mut Player, cx: &mut Cx) {
    assert!(client_command(p, cx, "rst_cfg", &args("rst_cfg")));
    assert!(client_command(p, cx, "tkw", &args("tkw 13_1")));
    assert!(client_command(p, cx, "tki", &args("tki 16")));
    assert!(client_command(p, cx, "tka", &args("tka 6_3")));
}

/// The entries the server holds for that loadout: the AK47 with the silencer, and the kevlar.
fn loadout_a() -> Vec<ArmamentEntry> {
    vec![ArmamentEntry { id: 13, attachments: 1, item: false }, ArmamentEntry { id: 16, attachments: 0, item: true }]
}

/// The AK47 (3000) with a silencer (900), the kevlar (1900, 10 slots) and three buys of the
/// 7.62 ammo (100 each).
const LOADOUT_A_COST: i32 = 3000 + 900 + 1900 + 3 * 100;
/// The AK47's 40 slots and the kevlar's 10.
const LOADOUT_A_SLOTS: i32 = 40 + 10;

/// A client loadout submission reaches the server's saved loadout: the entries the spawn buys,
/// the ammo purchases and the totals the server checked them against.
#[test]
fn a_loadout_the_client_submitted_is_the_server_saved_loadout() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    submit(&mut p, &mut cx);

    assert_eq!(p.inv.sv.armament, loadout_a(), "the entries the spawn buys");
    assert_eq!(p.inv.sv.armament_ammo[6], 3, "three buys of the 7.62 ammo");
    assert_eq!(p.inv.sv.pending.cost, LOADOUT_A_COST, "what the loadout costs");
    assert_eq!(p.inv.sv.pending.slots, LOADOUT_A_SLOTS, "the slots it takes");
    assert_eq!(p.inv.sv.pending.ammo, 3, "the ammo purchases it asks for");
}

/// The HUD reset (`CTSGameRules::InitHUD` -> `ResetArmament`) is the server's "the saved loadout
/// is cleared" path: the entries, the ammo purchases and the totals all go.
#[test]
fn the_server_forgets_the_saved_loadout_when_the_hud_resets() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    submit(&mut p, &mut cx);

    init_hud_reset(&mut p);

    assert!(p.inv.sv.armament.is_empty(), "the entries are gone");
    assert_eq!(p.inv.sv.armament_ammo, [0; MAX_AMMO], "the ammo purchases are gone");
    assert_eq!(p.inv.sv.pending, PendingLoadout::default(), "the totals are gone");
}

/// The death path (`CBasePlayer::Killed` -> `ResetArmament`) clears the saved loadout too, and a
/// client that submits it again gets it back: the spawn finds the loadout it needs.
///
/// The order is what matters here. The death clears the entries and the ammo purchases, and a
/// client that submits the loadout again -- the browser client's "Use Loadout A", which starts
/// with `rst_cfg` -- has it back whole.
#[test]
fn a_player_who_dies_and_re_submits_spawns_armed() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    submit(&mut p, &mut cx);

    on_killed(&mut p, &mut cx);

    assert!(p.inv.sv.armament.is_empty(), "the death cleared the entries");
    assert_eq!(p.inv.sv.armament_ammo, [0; MAX_AMMO], "the death cleared the ammo purchases");

    submit(&mut p, &mut cx);

    assert_eq!(p.inv.sv.armament, loadout_a(), "the loadout is back: the spawn buys it");
    assert_eq!(p.inv.sv.armament_ammo[6], 3, "the ammo purchases are back");
    assert_eq!(p.inv.sv.pending.cost, LOADOUT_A_COST, "the totals are the loadout's own, not twice that");
    assert_eq!(p.inv.sv.pending.slots, LOADOUT_A_SLOTS);
    assert_eq!(p.inv.sv.pending.ammo, 3);
}

/// The bug's exact state: the player dies, the client sends nothing, and the spawn finds an
/// empty loadout -- the player comes back with nothing.
#[test]
fn a_player_who_dies_without_re_submitting_spawns_unarmed() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    submit(&mut p, &mut cx);

    on_killed(&mut p, &mut cx);

    assert!(p.inv.sv.armament.is_empty(), "nothing to buy at the spawn");
    assert_eq!(p.inv.sv.armament_ammo, [0; MAX_AMMO], "no ammo to buy at the spawn");
}

/// The spawn's own reset (`TSInit`) does not touch the saved loadout, so a loadout submitted
/// after the death is still there for the spawn to buy -- nothing between the two clears it.
///
/// `TSInit` is the whole of the spawn's reset of the loadout state: the free slots and the
/// loadout items, and nothing else. The entries and the ammo purchases -- what the spawn buys
/// -- are not among them.
#[test]
fn the_spawns_own_reset_keeps_the_saved_loadout() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    submit(&mut p, &mut cx);

    on_killed(&mut p, &mut cx);
    submit(&mut p, &mut cx);

    // TSInit, the spawn's reset of the loadout state.
    ts_init(&mut p);

    assert_eq!(p.inv.sv.armament, loadout_a(), "the spawn still finds the loadout to buy");
    assert_eq!(p.inv.sv.armament_ammo[6], 3, "and the ammo purchases to buy");
}

/// The death clears the entries and the ammo purchases, but not the running totals: the death
/// path (`ResetArmament`) does not reset `pending`, and only the HUD reset does.
///
/// So a client that re-submits the loadout after a death has to start with `rst_cfg`, the way
/// the browser client does: a re-submit that only adds to the old totals is charged twice, and
/// one that is charged twice can be refused for the slots. Here the Glock-18 loadout is small
/// enough that the doubled total still fits, so the doubling is visible in the numbers.
#[test]
fn a_re_submit_after_a_death_needs_its_rst_cfg_or_it_is_charged_twice() {
    setup();
    let mut p = Player::default();
    let mut ed = edict_t::default();
    let mut cx = Cx { edict: &mut ed };
    // The Glock-18 ($850, 10 slots) and one buy of the 9 mm ($50).
    assert!(client_command(&mut p, &mut cx, "rst_cfg", &args("rst_cfg")));
    assert!(client_command(&mut p, &mut cx, "tkw", &args("tkw 1_0")));
    assert!(client_command(&mut p, &mut cx, "tka", &args("tka 1_1")));
    assert_eq!(p.inv.sv.pending.cost, 850 + 50);

    on_killed(&mut p, &mut cx);

    assert!(p.inv.sv.armament.is_empty(), "the death cleared the entries");
    assert_eq!(p.inv.sv.pending.cost, 850 + 50, "the death leaves the totals: only the HUD reset clears those");

    // A re-submit without the `rst_cfg` is charged on top of them.
    assert!(client_command(&mut p, &mut cx, "tkw", &args("tkw 1_0")));
    assert_eq!(p.inv.sv.pending.cost, (850 + 50) + 850, "the totals are charged twice");
    assert_eq!(p.inv.sv.pending.slots, 20, "and the slots with them");

    // The `rst_cfg` first is what makes the re-submit the loadout's own.
    assert!(client_command(&mut p, &mut cx, "rst_cfg", &args("rst_cfg")));
    assert!(client_command(&mut p, &mut cx, "tkw", &args("tkw 1_0")));
    assert_eq!(p.inv.sv.pending.cost, 850, "the totals are the loadout's own");
    assert_eq!(p.inv.sv.pending.slots, 10);
}
