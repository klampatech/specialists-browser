//! The modern buy flow: the loadout screen, the browse screen and the attachments screen.
//!
//! The classic canvas menu ([`super::buy`]) is the game's own and stays exactly as it is. This
//! is a SECOND flow on the same menu, the one the browser's redesigned panel drives: the same
//! prices, the same budget, the same slot pool and the same saved loadouts — organised by the
//! game's weapon CATEGORIES instead of by the HUD slots.
//!
//! ## The rail
//!
//! The rail is the browse aid: the categories the player picks a weapon from. It is keyed
//! 1..=7 and the state line's `slot=` is the rail's key.
//!
//! | rail | label | lists |
//! | --- | --- | --- |
//! | 1 | Melee weapons | the HUD slot 1 weapons: the Katana, the Combat Knife, the Seal Knife and the M61 Grenade |
//! | 2 | Pistols | the HUD slot 2 weapons |
//! | 3 | SMGs | the HUD slot 3 weapons |
//! | 4 | Rifles | the HUD slot 4 weapons the game calls rifles |
//! | 5 | Shotguns | the HUD slot 4 weapons the game calls shotguns |
//! | 6 | Special | the HUD slot 5 weapons: the akimbo ones |
//! | 7 | Player Accessory | the game's ITEMS page: the kevlar and the stealth shoes |
//!
//! The split is the game's own: the weapon table's [`kind`](shared::weapons::WeaponKind) is
//! the game's categorisation, read through the game's own correction of it (see
//! [`Rail::hud_slot`]).
//!
//! ## The HUD slot
//!
//! A weapon's classic slot is [`WeaponInfo::hud`][0], the HUD grid column, 1-based. It is the
//! game's own and it never changes: the loadout screen's five cards are the five HUD slots,
//! and an entry record reports the HUD slot of the weapon it carries. The rail's key and the
//! HUD slot are two different numbers and they genuinely diverge — the rail's key 5 is the
//! shotguns and the HUD slot 5 is the akimbo weapons — so the akimbo Golden Colts bought
//! from the rail are still HUD slot 5, and the shotguns bought from the rail are still HUD
//! slot 4.
//!
//! ## The differences from the classic flow
//!
//! - **Apply on purchase.** A purchase is submitted the moment it is made (`rst_cfg`, `tkw`,
//!   `tki`, `tka`), so the pending-config step ("Use New Config") does not exist here.
//! - **The tabs are the config save slots.** The active tab is the working copy; an edit is
//!   saved into it.
//! - **The keys are the screen's.** The screen changes what a key means, and the rows carry
//!   the page their key acts on, so a click never has to guess.
//!
//! The rules are the port's: the browser computes nothing and forms no loadout.
//!
//! ## The keys
//!
//! - A list's rows are keyed **1–9 and then 11, 12, …**. Key 10 is the game's own escape
//!   key and stays reserved for "back", so the tenth row is key 11 and the eleventh is key
//!   12. The keycap the panel draws is the row's *place* in the list (1–9, then A, B, …),
//!   so the tenth row still wears the design's "A".
//! - **"Back" answers to key 10 and to key 0.** Key 10 is the rule players know from the
//!   game's own menu, and key 0 is the design's back badge ("0 Back to loadout", "0 Back to
//!   Pistols").
//!
//! The classic flow keeps its own numbering and its own "10 = back" rule: the canvas menu
//! must not change.

use super::buy::{
    Action, BuyMenu, ENTRIES, ITEM_KEVLAR, ITEM_STEALTH, Rng, RowFlags, Rules, SAVED_CONFIGS, Screen, attachment_price, cost, entry_slots,
    key_prefix, page, restricted, slots_for,
};
use shared::weapons::{WeaponInfo, tables};

/// The five classic weapon slots.
pub const SLOT_COUNT: i32 = 5;

/// The player accessory: the ITEMS page, numbered as a sixth slot so the loadout's card can
/// carry it.
///
/// It is not a weapon slot: the accessory's items are bought, they are not carried in a
/// weapon slot.
pub const ACCESSORY_SLOT: i32 = 6;

/// The rail's entries: the weapon categories the player browses by.
pub const RAIL_COUNT: i32 = 7;

/// The base of the modern flow's remove keys.
///
/// The loadout screen's cards are clickable, and a click removes the entry — so the port
/// prints the key that removes each entry and the browser sends it on the remove page
/// ([`page::REMOVE`]). The keys start at ten, past the screen's own keys (1..11), so a
/// remove key can never be one of the keys the screen is using.
///
/// The classic flow's remove page is the game's own: its keys are the entry's index plus
/// one, and its key ten is "back". The modern flow has its own band, so that the remove
/// keys and the screen's keys cannot be confused — the port prints the key and the port
/// reads it back, and the browser never derives one.
pub const REMOVE_KEY_BASE: i32 = 10;

/// The game's own back key: ten.
///
/// TS's buy menu has always used key 10 as "back", and the modern flow keeps that rule —
/// it is the one players know, and the classic flow's rule is the classic flow's own.
pub const BACK_KEY: i32 = 10;

/// The design's back key: zero.
///
/// The redesigned panel badges its back button "0" ("0 Back to loadout", "0 Back to
/// Pistols"), so key 0 goes back as well. It costs nothing, and key 10 still does.
pub const BACK_KEY_DESIGN: i32 = 0;

/// Is this key the screen's back?
///
/// Both the game's own key (ten) and the design's badge (zero) go back. The remove page
/// is the one page where neither does: its keys start at ten (see [`REMOVE_KEY_BASE`]),
/// and they remove the entry they name.
fn is_back(key: i32) -> bool {
    key == BACK_KEY || key == BACK_KEY_DESIGN
}

/// The key a list's row takes.
///
/// The rows are keyed 1–9 and then 11, 12, …: key 10 is the game's own back key and
/// stays reserved, so the tenth row is key 11 and the eleventh is key 12.
///
/// That is the game's own rule for a weapon list: the classic flow's list numbers its
/// tenth weapon 11, the "a" key, and the modern flow follows it instead of inventing one.
/// The classic flow is not touched.
fn browse_key(index: usize) -> i32 {
    if index < 9 { index as i32 + 1 } else { index as i32 + 2 }
}

/// The row of a list a key names.
///
/// The inverse of [`browse_key`]: key 11 is the tenth row, key 12 the eleventh, and key
/// 10 is no row at all (it is the back key).
fn list_index(key: i32) -> Option<usize> {
    match key {
        1..=9 => Some((key - 1) as usize),
        k if k >= 11 => Some((k - 2) as usize),
        _ => None,
    }
}

/// The keycap the panel draws for a list's row.
///
/// The design's browse list is keyed 1–9 and then A (the tenth row), and the letters carry
/// on after it. The badge is the row's *place* in the list and not its key: the tenth row
/// wears the design's "A" and is keyed 11, because key 10 is the game's back key.
fn browse_badge(index: usize) -> String {
    match index {
        0..=8 => (index + 1).to_string(),
        9..=34 => char::from(b'A' + (index - 9) as u8).to_string(),
        // Past the alphabet the key is the badge, so the row is still identifiable.
        _ => browse_key(index).to_string(),
    }
}

/// The modern flow's rail: the weapon categories the player browses by.
///
/// The rail is the browse aid and the HUD slot is the game's own. They are two different
/// numbers and they genuinely diverge: the rail's key 5 is the shotguns and the HUD slot 5
/// is the akimbo weapons. So:
///
/// - the rail's key is what the state line's `slot=` reports and what the rail's rows are
///   keyed by;
/// - the HUD slot is what the loadout's cards and the entry records carry, and it is the
///   HUD slot of the weapon whatever rail entry it was bought from.
///
/// Every place the two are used together says which is which: a weapon bought from the
/// shotguns still reports the HUD slot 4, and an akimbo bought from the rail still reports
/// the HUD slot 5.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Rail {
    /// The melee weapons: the HUD slot 1 weapons — the Katana, the Combat Knife, the Seal
    /// Knife and the M61 Grenade (where the rules sell it).
    Melee,
    /// The pistols: the HUD slot 2 weapons.
    Pistols,
    /// The SMGs: the HUD slot 3 weapons.
    Smgs,
    /// The rifles: the HUD slot 4 weapons the game calls rifles.
    Rifles,
    /// The shotguns: the HUD slot 4 weapons the game calls shotguns.
    Shotguns,
    /// The akimbo weapons: the HUD slot 5 weapons. A HUD slot and not a kind.
    Special,
    /// The player accessory: the game's ITEMS page.
    Accessory,
}

impl Rail {
    /// The rail's key: 1..=7.
    ///
    /// This is the state's `slot=` and the rail's rows' keys. It is NOT the HUD slot: see
    /// [`Rail`].
    pub fn key(self) -> i32 {
        match self {
            Rail::Melee => 1,
            Rail::Pistols => 2,
            Rail::Smgs => 3,
            Rail::Rifles => 4,
            Rail::Shotguns => 5,
            Rail::Special => 6,
            Rail::Accessory => 7,
        }
    }

    /// The rail's entry for a key.
    pub fn from_key(key: i32) -> Option<Self> {
        Some(match key {
            1 => Rail::Melee,
            2 => Rail::Pistols,
            3 => Rail::Smgs,
            4 => Rail::Rifles,
            5 => Rail::Shotguns,
            6 => Rail::Special,
            7 => Rail::Accessory,
            _ => return None,
        })
    }

    /// The rail's label: the name the panel draws.
    pub fn label(self) -> &'static str {
        match self {
            Rail::Melee => "Melee weapons",
            Rail::Pistols => "Pistols",
            Rail::Smgs => "SMGs",
            Rail::Rifles => "Rifles",
            Rail::Shotguns => "Shotguns",
            Rail::Special => "Special",
            Rail::Accessory => "Player Accessory",
        }
    }

    /// The HUD slot the entry's weapons live in.
    ///
    /// The rifles and the shotguns SHARE the HUD slot 4: they are one HUD slot, and the
    /// rail is what divides them. That is why an entry bought from the shotguns still
    /// reports the HUD slot 4 — the HUD slot is the game's own and the rail is a browse
    /// aid.
    ///
    /// The accessory is not a weapon slot: it is the game's ITEMS page, numbered as the
    /// sixth slot so the loadout's card can carry it.
    pub fn hud_slot(self) -> i32 {
        match self {
            Rail::Melee => 1,
            Rail::Pistols => 2,
            Rail::Smgs => 3,
            Rail::Rifles | Rail::Shotguns => 4,
            Rail::Special => 5,
            Rail::Accessory => ACCESSORY_SLOT,
        }
    }
}

/// The loadout card's label: what the HUD slot holds.
///
/// The cards are the player's gear — the five HUD slots and the accessory — and they are
/// not the rail: the rail is the browse aid and it has seven entries. So the HUD slot 4
/// card keeps the "Rifles · Shotguns" label, because that card holds both, and the HUD
/// slot 1 card keeps its own, because that card holds the melee weapons and the grenade.
pub fn card_label(slot: i32) -> &'static str {
    match slot {
        1 => "Melee · Grenades · Swords",
        2 => "Pistols",
        3 => "SMGs",
        4 => "Rifles · Shotguns",
        5 => "Special",
        6 => "Player Accessory",
        _ => "",
    }
}

/// The loadout tabs are the config save slots: nine of them, "Loadout A".."Loadout I".
pub fn tab_label(index: usize) -> String {
    format!("Loadout {}", (b'A' + index as u8) as char)
}

/// The attachment labels, in the bit order (the silencer, the laser, the flashlight, the scope).
const ATTACHMENT_LABELS: [&str; 4] = ["#HUD_Silencer", "#HUD_Lasersight", "#HUD_Flashlight", "#HUD_Scope"];

/// The size of the slot pool: the table's (`combat.toml`'s `slots.total`), never a constant of
/// its own. The client's own [`super::buy::SLOTS`] is the same number, and a test holds them
/// together.
pub fn slot_limit() -> i32 {
    tables().combat.slots.total
}

/// The pages the modern flow's rows answer on: the loadout's own page, the rail, the weapon
/// list, the attachments, the accessory's items and the tabs.
///
/// The classic menu's own rule — a key may only be pressed on a column the canvas is showing —
/// is the same rule here: the panel may only press a key on a page the modern flow has.
///
/// The rule is tighter than the classic's, because the modern flow has screens: a page that
/// belongs to another screen is not on screen. The rail's and the tabs' pages are on screen
/// wherever the rail and the tabs are drawn.
pub fn page_is_drawn(b: &BuyMenu, pg: i32) -> bool {
    match b.screen {
        // The loadout: its own page, the rail, the tabs and the remove page (the loadout's
        // entries are what it removes).
        Screen::Loadout => matches!(pg, page::MAIN | page::CATEGORY | page::LOAD | page::REMOVE),
        // A slot's list: its own page, the rail, the tabs and the remove page.
        Screen::Browse => matches!(pg, page::WEAPONS | page::ITEMS | page::CATEGORY | page::LOAD | page::REMOVE),
        // The attachments: the gun's own page. The rail and the tabs are not drawn here.
        Screen::Attach => matches!(pg, page::OPTIONS),
    }
}

/// The weapons of one classic slot: the ones whose HUD grid column is that slot, in the game's
/// own order (the grid's row, then the id).
///
/// A restricted weapon is not listed (the classic menu hides those too), and neither is id 0 —
/// the kung-fu is the empty id, and an entry with it is an empty entry.
pub fn slot_weapons(slot: i32, r: &Rules) -> Vec<&'static WeaponInfo> {
    let mut out: Vec<&WeaponInfo> =
        tables().weapons().filter(|w| w.hud[0] as i32 == slot && w.id != 0 && !restricted(w.id as i32, false, r)).collect();
    out.sort_by_key(|w| (w.hud[1], w.id));
    out
}

/// The game's own categorisation of a weapon: its kind, read through the game's own
/// correction of it.
///
/// `GetWeaponType` ([`shared::weapons::restriction_type`]) is the game's categorisation of a
/// weapon: it calls the Sawed-Off a shotgun (the weapon table's `kind` says pistol) and the
/// katana a knife, and the server's `IsRestrictedWeapon` reads the same one. The rail reads
/// the kind through it, so the Sawed-Off is listed with the shotguns — where the classic
/// menu's own shotguns column lists it too.
///
/// It is only read for the HUD slot 4 split, where it decides between the rifles and the
/// shotguns. The other rail entries are the HUD slot's own weapons, and the akimbos (the
/// HUD slot 5) are a HUD slot and not a kind.
fn rail_kind(w: &WeaponInfo) -> u8 {
    shared::weapons::restriction_type(w.id)
}

/// Is this weapon one of the rifles?
///
/// The Barrett M82A1 is a sniper rifle: the table's kind is `sniper`, and the classic menu's
/// rifles column has it.
fn is_rifle(w: &WeaponInfo) -> bool {
    matches!(rail_kind(w), shared::weapons::kind::RIFLE | shared::weapons::kind::SNIPER)
}

/// Is this weapon one of the shotguns?
fn is_shotgun(w: &WeaponInfo) -> bool {
    rail_kind(w) == shared::weapons::kind::SHOTGUN
}

/// The weapons a rail entry lists: the HUD slot's own weapons, in the game's own order.
///
/// The rifles and the shotguns are the one split: they share the HUD slot 4, and the rail
/// divides them by the game's own kind (see [`rail_kind`]). Every other entry lists its
/// HUD slot's weapons whole.
pub fn rail_weapons(rail: Rail, r: &Rules) -> Vec<&'static WeaponInfo> {
    let mut out = slot_weapons(rail.hud_slot(), r);
    match rail {
        Rail::Rifles => out.retain(|w| is_rifle(w)),
        Rail::Shotguns => out.retain(|w| is_shotgun(w)),
        _ => {}
    }
    out
}

/// One thing the browse screen lists: a weapon of the slot, or an accessory item.
#[derive(Debug, Clone, PartialEq)]
pub struct BrowseItem {
    /// The weapon or item id.
    pub id: i32,
    /// Its name.
    pub name: String,
    /// What it costs.
    pub price: i32,
    /// The inventory slots it takes.
    pub slots: i32,
    /// True for the accessory's items (they are bought, not attached).
    pub item: bool,
}

/// The list the browse screen shows: the rail entry's weapons, or the accessory's items.
///
/// The key is the rail's key (1..=7), not the HUD slot: the state's `slot=` is the rail's
/// entry and the browse screen shows that entry's list.
pub fn browse_items(rail_key: i32, r: &Rules) -> Vec<BrowseItem> {
    let Some(rail) = Rail::from_key(rail_key) else { return Vec::new() };
    if rail == Rail::Accessory {
        let mut out = Vec::new();
        for id in [ITEM_KEVLAR, ITEM_STEALTH] {
            if restricted(id, true, r) {
                continue;
            }
            let name = if id == ITEM_KEVLAR { "Kevlar" } else { "Stealth Shoes" };
            out.push(BrowseItem {
                id,
                name: name.to_owned(),
                price: cost(id, 0, false, true),
                slots: slots_for(id, false, true, r),
                item: true,
            });
        }
        return out;
    }
    rail_weapons(rail, r)
        .into_iter()
        .map(|w| BrowseItem { id: w.id as i32, name: w.name.clone(), price: w.cost, slots: w.slots, item: false })
        .collect()
}

/// The money a purchase is checked against: the budget, less what the config costs.
///
/// The ammo fill is not part of it, exactly as in the classic menu: the port recomputes the
/// ammo after a purchase, so the rounds it bought are given up for the gun. The rule is
/// [`BuyMenu::add`]'s own rule, so a row the panel calls affordable is a row the port buys.
pub fn money_left(b: &BuyMenu, r: &Rules) -> i32 {
    r.cash.wrapping_sub(b.current.total)
}

/// Can the modern flow afford this? The money AND the slot pool, because both stop a
/// purchase — the same two tests [`BuyMenu::add`] makes.
pub fn affordable(b: &BuyMenu, r: &Rules, price: i32, slots: i32) -> bool {
    price.wrapping_add(b.current.total) <= r.cash && slots.wrapping_add(b.current.slots) <= slot_limit()
}

/// How much more money a row needs, when it cannot be afforded. Zero when it can.
pub fn shortfall(b: &BuyMenu, r: &Rules, price: i32) -> i32 {
    let left = money_left(b, r);
    if price <= left { 0 } else { price - left }
}

/// Is this already in the loadout? (The browse screen's "owned" mark.)
///
/// The item and the weapon ids share a number space — the kevlar is `0x10` and so is the
/// Akimbo Mini-Uzi — so an item is only ever the item and a weapon only ever the weapon.
pub fn owned(b: &BuyMenu, id: i32, item: bool) -> bool {
    b.current.entries.iter().any(|e| e.id == id && e.id != 0 && e.is_item == item)
}

/// What buying this would cost, the way [`BuyMenu::add`] charges for it.
///
/// The same gun again is the game's own rule: a gun with an akimbo version becomes akimbo (and
/// the attachments merge), a stack grows by one, and anything else replaces the old entry with
/// a single one. The row shows the price that will actually be charged, so the browser's
/// summary is the port's number.
pub fn purchase_price(b: &BuyMenu, id: i32, att: u32, item: bool) -> i32 {
    if item {
        return cost(id, 0, false, true);
    }
    let Some(w) = tables().weapon(id as u8) else { return 0 };
    match b.current.entries.iter().find(|e| e.id == id && !e.is_item) {
        Some(_) if w.stack => w.cost,
        Some(e) if w.akimbo != -1 && !e.akimbo => cost(id, att | e.att, true, false),
        _ => cost(id, att, false, false),
    }
}

/// The inventory slots buying this would take, the way [`BuyMenu::add`] counts them.
pub fn purchase_slots(b: &BuyMenu, id: i32, item: bool, r: &Rules) -> i32 {
    if item {
        return slots_for(id, false, true, r);
    }
    let Some(w) = tables().weapon(id as u8) else { return 0 };
    match b.current.entries.iter().find(|e| e.id == id && !e.is_item) {
        Some(e) if w.akimbo != -1 && !e.akimbo => w.slots.wrapping_mul(2),
        _ => w.slots,
    }
}

/// The pending purchase's summary: what the gun and its attachments cost together, and what
/// would be left of the budget after the purchase.
///
/// The total is the port's price for the purchase — the gun's price with its attachments and
/// the akimbo and full-load multipliers, which is not the gun's base price.
///
/// The money left is what the port's own rules leave: the purchase is run on a copy of the
/// menu, so the config's total and the ammo fill are the port's, and not an arithmetic
/// guess. The browser never adds anything up.
pub fn purchase_summary(b: &BuyMenu, r: &Rules) -> Option<(i32, i32)> {
    let id = b.pending_weapon;
    if id <= 0 {
        return None;
    }
    let total = purchase_price(b, id, b.pending_att, false);
    // A copy of the menu, so the purchase can be run on it without touching the real one.
    let mut probe = b.clone();
    let left = if probe.add(id, b.pending_att, false, false, r) {
        // The purchase went through on the copy: what is left is the port's own number,
        // the money left after the config and the ammo fill.
        r.cash.wrapping_sub(probe.current.total).wrapping_sub(probe.ammo_spend)
    } else {
        // It would not go through: the money left is the money there is.
        r.cash.wrapping_sub(b.current.total).wrapping_sub(b.ammo_spend)
    };
    Some((total, left))
}

/// One row of the modern flow: what the panel draws and what the state dump reports. The
/// classic flow's [`super::buy::Row`] is not reused: the classic canvas menu's rows are its
/// own, and the pixel diff holds them still.
#[derive(Debug, Clone, PartialEq)]
pub struct ModernRow {
    /// The key the row answers to (1..=11; 0 = the row takes no key).
    pub key: i32,
    /// What the row costs (0 = it costs nothing).
    pub price: i32,
    /// The row's flags.
    pub flags: RowFlags,
    /// The page the row's key acts on.
    pub page: i32,
    /// The number the panel draws as the row's keycap.
    pub number: String,
    /// The row's label.
    pub label: String,
}

/// The rail: the weapon categories. They are dimmed, because they answer on the rail's own
/// page — the same way a parent column's row answers on the parent's page in the classic
/// menu.
///
/// The row's key is the rail's key (1..=7), which is also what the state line's `slot=`
/// reports while the entry is open. It is NOT the HUD slot: the rifles and the shotguns
/// share the HUD slot 4 and the rail's key 5 is the shotguns.
fn rail_rows() -> Vec<ModernRow> {
    (1..=RAIL_COUNT)
        .map(|key| ModernRow {
            key,
            price: 0,
            flags: RowFlags { dim: true, ..Default::default() },
            page: page::CATEGORY,
            number: key.to_string(),
            label: Rail::from_key(key).map_or(String::new(), |rail| rail.label().to_owned()),
        })
        .collect()
}

/// The tabs: the nine config save slots. Dimmed for the same reason as the rail.
fn tab_rows() -> Vec<ModernRow> {
    (0..SAVED_CONFIGS)
        .map(|i| ModernRow {
            key: i as i32 + 1,
            price: 0,
            flags: RowFlags { dim: true, ..Default::default() },
            page: page::LOAD,
            number: (i as i32 + 1).to_string(),
            label: tab_label(i),
        })
        .collect()
}

/// The rows of the modern flow's current screen.
///
/// The order matters: the rail's rows come before the tabs' (both are dimmed, and both use the
/// same keys), so the panel's rail — the rows it finds by their key — is the rail and not a
/// tab.
pub fn modern_rows(b: &BuyMenu, r: &Rules) -> Vec<ModernRow> {
    let mut out = Vec::new();
    // The attachments screen carries neither the rail nor the tabs: the panel reads every row
    // with a key of 1..5 there as an attachment.
    if b.screen != Screen::Attach {
        out.extend(rail_rows());
        out.extend(tab_rows());
    }
    match b.screen {
        Screen::Loadout => out.extend(loadout_rows()),
        Screen::Browse => out.extend(browse_rows(b, r)),
        Screen::Attach => out.extend(attach_rows(b, r)),
    }
    out
}

/// The loadout screen's own rows: the player accessory, Random and Clear.
///
/// The accessory and the actions answer on the loadout screen's page. "Clear" is the design's
/// own word for the game's reset row, and the panel draws the design's keycap for it ("X") —
/// but its KEY is eight, not four.
///
/// **Why eight:** the loadout screen's cards wear the HUD slots' own digits (1–5), and the
/// player's first guess is that the digit on a card opens that card. The clear row used to
/// answer on key four, which the classic flow inherits from the game's own menu — so in the
/// modern flow a player pressing the card-4 digit wiped the loadout instead of opening the
/// rifles. The modern flow has its own key space, so the clear row takes a key of its own
/// (eight) and every card's digit opens its card. The classic flow's own rows and keys are
/// untouched.
///
/// The clear row's label is the design's own word, "Clear", and not the game's title:
/// the port owns the labels the panel draws, and the browser must not rename a port row.
/// The browser resolves a title key through the game's own titles and passes a plain label
/// through unchanged, so the port prints the word the design asks for. The classic flow's
/// own reset row keeps the game's title — the classic menu must not change.
fn loadout_rows() -> Vec<ModernRow> {
    vec![
        ModernRow {
            key: 6,
            price: 0,
            flags: RowFlags::default(),
            page: page::MAIN,
            number: "6".to_owned(),
            label: "#Buy_PlayerAccessory".to_owned(),
        },
        ModernRow {
            key: 7,
            price: 0,
            flags: RowFlags::default(),
            page: page::MAIN,
            number: "R".to_owned(),
            label: "#Buy_Random".to_owned(),
        },
        ModernRow { key: 8, price: 0, flags: RowFlags::default(), page: page::MAIN, number: "X".to_owned(), label: "Clear".to_owned() },
    ]
}

/// The browse screen's own rows: the rail entry's weapons, with their prices, the owned mark
/// and the unaffordable mark.
///
/// The rows are keyed 1–9 and then 11, 12, … (see [`browse_key`]), so that key 10 stays
/// the back key and a tenth weapon would still be reachable.
fn browse_rows(b: &BuyMenu, r: &Rules) -> Vec<ModernRow> {
    // The state's `slot=` is the rail's key (1..=7): the entry the player is browsing.
    let items = browse_items(b.modern_slot, r);
    let page = if Rail::from_key(b.modern_slot) == Some(Rail::Accessory) { page::ITEMS } else { page::WEAPONS };
    items
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let key = browse_key(i);
            // An owned row is not a purchase: selecting it takes the weapon off the loadout,
            // and that costs nothing. So it is never out of reach.
            let ok = owned(b, item.id, item.item) || affordable(b, r, item.price, item.slots);
            ModernRow {
                key,
                price: item.price,
                flags: RowFlags { on: b.modern_focus == item.id, x: !ok, ..Default::default() },
                page,
                number: browse_badge(i),
                label: item.name.clone(),
            }
        })
        .collect()
}

/// The attachments screen's rows: the chosen gun (the row that takes no key), the attachments
/// it can take, and the action that adds it to the loadout.
fn attach_rows(b: &BuyMenu, r: &Rules) -> Vec<ModernRow> {
    let id = b.pending_weapon;
    let w = tables().weapon(id.max(0) as u8);
    let mut out = Vec::new();
    // The gun: the row that takes no key.
    out.push(ModernRow {
        key: 0,
        price: w.map_or(0, |w| w.cost),
        flags: RowFlags::default(),
        page: page::OPTIONS,
        number: "-".to_owned(),
        label: w.map_or_else(String::new, |w| w.name.clone()),
    });
    // The attachments the gun can take, whether they are on or not.
    for bit in 0..4u32 {
        if !attachment_allowed(w, 1 << bit) {
            continue;
        }
        let key = bit as i32 + 1;
        out.push(ModernRow {
            key,
            price: attachment_price(1 << bit),
            flags: RowFlags { on: b.pending_att & (1 << bit) != 0, ..Default::default() },
            page: page::OPTIONS,
            number: key_prefix(key).trim_end().to_owned(),
            label: ATTACHMENT_LABELS[bit as usize].to_owned(),
        });
    }
    // The action: the gun and its attachments, at the price they together cost.
    let bundle = purchase_price(b, id, b.pending_att, false);
    let ok = affordable(b, r, bundle, purchase_slots(b, id, false, r));
    out.push(ModernRow {
        key: 6,
        price: bundle,
        flags: RowFlags { x: !ok, ..Default::default() },
        page: page::OPTIONS,
        number: "6".to_owned(),
        label: "Add to loadout".to_owned(),
    });
    out
}

/// Can this weapon take this attachment? The game's own rule: an attachment the weapon does
/// not allow, or one it already carries built in, is not offered.
///
/// The classic menu hides an attachment that is already selected (the classic's options column
/// rebuilds itself); the modern flow keeps it and lets it be unselected again.
fn attachment_allowed(w: Option<&WeaponInfo>, bit: u32) -> bool {
    let Some(w) = w else { return false };
    bit & w.att_default as u32 == 0 && bit & w.att_allowed as u32 != 0
}

/// The slot records: the slot's number, the inventory slots its weapons take, how many
/// weapons it holds and its label.
///
/// These are the loadout screen's CARDS: the five HUD slots and the accessory, in the
/// order the game uses. They are the player's gear and they are not the rail: the rail is
/// the browse aid and it has seven entries. So the HUD slot 4 card is still one card, and
/// it still holds the rifles and the shotguns together.
pub fn slot_records(b: &BuyMenu, r: &Rules) -> Vec<String> {
    (1..=ACCESSORY_SLOT)
        .map(|slot| {
            let (slots, count) = slot_usage(b, r, slot);
            format!("TSBUY slot {slot} {slots} {count} {}", card_label(slot))
        })
        .collect()
}

/// How much of the slot pool the slot's weapons take, and how many of them there are.
fn slot_usage(b: &BuyMenu, r: &Rules, slot: i32) -> (i32, i32) {
    let mut slots: i32 = 0;
    let mut count: i32 = 0;
    for e in b.current.entries.iter().filter(|e| e.id != 0) {
        if e.is_item {
            // The accessory: the kevlar and the stealth shoes.
            if slot == ACCESSORY_SLOT {
                slots = slots.wrapping_add(entry_slots(e, r));
                count += 1;
            }
            continue;
        }
        let Some(w) = tables().weapon(e.id as u8) else { continue };
        if w.hud[0] as i32 != slot {
            continue;
        }
        slots = slots.wrapping_add(entry_slots(e, r));
        count += 1;
    }
    (slots, count)
}

/// The tab records: the tab's index, its label and whether it is the active one.
pub fn tab_records(b: &BuyMenu) -> Vec<String> {
    (0..SAVED_CONFIGS).map(|i| format!("TSBUY tab {i} {} {}", tab_label(i), (i == b.tab) as i32)).collect()
}

/// One entry of the modern flow's loadout: what a loadout card shows.
///
/// The classic flow's entry record is four fields (the index, the cost, the slots and the
/// name) and stays exactly as it is. The modern one carries three more: the entry's
/// attachments (the loadout cards show a chip for each), the weapon's classic slot (the
/// cards are the five slots) and the key that removes the entry (the cards are clickable).
#[derive(Debug, Clone, PartialEq)]
pub struct ModernEntry {
    /// The entry's index in the config.
    pub index: usize,
    /// What the entry costs: the gun and its attachments.
    pub cost: i32,
    /// The inventory slots it takes.
    pub slots: i32,
    /// Its attachments: the same title keys the OPTIONS page's rows use, in bit order.
    pub attachments: Vec<&'static str>,
    /// The classic weapon slot it belongs to (the HUD grid column).
    pub slot: i32,
    /// The key that removes it on the remove page.
    pub remove_key: i32,
    /// Its name.
    pub name: String,
}

/// The config's entries, grouped by slot and in slot order, so the panel can place them
/// without knowing which slot a weapon belongs to. The accessory's items are not in this list:
/// they are the accessory's, and they have no weapon slot.
pub fn modern_entries(b: &BuyMenu, r: &Rules) -> Vec<ModernEntry> {
    let mut out = Vec::new();
    for slot in 1..=SLOT_COUNT {
        for (i, e) in b.current.entries.iter().enumerate() {
            if e.id == 0 || e.is_item {
                continue;
            }
            let Some(w) = tables().weapon(e.id as u8) else { continue };
            if w.hud[0] as i32 != slot {
                continue;
            }
            out.push(ModernEntry {
                index: i,
                cost: e.cost,
                slots: entry_slots(e, r),
                attachments: attachment_labels(e.att),
                slot,
                remove_key: REMOVE_KEY_BASE + i as i32,
                name: BuyMenu::entry_name(e),
            });
        }
    }
    out
}

/// An entry's attachments: the title keys the OPTIONS page's rows use, in bit order.
///
/// The labels are the game's own (`#HUD_Silencer` and the rest), so the browser resolves
/// them exactly the way it resolves every other label — it never builds one.
pub fn attachment_labels(att: u32) -> Vec<&'static str> {
    (0..4u32).filter(|bit| att & (1 << bit) != 0).map(|bit| ATTACHMENT_LABELS[bit as usize]).collect()
}

/// The screen's title: the loadout screen's own, the rail entry's label, or the gun's name.
///
/// The browse screen's title is the rail entry's label: "SHOTGUNS" for the shotguns, and
/// the state line's `slot=` is the rail's key that goes with it.
pub fn screen_title(b: &BuyMenu) -> String {
    match b.screen {
        Screen::Loadout => "BUY MENU".to_owned(),
        Screen::Browse => Rail::from_key(b.modern_slot).map_or_else(|| "BROWSE".to_owned(), |rail| rail.label().to_uppercase()),
        Screen::Attach => {
            tables().weapon(b.pending_weapon.max(0) as u8).map_or_else(|| "ATTACHMENTS".to_owned(), |w| w.name.to_uppercase())
        }
    }
}

/// How many of the five weapon slots hold something.
///
/// The loadout screen reports the slot usage both ways: how many of the five slots are in
/// use, and how much of the slot pool they take (the state line's `slots`, and each slot
/// record's own count).
pub fn slots_in_use(b: &BuyMenu, r: &Rules) -> i32 {
    (1..=SLOT_COUNT).filter(|slot| slot_usage(b, r, *slot).1 > 0).count() as i32
}

/// The modern flow's state, as the `TSBUY` records the browser's panel reads.
pub fn state_lines(b: &BuyMenu, r: &Rules) -> Vec<String> {
    let mut out = Vec::new();
    out.push(format!(
        "TSBUY state open={} hidden={} page={} budget={} total={} slots={} ammo_spend={} new={} cat={} pending={} att={} mode=modern screen={} slot={} tab={} slots_in_use={} slot_limit={}",
        b.active as i32,
        b.hidden as i32,
        b.page,
        r.cash,
        b.current.total,
        b.current.slots,
        b.ammo_spend,
        b.new_config as i32,
        b.category,
        b.pending_weapon,
        b.pending_att,
        b.screen.name(),
        b.modern_slot,
        b.tab,
        slots_in_use(b, r),
        slot_limit()
    ));
    out.push(format!("TSBUY page {} {}", b.page, screen_title(b)));
    out.extend(slot_records(b, r));
    out.extend(tab_records(b));
    for row in &modern_rows(b, r) {
        out.push(format!("TSBUY row {} {} {} {} {} {}", row.key, row.price, row.flags.dump(), row.page, row.number, row.label));
    }
    // The pending purchase's summary, on the attachments screen: what the gun and its
    // attachments together cost, and what would be left of the budget after it.
    //
    // Both are the port's numbers. The browser adds nothing up — a gun's price is not its
    // base price (the akimbo and full-load multipliers change it), so browser arithmetic
    // would be wrong for exactly the weapons where it matters.
    if b.screen == Screen::Attach
        && let Some((total, left)) = purchase_summary(b, r)
    {
        out.push(format!("TSBUY sum {total} {left}"));
    }
    // The shortfalls and the owned marks belong to the browse screen's rows, and only to
    // them: the keys are the weapon list's, and on the other screens the same numbers
    // mean other things (the attachments' keys, on the attachments screen).
    if b.screen == Screen::Browse {
        // The shortfalls: the rows that cannot be afforded, and how much more they need.
        for (index, item) in browse_items(b.modern_slot, r).iter().enumerate() {
            if owned(b, item.id, item.item) {
                // Taking a weapon off costs nothing, so an owned row is never short.
                continue;
            }
            let short = shortfall(b, r, item.price);
            if short > 0 {
                out.push(format!("TSBUY short {} {}", browse_key(index), short));
            }
        }
        // The owned rows: the weapons already in the loadout.
        for (index, item) in browse_items(b.modern_slot, r).iter().enumerate() {
            if owned(b, item.id, item.item) {
                out.push(format!("TSBUY owned {} 1", browse_key(index)));
            }
        }
    }
    for e in modern_entries(b, r) {
        out.push(format!(
            "TSBUY entry {} {} {} {} {} {} {}",
            e.index,
            e.cost,
            e.slots,
            e.attachments.join(","),
            e.slot,
            e.remove_key,
            e.name
        ));
    }
    out.push("TSBUY end".to_owned());
    out
}

// ---- the keys ---------------------------------------------------------------------------------

/// The modern flow's key handling.
///
/// The screen decides what a key means, so the page the key acts on is the screen's own.
/// The back key is the same on every screen (key 10, the game's own, and key 0, the
/// design's badge), and no row of the modern flow carries either of them — the list's
/// tenth row is key 11 — so a row's key and a back key can never be confused.
pub fn key(b: &mut BuyMenu, pg: i32, key: i32, r: &Rules, rng: &mut dyn Rng) -> Vec<Action> {
    let mut out = Vec::new();
    // The keys the screen accepts.
    //
    // The list pages take their own rows' keys, which run past the game's key alphabet: the
    // rows are keyed 1–9 and then 11, 12, …, because key 10 is the game's back key and
    // stays reserved. The remove page takes its own band, for the same reason.
    let max = match pg {
        page::REMOVE => REMOVE_KEY_BASE + ENTRIES as i32 - 1,
        page::WEAPONS | page::ITEMS => browse_max_key(b, r),
        _ => r.menu.max_key,
    };
    // The back keys — the game's own ten and the design's zero — are taken wherever the
    // screen's back is, and they are never one of the rows' keys.
    //
    // The remove page is the one exception: its keys start at ten (they remove the entry
    // they name), so ten is not a back key there.
    let back = is_back(key) && pg != page::REMOVE;
    if !back && !(1..=max).contains(&key) {
        return out;
    }
    match pg {
        // The loadout screen.
        page::MAIN => match key {
            // The player accessory: the loadout screen's own row.
            6 => open_rail(b, Rail::Accessory, r),
            7 => random(b, r, rng, &mut out),
            // "Clear": the design's own word for the game's reset row. Its key is eight, so
            // that every card's digit opens its card (see [`loadout_rows`]).
            8 => clear(b, r, &mut out),
            // The cards' own digits: the digit is the HUD slot of the card, so 1 opens the
            // melee weapons, 2 the pistols, 3 the SMGs, 4 the rifles and 5 the akimbo
            // weapons — the same lists the cards hold.
            //
            // The HUD slot 4 is the one the rail splits (the rifles and the shotguns), so
            // its digit opens the first of the two: the rifles. The shotguns are one rail
            // click away, and the rail is on the screen the digit opens.
            k if (1..=SLOT_COUNT).contains(&k) => {
                if let Some(rail) = rail_for_hud_slot(k) {
                    open_rail(b, rail, r);
                }
            }
            // Back: the game's own key and the design's badge both close the menu.
            k if is_back(k) => {
                b.close();
                out.push(Action::Close);
            }
            _ => {}
        },
        // The rail.
        page::CATEGORY => match key {
            // The rail's keys are the categories' keys (1..=7), and the key opens that
            // category's list.
            k if (1..=RAIL_COUNT).contains(&k) => {
                if let Some(rail) = Rail::from_key(k) {
                    open_rail(b, rail, r);
                }
            }
            k if is_back(k) => back_to_loadout(b),
            _ => {}
        },
        // The weapon list.
        page::WEAPONS => {
            // Back. No row of the list carries the back key: the tenth row is key 11.
            if is_back(key) {
                back_to_loadout(b);
                return out;
            }
            let Some(item) = item_at(b, key, r) else { return out };
            // A weapon the loadout already holds is not bought again: it is taken off, and
            // its cost is refunded (the design's rule for an owned row).
            if owned(b, item.id, item.item) {
                remove_item(b, item.id, item.item, r, &mut out);
                return out;
            }
            if item.item {
                buy_item(b, item.id, r, &mut out);
                return out;
            }
            // The gun is chosen; its attachments come next.
            b.pending_weapon = item.id;
            b.pending_att = 0;
            b.modern_focus = item.id;
            b.screen = Screen::Attach;
            b.page = page::OPTIONS;
        }
        // The attachments.
        page::OPTIONS => {
            // Back to the slot's list.
            if is_back(key) {
                b.pending_weapon = -1;
                b.pending_att = 0;
                // The focus does not survive the trip: the player came here to buy a gun,
                // so the gun they were looking at must not still be selected when they come
                // back — the selection would read as "this one is still on your list".
                b.modern_focus = 0;
                b.screen = Screen::Browse;
                b.page = page::WEAPONS;
                return out;
            }
            if key == 6 {
                commit(b, r, &mut out);
                return out;
            }
            // The attachments toggle, so a second press takes one off again.
            if !(1..=4).contains(&key) {
                return out;
            }
            let bit = 1u32 << (key - 1);
            let w = tables().weapon(b.pending_weapon.max(0) as u8);
            if attachment_allowed(w, bit) {
                b.pending_att ^= bit;
            }
        }
        // The accessory's items.
        page::ITEMS => {
            if is_back(key) {
                back_to_loadout(b);
                return out;
            }
            let Some(item) = item_at(b, key, r) else { return out };
            if owned(b, item.id, item.item) {
                remove_item(b, item.id, item.item, r, &mut out);
                return out;
            }
            buy_item(b, item.id, r, &mut out);
        }
        // The tabs.
        page::LOAD if (1..=SAVED_CONFIGS as i32).contains(&key) => {
            switch_tab(b, key as usize - 1, r, &mut out);
        }
        // The remove page: the loadout's entries.
        //
        // The loadout screen's cards are clickable, and a click removes the entry. The key
        // the entry record named is the one that removes it, and it is the port's key: the
        // browser sends it and never works out which entry it means.
        page::REMOVE if key >= REMOVE_KEY_BASE => {
            let i = (key - REMOVE_KEY_BASE) as usize;
            if i < ENTRIES && b.current.entries[i].id != 0 {
                remove_at(b, i, r, &mut out);
            }
        }
        _ => {}
    }
    out
}

/// Browse a rail entry: the browse screen shows that category's list.
///
/// The state's `slot=` becomes the rail's key (1..=7) — the entry the player is browsing.
/// It is not the HUD slot: the rifles and the shotguns share the HUD slot 4, and the rail
/// gives them two keys.
fn open_rail(b: &mut BuyMenu, rail: Rail, r: &Rules) {
    b.modern_slot = rail.key();
    b.modern_focus = focus_first(rail, r);
    b.pending_weapon = -1;
    b.pending_att = 0;
    b.screen = Screen::Browse;
    b.page = if rail == Rail::Accessory { page::ITEMS } else { page::WEAPONS };
}

/// The list row a key names: the slot's own list, the accessory's items included.
///
/// The list is the row's list, so a key always names the row the panel drew: a restricted
/// item is not on the list, and the keys after it move up.
///
/// The keys are the list's own (see [`browse_key`]): key 11 is the tenth row and key 12 the
/// eleventh, because key 10 is the game's back key.
fn item_at(b: &BuyMenu, key: i32, r: &Rules) -> Option<BrowseItem> {
    let index = list_index(key)?;
    browse_items(b.modern_slot, r).get(index).cloned()
}

/// The highest key a list's rows use.
///
/// The list's rows are keyed 1–9 and then 11, 12, …, so the last row's key is not the
/// number of rows.
fn browse_max_key(b: &BuyMenu, r: &Rules) -> i32 {
    let count = browse_items(b.modern_slot, r).len();
    if count == 0 { 0 } else { browse_key(count - 1) }
}

/// The first row of a rail entry's list: the one the screen focuses when it opens, so that
/// "Enter picks the focused row" has something to pick.
fn focus_first(rail: Rail, r: &Rules) -> i32 {
    browse_items(rail.key(), r).first().map_or(0, |item| item.id)
}

/// The rail entry a HUD slot's digit opens.
///
/// The loadout screen's cards are the HUD slots, so a digit on the loadout screen is the
/// card's number and it opens that card's list.
///
/// The digits are the cards' own: 1 is the melee weapons, 2 the pistols, 3 the SMGs and 5
/// the akimbo weapons.
///
/// The HUD slot 4 is the one the rail splits, so its digit opens the first of the two — the
/// rifles. The shotguns are one rail click away, and the rail is on the screen the digit
/// opens.
fn rail_for_hud_slot(slot: i32) -> Option<Rail> {
    match slot {
        1 => Some(Rail::Melee),
        2 => Some(Rail::Pistols),
        3 => Some(Rail::Smgs),
        4 => Some(Rail::Rifles),
        5 => Some(Rail::Special),
        _ => None,
    }
}

/// Back to the loadout screen.
fn back_to_loadout(b: &mut BuyMenu) {
    b.pending_weapon = -1;
    b.pending_att = 0;
    b.screen = Screen::Loadout;
    b.page = page::MAIN;
}

/// Buy an accessory item (the kevlar or the stealth shoes) and apply it.
///
/// The flow stays on the accessory's list, the way it stays on a slot's list after a gun: a
/// second kevlar is not a thing, but the rule is one rule.
fn buy_item(b: &mut BuyMenu, id: i32, r: &Rules, out: &mut Vec<Action>) {
    if b.add(id, 0, false, true, r) {
        // The focus does not survive the purchase: the item is in the loadout now, and a
        // row that stayed selected would read as "this one is still on your list".
        b.modern_focus = 0;
        apply_and_save(b, out, r);
    }
}

/// Take a weapon (or an item) off the loadout, refund it, and apply the result.
///
/// The refund is the game's own: a config entry's cost is the gun *plus* its attachments, so
/// removing the gun refunds both together ([`BuyMenu::remove`]).
fn remove_item(b: &mut BuyMenu, id: i32, item: bool, r: &Rules, out: &mut Vec<Action>) {
    let Some(i) = b.current.entries.iter().position(|e| e.id == id && e.is_item == item) else {
        return;
    };
    remove_at(b, i, r, out);
}

/// Take the entry at index `i` off the loadout, refund it, and apply the result.
///
/// The index is the config's own — the one the entry record carries and the one the remove
/// key names.
fn remove_at(b: &mut BuyMenu, i: usize, r: &Rules, out: &mut Vec<Action>) {
    if i >= ENTRIES || b.current.entries[i].id == 0 {
        return;
    }
    let name = BuyMenu::entry_name(&b.current.entries[i]);
    b.remove(i, r);
    b.recompute_ammo(r);
    out.push(Action::MessageArg("#Buy_Removed".into(), name, [0; 3]));
    apply_and_save(b, out, r);
}

/// Add the chosen gun and its attachments to the loadout, apply it, and go back to the same
/// slot's list — so a second gun of the same kind is one key away.
fn commit(b: &mut BuyMenu, r: &Rules, out: &mut Vec<Action>) {
    let id = b.pending_weapon;
    let att = b.pending_att;
    let price = purchase_price(b, id, att, false);
    let slots = purchase_slots(b, id, false, r);
    if affordable(b, r, price, slots) && b.add(id, att, false, false, r) {
        apply_and_save(b, out, r);
    }
    b.pending_weapon = -1;
    b.pending_att = 0;
    // The focus does not survive the purchase: the player is back on the list, and a row
    // that stayed selected would read as "this one is still on your list" when it is in
    // the loadout now. Nothing is selected until the player picks something.
    b.modern_focus = 0;
    b.screen = Screen::Browse;
    b.page = page::WEAPONS;
}

/// Clear the loadout (the game's own reset row) and apply it.
fn clear(b: &mut BuyMenu, r: &Rules, out: &mut Vec<Action>) {
    b.reset_config(r);
    out.push(Action::Message("#Buy_ConfigReset".into(), [0; 3]));
    b.ammo_spend = 0;
    apply_and_save(b, out, r);
}

/// A random loadout, and apply it.
fn random(b: &mut BuyMenu, r: &Rules, rng: &mut dyn Rng, out: &mut Vec<Action>) {
    b.random_config(0.0, r, rng);
    apply_and_save(b, out, r);
}

/// Switch to another tab: its saved config becomes the working copy, and it is applied — the
/// modern flow has no pending config, so the loadout that is shown is the loadout that is
/// live.
///
/// An empty tab is applied as an empty loadout: it is what the player chose, and the flow
/// applies what it shows.
fn switch_tab(b: &mut BuyMenu, index: usize, r: &Rules, out: &mut Vec<Action>) {
    if index >= SAVED_CONFIGS {
        return;
    }
    b.tab = index;
    b.current = b.saved[index].clone();
    b.recompute_ammo(r);
    b.new_config = true;
    b.submit_quiet(out, r);
    b.screen = Screen::Loadout;
    b.page = page::MAIN;
    out.push(Action::MessageArg("#Buy_ConfigLoaded".into(), (index + 1).to_string(), [0; 3]));
}

/// Apply the loadout and save it into the active tab.
///
/// **Apply on purchase**: the config is submitted the moment it changes (`rst_cfg`, `tkw`,
/// `tki`, `tka`), so the player never has to confirm it. The classic flow keeps its pending
/// config and its "Use New Config" row.
///
/// The edit is saved into the active tab, so the tabs are the loadouts and the working copy
/// is the active one.
fn apply_and_save(b: &mut BuyMenu, out: &mut Vec<Action>, r: &Rules) {
    if b.submit_quiet(out, r) {
        b.saved[b.tab] = b.current.clone();
        out.push(Action::SaveFile);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::menus::buy::{Action, BuyMenu, Mode, Rules, SAVED_CONFIGS};

    /// The rules the tests run under: TS 3.0's, with every weapon allowed (the mask the
    /// server sends) and the teamplay modes on, so every weapon is listed.
    fn rules() -> Rules {
        Rules { restriction: 0x1f, gamemode: 2, ..Rules::default() }
    }

    /// A fixed RNG: the random loadout always rolls the same thing.
    struct FixedRng(Vec<i32>, usize);
    impl Rng for FixedRng {
        fn long(&mut self, lo: i32, hi: i32) -> i32 {
            let v = self.0.get(self.1).copied().unwrap_or(lo);
            self.1 += 1;
            v.clamp(lo, hi)
        }
        fn float(&mut self, lo: f32, _hi: f32) -> f32 {
            lo
        }
    }

    /// A menu in the modern flow, opened on the loadout screen.
    fn modern(r: &Rules) -> BuyMenu {
        let mut m = BuyMenu { random_first: false, ..BuyMenu::default() };
        m.set_mode(Mode::Modern);
        m.open(r, &mut FixedRng(vec![], 0));
        m
    }

    /// The `TSBUY row` records of a state dump: (key, price, flags, page, number, label).
    fn dump_rows(lines: &[String]) -> Vec<(i32, i32, String, i32, String, String)> {
        lines
            .iter()
            .filter_map(|l| l.strip_prefix("TSBUY row "))
            .map(|rest| {
                let mut it = rest.splitn(6, ' ');
                let key = it.next().unwrap().parse().unwrap();
                let price = it.next().unwrap().parse().unwrap();
                let flags = it.next().unwrap().to_owned();
                let page = it.next().unwrap().parse().unwrap();
                let number = it.next().unwrap().to_owned();
                let label = it.next().unwrap().to_owned();
                (key, price, flags, page, number, label)
            })
            .collect()
    }

    /// The `TSBUY entry` records of a state dump: (index, cost, slots, attachments, slot,
    /// remove key, name).
    fn dump_entries(lines: &[String]) -> Vec<(usize, i32, i32, String, i32, i32, String)> {
        lines
            .iter()
            .filter_map(|l| l.strip_prefix("TSBUY entry "))
            .map(|rest| {
                let mut it = rest.splitn(7, ' ');
                let index = it.next().unwrap().parse().unwrap();
                let cost = it.next().unwrap().parse().unwrap();
                let slots = it.next().unwrap().parse().unwrap();
                let attachments = it.next().unwrap_or("").to_owned();
                let slot = it.next().unwrap().parse().unwrap();
                let remove_key = it.next().unwrap().parse().unwrap();
                let name = it.next().unwrap_or("").to_owned();
                (index, cost, slots, attachments, slot, remove_key, name)
            })
            .collect()
    }

    /// The modern flow's state dump: the shape the browser's panel reads.
    ///
    /// The three screens each print the state line, the page record, the slot records, the tab
    /// records, the rows and the end.
    #[test]
    fn the_modern_state_dump_has_the_documented_shape() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);

        // ---- the loadout screen.
        let lines = m.state_lines(&r);
        assert_eq!(
            lines[0],
            "TSBUY state open=1 hidden=0 page=0 budget=30000 total=0 slots=0 ammo_spend=0 new=0 cat=0 pending=-1 att=0 mode=modern screen=loadout slot=0 tab=0 slots_in_use=0 slot_limit=81"
        );
        assert_eq!(lines[1], "TSBUY page 0 BUY MENU");
        assert_eq!(lines[2], "TSBUY slot 1 0 0 Melee · Grenades · Swords");
        assert_eq!(lines[3], "TSBUY slot 2 0 0 Pistols");
        assert_eq!(lines[4], "TSBUY slot 3 0 0 SMGs");
        assert_eq!(lines[5], "TSBUY slot 4 0 0 Rifles · Shotguns");
        assert_eq!(lines[6], "TSBUY slot 5 0 0 Special");
        assert_eq!(lines[7], "TSBUY slot 6 0 0 Player Accessory");
        assert_eq!(lines[8], "TSBUY tab 0 Loadout A 1");
        assert_eq!(lines[9], "TSBUY tab 1 Loadout B 0");
        assert_eq!(lines[16], "TSBUY tab 8 Loadout I 0");
        assert_eq!(lines.last().unwrap(), "TSBUY end");
        assert!(lines.iter().all(|l| l.starts_with("TSBUY ")), "every line is a record");
        // The loadout's own rows: the accessory, Random and Clear.
        let rows = dump_rows(&lines);
        let own: Vec<_> = rows.iter().filter(|(_, _, f, ..)| f != "dim").collect();
        assert_eq!(own.len(), 3, "the accessory, Random and Clear: {own:?}");
        assert_eq!(own[0].0, 6, "the player accessory");
        assert_eq!(own[1].0, 7, "Random");
        assert_eq!(own[2].0, 8, "Clear — a key of its own, so every card's digit opens its card");
        assert_eq!(own[2].4, "X", "the design's keycap for Clear");
        // The rail and the tabs are dimmed: they answer on their own pages.
        let dim: Vec<_> = rows.iter().filter(|(_, _, f, ..)| f == "dim").collect();
        assert_eq!(dim.len(), RAIL_COUNT as usize + SAVED_CONFIGS, "the rail and the tabs");

        // ---- the browse screen: a rail entry's weapons.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        let lines = m.state_lines(&r);
        assert!(lines[0].contains("screen=browse"), "{}", lines[0]);
        assert!(lines[0].contains("slot=2"), "{}", lines[0]);
        assert_eq!(lines[1], "TSBUY page 2 PISTOLS");
        assert_eq!(lines.last().unwrap(), "TSBUY end");
        let rows = dump_rows(&lines);
        let guns: Vec<_> = rows.iter().filter(|(_, _, f, ..)| f != "dim").collect();
        assert_eq!(guns.len(), 9, "the nine pistols");
        assert_eq!(guns[0].0, 1, "the first pistol is key 1");
        assert_eq!(guns[0].5, "Glock-18");
        assert_eq!(guns[0].1, 850, "the Glock-18's price");
        assert_eq!(guns[0].3, page::WEAPONS, "the weapon rows answer on the weapons page");

        // ---- the attachments screen.
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Attach);
        let lines = m.state_lines(&r);
        assert!(lines[0].contains("screen=attach"), "{}", lines[0]);
        assert_eq!(lines[1], "TSBUY page 3 GLOCK-18");
        assert_eq!(lines.last().unwrap(), "TSBUY end");
        let rows = dump_rows(&lines);
        // The gun takes no key, the attachments are 1..4 and the action is key 6. No rail and
        // no tabs: the panel reads every row with a key of 1..5 as an attachment.
        assert_eq!(rows[0].0, 0, "the gun: the row that takes no key");
        assert_eq!(rows[0].5, "Glock-18");
        assert_eq!(rows[1].0, 1, "the silencer");
        assert_eq!(rows[1].1, 900, "the silencer's price");
        assert_eq!(rows[4].0, 6, "the action that adds the gun");
        assert_eq!(rows[4].1, 850, "the gun and its attachments together");
        assert_eq!(rows.len(), 5, "the gun, three attachments and the action: {rows:?}");
        // The pending purchase's summary: the port's numbers, never the browser's sum.
        assert!(lines.contains(&"TSBUY sum 850 28800".to_owned()), "the summary: {lines:?}");
    }

    /// A slot's weapons are the ones whose HUD grid column is that slot.
    #[test]
    fn a_slots_weapons_are_the_ones_with_that_hud_column() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let names = |slot: i32| slot_weapons(slot, &r).iter().map(|w| w.name.clone()).collect::<Vec<_>>();
        assert_eq!(names(1), ["M61 Grenade", "Katana", "Combat Knife", "Seal Knife"]);
        assert_eq!(
            names(2),
            [
                "Glock-18",
                "SOCOM-MK23",
                "Desert Eagle",
                "Five-seveN",
                "Glock-20C",
                "Ruger-MK1",
                "Raging Bull",
                "Contender G2",
                "Beretta 92F"
            ]
        );
        assert_eq!(names(3), ["Mini-Uzi", "MP5SD", "MP5K", "Skorpion", "MP7-PDW", "UMP"]);
        assert_eq!(
            names(4),
            [
                "Benelli M3",
                "M4A1",
                "AK47",
                "STEYR-AUG",
                "Barrett M82A1",
                "SPAS-12",
                "Mossberg 500",
                "M16A4",
                "M60E3",
                "Sawed-off",
                "USAS-12"
            ]
        );
        assert_eq!(
            names(5),
            ["Akimbo Berettas", "Akimbo MK23", "Akimbo Mini-Uzi", "Golden Colts", "Akimbo Five-seveN", "Akimbo Skorpions"]
        );
        // The M60E3 is slot 4, not slot 5, and the Golden Colts are slot 5.
        assert!(names(4).contains(&"M60E3".to_owned()));
        assert!(!names(5).contains(&"M60E3".to_owned()));
        assert!(names(5).contains(&"Golden Colts".to_owned()));
        assert!(!names(2).contains(&"Golden Colts".to_owned()));
        // The kung-fu is the empty id: it is not a weapon to buy.
        assert!(!names(1).contains(&"Kung-fu".to_owned()));
        // The M61 grenade needs a teamplay mode, so it is not listed without one.
        let solo = Rules { gamemode: 0, ..rules() };
        assert_eq!(slot_weapons(1, &solo).len(), 3, "no M61 without a teamplay mode");
    }

    /// The rail is the weapon categories: seven entries, keyed 1..=7.
    ///
    /// The rifles and the shotguns used to be one entry ("Rifles · Shotguns") and the
    /// melee weapons' entry used to promise "Grenades · Swords", which its list did not
    /// have. The rail's labels are the categories' names now, and the state's `slot=` is
    /// the rail's key.
    #[test]
    fn the_rail_is_the_weapon_categories() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        let lines = m.state_lines(&r);
        let rows = dump_rows(&lines);
        // The rail's rows: the dimmed ones on the rail's own page.
        let rail: Vec<_> = rows.iter().filter(|(_, _, f, pg, ..)| f == "dim" && *pg == page::CATEGORY).collect();
        assert_eq!(rail.len(), 7, "the rail's seven entries: {rail:?}");
        let labels: Vec<&str> = rail.iter().map(|(_, _, _, _, _, label)| label.as_str()).collect();
        assert_eq!(labels, ["Melee weapons", "Pistols", "SMGs", "Rifles", "Shotguns", "Special", "Player Accessory"]);
        // And their keys are the rail's keys, in order.
        let keys: Vec<i32> = rail.iter().map(|(key, ..)| *key).collect();
        assert_eq!(keys, [1, 2, 3, 4, 5, 6, 7]);

        // Every key opens its own entry, and the state reports the rail's key.
        for key in 1..=RAIL_COUNT {
            m.dom_key_on(page::CATEGORY, key, &r, &mut FixedRng(vec![], 0));
            assert_eq!(m.screen, Screen::Browse, "the rail's key {key} opens a list");
            assert_eq!(m.modern_slot, key, "and the state's `slot=` is the rail's key");
        }
        // The loadout screen's cards are still the five HUD slots and the accessory.
        let cards: Vec<&str> = lines.iter().filter_map(|l| l.strip_prefix("TSBUY slot ")).collect();
        assert_eq!(cards.len(), 6, "the five HUD slots and the accessory: {cards:?}");
        assert!(cards[0].ends_with("Melee · Grenades · Swords"), "the HUD slot 1 card: {cards:?}");
        assert!(cards[3].ends_with("Rifles · Shotguns"), "the HUD slot 4 card: {cards:?}");
    }

    /// The loadout screen's digits are the cards' own, and the clear row does not eat one.
    ///
    /// The clear row used to answer on key four — the classic flow's own reset key — so in
    /// the modern flow a player pressing the card-4 digit wiped the loadout instead of
    /// opening the rifles. The modern flow has its own key space: the clear row takes key
    /// eight, and every card's digit opens its card.
    #[test]
    fn the_loadout_screen_digits_open_their_cards() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        // Every card's digit opens that card's list.
        for (key, rail) in [
            (1, Rail::Melee),
            (2, Rail::Pistols),
            (3, Rail::Smgs),
            (4, Rail::Rifles),
            (5, Rail::Special),
        ] {
            let mut m = modern(&r);
            m.dom_key_on(page::MAIN, key, &r, &mut FixedRng(vec![], 0));
            assert_eq!(m.screen, Screen::Browse, "the card-{key} digit opens a list");
            assert_eq!(m.modern_slot, rail.key(), "the card-{key} digit opens {rail:?}");
        }
        // The accessory and Random are the loadout screen's own rows.
        let mut m = modern(&r);
        m.dom_key_on(page::MAIN, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, Rail::Accessory.key(), "six is the accessory");
    }

    /// The clear row answers on key eight, and only on key eight.
    ///
    /// The loadout screen's cards wear the HUD slots' own digits, and the player's first
    /// guess is that the digit on a card opens that card. So the clear row — the game's own
    /// reset row, which the classic flow keeps on key four — takes a key of its own in the
    /// modern flow.
    #[test]
    fn the_clear_row_answers_on_its_own_key() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        // The weapons in the loadout — the kevlar is not one of them: the game's own
        // `cl_buykevlar` puts a kevlar into a reset config, so a cleared loadout is not
        // an empty one.
        let weapons = |m: &BuyMenu| m.current.entries.iter().filter(|e| e.id != 0 && !e.is_item).count();

        // A pistol in the loadout.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(weapons(&m), 1, "the pistol is in the loadout");

        // Four opens the rifles and clears nothing.
        m.dom_key_on(page::MAIN, 4, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse, "four opens a list");
        assert_eq!(m.modern_slot, Rail::Rifles.key(), "four opens the rifles");
        assert_eq!(weapons(&m), 1, "and it clears nothing");

        // Back to the loadout, and eight empties it.
        m.dom_key_on(page::WEAPONS, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout);
        m.dom_key_on(page::MAIN, 8, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "eight does not open a list");
        assert_eq!(weapons(&m), 0, "eight empties the loadout");
    }

    /// The focused row does not survive the trip through the attachments screen.
    ///
    /// The playtest: the gun the player had just bought stayed selected when they came
    /// back to the list, and a selected row reads as "this one is still on your list" —
    /// which is exactly what it is not, any more. Nothing is selected when they come back.
    #[test]
    fn the_focus_does_not_survive_the_trip_through_the_attachments() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        // The list opens with its first row focused: the design's mockup draws it that way,
        // and "Enter picks the focused row" needs something to pick.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert_ne!(m.modern_focus, 0, "the list opens with a row focused");

        // The gun is focused on the attachments screen.
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Attach);
        assert_ne!(m.modern_focus, 0, "the gun is focused while its attachments are chosen");

        // Back: nothing is focused.
        m.dom_key_on(page::OPTIONS, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        assert_eq!(m.modern_focus, 0, "the focus does not survive the trip back");

        // And the same after a purchase.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse, "the purchase comes back to the list");
        assert_eq!(m.modern_focus, 0, "nothing is focused after the purchase");
    }

    /// The rifles and the shotguns are two entries now, split by the game's own kind, and
    /// each list holds only what it claims.
    ///
    /// The kind is the weapon table's, read through the game's own correction of it
    /// (`GetWeaponType`): the Sawed-Off is a shotgun to the game (the table's `kind` says
    /// pistol) and the Barrett is a sniper rifle, so it is a rifle here.
    #[test]
    fn the_rifles_and_the_shotguns_are_split_by_the_games_own_kind() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let names = |w: &[&'static WeaponInfo]| w.iter().map(|w| w.name.clone()).collect::<Vec<_>>();
        let rifles = rail_weapons(Rail::Rifles, &r);
        let shotguns = rail_weapons(Rail::Shotguns, &r);
        assert_eq!(names(&rifles), ["M4A1", "AK47", "STEYR-AUG", "Barrett M82A1", "M16A4", "M60E3", "USAS-12"]);
        assert_eq!(names(&shotguns), ["Benelli M3", "SPAS-12", "Mossberg 500", "Sawed-off"]);
        // Each list holds only its own kind.
        assert!(rifles.iter().all(|w| is_rifle(w)), "the rifles are rifles: {rifles:?}");
        assert!(shotguns.iter().all(|w| is_shotgun(w)), "the shotguns are shotguns: {shotguns:?}");
        // And the two together are the HUD slot 4 whole: the split loses nothing.
        let mut both = names(&rifles);
        both.extend(names(&shotguns));
        both.sort();
        let mut slot4 = names(&slot_weapons(4, &r));
        slot4.sort();
        assert_eq!(both, slot4, "the split loses nothing: {slot4:?}");
        // The two lists do not overlap.
        assert!(!rifles.iter().any(|w| shotguns.iter().any(|s| s.id == w.id)), "the lists are disjoint");
    }

    /// The rail's key and the HUD slot are two different numbers, and the entry record
    /// carries the HUD slot: a shotgun bought from the shotguns entry is still the HUD
    /// slot 4, and an akimbo bought from the rail's Special entry is still the HUD
    /// slot 5.
    #[test]
    fn an_entry_bought_from_the_rail_still_reports_the_hud_slot() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // The shotguns: the rail's key 5, the HUD slot 4.
        m.dom_key_on(page::CATEGORY, Rail::Shotguns.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, 5, "the rail's key is the state's `slot=`");
        assert_eq!(Rail::Shotguns.hud_slot(), 4, "and the HUD slot is the game's own");
        // Buy the first shotgun (the Benelli M3).
        let items = browse_items(Rail::Shotguns.key(), &r);
        assert_eq!(items[0].name, "Benelli M3", "the first shotgun: {items:?}");
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        let entries = dump_entries(&lines);
        let benelli = entries.iter().find(|(_, _, _, _, _, _, name)| name == "Benelli M3").expect("the Benelli M3");
        assert_eq!(benelli.4, 4, "the HUD slot, not the rail's key: {benelli:?}");
        // The loadout's card for the HUD slot 4 holds it: the card is the HUD slot's.
        assert!(lines.contains(&"TSBUY slot 4 40 1 Rifles · Shotguns".to_owned()), "the HUD slot 4 card: {lines:?}");

        // The akimbo weapons: the rail's key 6, the HUD slot 5.
        m.dom_key_on(page::CATEGORY, Rail::Special.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, 6, "the rail's key");
        assert_eq!(Rail::Special.hud_slot(), 5, "the HUD slot");
        let items = browse_items(Rail::Special.key(), &r);
        let colts = items.iter().position(|i| i.name == "Golden Colts").expect("the Golden Colts");
        m.dom_key_on(page::WEAPONS, colts as i32 + 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        let entries = dump_entries(&lines);
        let colts = entries.iter().find(|(_, _, _, _, _, _, name)| name == "Golden Colts").expect("the Golden Colts");
        assert_eq!(colts.4, 5, "the HUD slot 5, not the rail's key 6: {colts:?}");
    }

    /// The grenades: the M61 Grenade is a weapon of its own kind, and the game puts it in
    /// the HUD slot 1 with the melee weapons — so the melee weapons' entry lists it, and
    /// the entry is called "Melee weapons" because that is what the player asked for.
    ///
    /// The game does not sell the grenades in a deathmatch mode (its own rule: they need a
    /// teamplay mode), and the classic menu hides them there too, so the port hides them
    /// as well. That is why the list the player saw held only the knives and the katana.
    #[test]
    fn the_grenades_are_in_the_melee_weapons_entry() {
        ts30_gameplay::tables::make_default();
        // A teamplay mode: the game sells the grenades there.
        let r = rules();
        let melee = browse_items(Rail::Melee.key(), &r);
        let names = melee.iter().map(|i| i.name.clone()).collect::<Vec<_>>();
        assert_eq!(names, ["M61 Grenade", "Katana", "Combat Knife", "Seal Knife"]);
        assert_eq!(melee[0].id, 24, "the M61's id");
        assert_eq!(melee[0].price, 1000, "and its price");
        // It is the game's own kind: a grenade.
        assert_eq!(tables().weapon(24).map(|w| w.kind), Some(shared::weapons::WeaponKind::Grenade));
        // And it can be bought: the flow buys it like any other weapon.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, Rail::Melee.key(), &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        let entries = dump_entries(&lines);
        let grenade = entries.iter().find(|(_, _, _, _, _, _, name)| name == "M61 Grenade").expect("the M61 Grenade");
        assert_eq!(grenade.1, 1000, "the grenade's cost: {grenade:?}");
        assert_eq!(grenade.4, 1, "and its HUD slot: {grenade:?}");

        // Without a teamplay mode the game does not sell it, and neither does the port.
        let solo = Rules { gamemode: 0, ..rules() };
        let melee = browse_items(Rail::Melee.key(), &solo);
        assert_eq!(melee.len(), 3, "no M61 without a teamplay mode: {melee:?}");
        assert!(!melee.iter().any(|i| i.id == 24), "and no grenade: {melee:?}");
    }

    /// The list's rows are keyed 1–9 and then 11, 12, …, because key 10 is the game's own
    /// back key and stays reserved.
    ///
    /// That is the game's own rule for a weapon list — the classic flow's list numbers its
    /// tenth weapon 11, the "a" key — so the modern flow follows it instead of inventing
    /// one.
    ///
    /// The rail is the categories now, and no category has ten weapons any more (the
    /// pistols are the longest, with nine), so the rule has no row to bite on today. It
    /// still stands, and the panel still draws the keycaps for it, so the key mapping is
    /// held here: the ninth row is key 9, the tenth is key 11 and the eleventh is key 12.
    #[test]
    fn a_lists_rows_are_keyed_one_to_nine_and_then_eleven() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // The pistols: the longest list there is now.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        let items = browse_items(2, &r);
        assert_eq!(items.len(), 9, "the nine pistols: {items:?}");

        // The rows' keys are their own places.
        let lines = m.state_lines(&r);
        let guns: Vec<_> = dump_rows(&lines).iter().filter(|(_, _, f, ..)| f != "dim").cloned().collect();
        assert_eq!(guns.len(), 9, "the list's rows: {guns:?}");
        assert_eq!(guns[8].0, 9, "the ninth is key 9: {guns:?}");

        // The tenth row would be key 11 and the eleventh key 12, and the keycap is the
        // row's place in the list, so the tenth still wears the design's "A" and the
        // letters carry on after it.
        assert_eq!(guns[8].4, "9", "the ninth's keycap: {guns:?}");
        assert_eq!(browse_key(9), 11, "the tenth row's key");
        assert_eq!(browse_key(10), 12, "the eleventh row's key");
        assert_eq!(browse_badge(9), "A", "the tenth row's keycap is the design's");
        assert_eq!(browse_badge(10), "B", "and the eleventh's");
        // And the key names the row: key 11 is the tenth row and key 10 is no row at all.
        assert_eq!(list_index(11), Some(9), "key 11 is the tenth row");
        assert_eq!(list_index(12), Some(10), "key 12 is the eleventh row");
        assert_eq!(list_index(10), None, "key 10 is the back key: it names no row");
    }

    /// The marks the port prints for a row carry the row's own key: the tenth row's
    /// shortfall and its owned mark are the eleventh's, not the tenth's.
    #[test]
    fn the_shortfalls_and_the_owned_marks_carry_the_rows_own_keys() {
        ts30_gameplay::tables::make_default();
        // $1,000: everything above it is short, and the keys are the list's own.
        let r = Rules { cash: 1000, ..rules() };
        let mut m = modern(&r);
        // The rifles.
        m.dom_key_on(page::CATEGORY, 4, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        // The M4A1 ($4,500) is the first row, so it is key 1 and needs $3,500 more.
        assert!(lines.contains(&"TSBUY short 1 3500".to_owned()), "the shortfalls: {lines:?}");
        // The USAS-12 ($5,100) is the seventh row, so it is key 7 and needs $4,100 more.
        assert!(lines.contains(&"TSBUY short 7 4100".to_owned()), "the shortfalls: {lines:?}");
        // And every row of the list has its own shortfall: seven rifles, seven marks.
        let shorts = lines.iter().filter(|l| l.starts_with("TSBUY short ")).count();
        assert_eq!(shorts, 7, "every rifle is out of reach: {lines:?}");

        // Buying a row marks the row with that row's own key as owned.
        let r = rules();
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 4, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse, "back on the list");
        let lines = m.state_lines(&r);
        assert!(lines.contains(&"TSBUY owned 1 1".to_owned()), "the owned mark: {lines:?}");
    }

    /// Key 10 is the game's own back key, and it still goes back on the modern screens.
    #[test]
    fn key_ten_still_goes_back_on_the_modern_screens() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);

        // The weapon list: back to the loadout.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        m.dom_key_on(page::WEAPONS, BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the weapon list's back");
        assert_eq!(m.page, page::MAIN);

        // The attachments: back to the slot's list.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Attach);
        m.dom_key_on(page::OPTIONS, BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse, "the attachments' back");
        assert_eq!(m.pending_weapon, -1, "and the gun is off the hook");

        // The accessory's items: back to the loadout.
        m.dom_key_on(page::CATEGORY, Rail::Accessory.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        m.dom_key_on(page::ITEMS, BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the accessory's back");

        // The rail: back to the loadout.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::CATEGORY, BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the rail's back");

        // The loadout screen: back is close.
        let actions = m.dom_key_on(page::MAIN, BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert!(actions.contains(&Action::Close), "the loadout screen's back closes the menu: {actions:?}");
        assert!(!m.active, "and the menu is closed");

        // The panel's own back button sends a bare key, with no page of its own.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key(BACK_KEY, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "a bare key ten goes back too");
    }

    /// Key 0 is the design's back badge ("0 Back to loadout", "0 Back to Pistols"), and it
    /// goes back on the modern screens.
    #[test]
    fn key_zero_goes_back_on_the_modern_screens() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);

        // The weapon list: back to the loadout.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        m.dom_key_on(page::WEAPONS, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the weapon list's back");
        assert_eq!(m.page, page::MAIN);

        // The attachments: back to the slot's list.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Attach);
        m.dom_key_on(page::OPTIONS, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse, "the attachments' back");
        assert_eq!(m.pending_weapon, -1, "and the gun is off the hook");

        // The accessory's items: back to the loadout.
        m.dom_key_on(page::CATEGORY, Rail::Accessory.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Browse);
        m.dom_key_on(page::ITEMS, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the accessory's back");

        // The rail: back to the loadout.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::CATEGORY, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "the rail's back");

        // The loadout screen: back is close.
        let actions = m.dom_key_on(page::MAIN, BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert!(actions.contains(&Action::Close), "the loadout screen's back closes the menu: {actions:?}");
        assert!(!m.active, "and the menu is closed");

        // And a bare key zero goes back as well.
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key(BACK_KEY_DESIGN, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.screen, Screen::Loadout, "a bare key zero goes back too");
    }

    /// The modern loadout screen's clear row says "Clear" — the design's own word — and the
    /// classic flow's reset row keeps the game's title.
    ///
    /// The port owns the labels the panel draws: the browser resolves a title key through
    /// the game's own titles and passes a plain label through unchanged, so the port prints
    /// the word the design asks for. The classic canvas menu keeps the game's own title,
    /// because the canvas menu must not change.
    #[test]
    fn the_modern_clear_row_says_clear_and_the_classic_keeps_its_title() {
        ts30_gameplay::tables::make_default();
        let r = rules();

        // The modern flow.
        let m = modern(&r);
        let lines = m.state_lines(&r);
        let rows = dump_rows(&lines);
        let clear = rows.iter().find(|(_, _, f, _, n, _)| f != "dim" && n == "X").expect("the clear row");
        assert_eq!(clear.5, "Clear", "the design's word: {rows:?}");
        assert!(!lines.iter().any(|l| l.contains("#Buy_ResetConfig")), "the modern flow prints no title key: {lines:?}");

        // The classic flow.
        let mut c = BuyMenu { random_first: false, ..BuyMenu::default() };
        c.open(&r, &mut FixedRng(vec![], 0));
        let lines = c.state_lines(&r);
        assert!(
            lines.contains(&"TSBUY row 4 0 0 0 4 #Buy_ResetConfig".to_owned()),
            "the classic's own reset row keeps the game's title: {lines:?}"
        );
    }

    /// A purchase in the modern flow applies the config: the four loadout commands go to the
    /// server at once, and there is no "Use New Config" step.
    #[test]
    fn a_modern_purchase_applies_the_config() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // The rail opens the slot, the weapon list picks the gun, the attachments screen adds it.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.pending_weapon, 1, "the Glock-18");
        let actions = m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        let cmds: Vec<&str> = actions
            .iter()
            .filter_map(|a| match a {
                Action::ServerCmd(c) => Some(c.as_str()),
                _ => None,
            })
            .collect();
        assert_eq!(cmds[0], "rst_cfg", "the config is reset first: {cmds:?}");
        assert!(cmds[1].starts_with("tkw "), "the weapons: {cmds:?}");
        assert!(cmds[1].contains("1_0"), "the Glock-18: {cmds:?}");
        assert!(cmds[2].starts_with("tki "), "the items: {cmds:?}");
        assert!(cmds[3].starts_with("tka "), "the ammo: {cmds:?}");
        assert_eq!(cmds.len(), 4, "the four loadout commands: {cmds:?}");
        assert!(actions.contains(&Action::SaveFile), "the edit is saved into the active tab");
        // The gun is in the loadout, and the tab holds it.
        assert!(m.current.entries.iter().any(|e| e.id == 1));
        assert_eq!(m.saved[m.tab], m.current, "the edit is saved into the active tab");
        // And the flow is back on the same slot's list.
        assert_eq!(m.screen, Screen::Browse);
        assert_eq!(m.modern_slot, 2);
        assert_eq!(m.page, page::WEAPONS);
    }

    /// A purchase in the classic flow does NOT apply the config: the classic keeps its pending
    /// config and its "Use New Config" row.
    #[test]
    fn a_classic_purchase_does_not_apply_the_config() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..BuyMenu::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        assert_eq!(m.mode, Mode::Classic, "the classic flow is the default");
        // The classic's own path: the categories, the weapons, the options page's buy row.
        m.handle_key(page::MAIN, 2, &r, &mut FixedRng(vec![], 0));
        m.handle_key(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        m.handle_key(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        let actions = m.handle_key(page::OPTIONS, 1, &r, &mut FixedRng(vec![], 0));
        assert!(!actions.iter().any(|a| matches!(a, Action::ServerCmd(_))), "nothing is sent: {actions:?}");
        assert!(m.current.entries.iter().any(|e| e.id == 1), "the gun is in the pending config");
        assert!(m.new_config, "the config is still pending");
        // The classic's state line has no mode: the classic dump is unchanged.
        let lines = m.state_lines(&r);
        assert!(!lines[0].contains("mode="), "{}", lines[0]);
        // The classic's own line, byte for byte: the classic flow is not touched by the
        // modern one. (The classic ends on the category page, and the Glock-18's ammo fill
        // spent $350.)
        assert_eq!(
            lines[0],
            "TSBUY state open=1 hidden=0 page=1 budget=30000 total=850 slots=10 ammo_spend=350 new=1 cat=0 pending=-1 att=0"
        );
    }

    /// An unaffordable row reports how much more money it needs.
    #[test]
    fn an_unaffordable_row_reports_the_shortfall() {
        ts30_gameplay::tables::make_default();
        let r = Rules { cash: 1000, ..rules() };
        let mut m = modern(&r);
        // The melee slot: the M61 grenade ($1,000), the Katana ($2,900), the knives ($100).
        m.dom_key_on(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        assert!(lines.contains(&"TSBUY short 2 1900".to_owned()), "the Katana needs $1,900 more: {lines:?}");
        assert!(!lines.contains(&"TSBUY short 1 0".to_owned()), "the M61 fits exactly");
        // The row is marked as unaffordable, and the browser is told the number.
        let rows = dump_rows(&lines);
        let katana = rows.iter().find(|(_, _, _, _, _, label)| label == "Katana").expect("the Katana");
        assert_eq!(katana.1, 2900, "the Katana's price");
        assert!(katana.2.contains('x'), "the row is marked: {:?}", katana.2);
        // The shortfall is the money that is missing, not the price.
        let cheap = rows.iter().find(|(_, _, _, _, _, label)| label == "Combat Knife").expect("the Combat Knife");
        assert!(!cheap.2.contains('x'), "the knife fits: {:?}", cheap.2);
        assert!(!lines.iter().any(|l| l.starts_with("TSBUY short 3")), "the knives fit: {lines:?}");
    }

    /// Switching tabs loads that tab's saved config, and an edit is saved into the active tab.
    #[test]
    fn switching_tabs_loads_the_saved_config_and_an_edit_saves_into_it() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // A loadout in the second tab.
        let mut saved = m.current.clone();
        saved.entries[0] = super::super::buy::Entry { id: 13, cost: 3000, ..Default::default() };
        saved.total = 3000;
        saved.slots = 40;
        m.saved[1] = saved.clone();

        // Switch to the second tab: its config becomes the working copy, and it is applied.
        let actions = m.dom_key_on(page::LOAD, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.tab, 1, "the active tab");
        assert_eq!(m.current.total, 3000, "the tab's config is loaded");
        assert!(m.current.entries.iter().any(|e| e.id == 13));
        assert!(actions.contains(&Action::ServerCmd("rst_cfg".into())), "the loadout that is shown is live: {actions:?}");
        assert_eq!(m.screen, Screen::Loadout, "the flow is back on the loadout screen");

        // An edit in this tab is saved into this tab, and not into the other one.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert!(m.saved[1].entries.iter().any(|e| e.id == 1), "the Glock-18 is in the second tab");
        assert!(!m.saved[0].entries.iter().any(|e| e.id == 1), "and not in the first");
        assert_eq!(m.saved[1], m.current, "the tab holds the working copy");
    }

    /// The client's slot limit and the table's are the same number: the server checks a
    /// loadout against the table, so the two cannot drift.
    #[test]
    fn the_slot_limit_and_the_tables_agree() {
        ts30_gameplay::tables::make_default();
        assert_eq!(crate::menus::buy::SLOTS, tables().combat.slots.total, "the client's slot pool is the table's");
        assert_eq!(slot_limit(), tables().combat.slots.total, "the modern flow's slot pool is the table's");
    }

    /// An owned weapon is taken off the loadout when it is selected, and the refund is
    /// applied: the design's rule for an owned row.
    #[test]
    fn selecting_an_owned_weapon_takes_it_off_the_loadout() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // Buy the Glock-18: the slot's list, the attachments screen, then "add to loadout".
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.current.total, 850, "the Glock-18 is in the loadout");
        assert_eq!(m.screen, Screen::Browse, "the flow is back on the slot's list");

        // The row says it is owned.
        let lines = m.state_lines(&r);
        assert!(lines.contains(&"TSBUY owned 1 1".to_owned()), "the Glock-18 is owned: {lines:?}");

        // Selecting it again takes it off, and the loadout that is left is applied.
        let actions = m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert!(!m.current.entries.iter().any(|e| e.id == 1), "the Glock-18 is off the loadout");
        assert_eq!(m.current.total, 0, "and its cost is refunded");
        let cmds: Vec<&str> = actions
            .iter()
            .filter_map(|a| match a {
                Action::ServerCmd(c) => Some(c.as_str()),
                _ => None,
            })
            .collect();
        assert_eq!(cmds[0], "rst_cfg", "the loadout is applied: {cmds:?}");
        assert!(!cmds[1].contains("1_0"), "and the Glock-18 is not in it: {cmds:?}");
        // The flow stays where it was: the slot's list.
        assert_eq!(m.screen, Screen::Browse);
        assert_eq!(m.modern_slot, 2);
    }

    /// An owned row is never out of reach: taking a weapon off costs nothing, so the row is
    /// not marked unaffordable and carries no shortfall.
    #[test]
    fn an_owned_row_is_never_out_of_reach() {
        ts30_gameplay::tables::make_default();
        // $1,000 buys the Glock-18 and leaves $150 — less than the Glock-18 costs.
        let r = Rules { cash: 1000, ..rules() };
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.current.total, 850);

        let lines = m.state_lines(&r);
        let rows = dump_rows(&lines);
        let glock = rows.iter().find(|(_, _, _, _, _, label)| label == "Glock-18").expect("the Glock-18");
        assert!(!glock.2.contains('x'), "an owned row is not out of reach: {:?}", glock.2);
        assert!(!lines.iter().any(|l| l.starts_with("TSBUY short 1")), "and it has no shortfall: {lines:?}");
        // A row the player cannot afford still is. $150 is left, so the $700 SOCOM-MK23 is
        // $550 short of being bought.
        let mk23 = rows.iter().find(|(_, _, _, _, _, label)| label == "SOCOM-MK23").expect("the SOCOM-MK23");
        assert!(mk23.2.contains('x'), "the SOCOM-MK23 is out of reach: {:?}", mk23.2);
        assert!(lines.contains(&"TSBUY short 2 550".to_owned()), "and says how much more it needs: {lines:?}");
    }

    /// The kevlar's id and the Akimbo Mini-Uzi's id are the same number, and they are not
    /// each other: an item is never a weapon.
    #[test]
    fn an_item_and_a_weapon_with_the_same_id_are_not_each_other() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        assert_eq!(ITEM_KEVLAR, 16, "the kevlar's id");
        assert_eq!(ITEM_STEALTH, 32, "the stealth shoes' id");
        let mut m = modern(&r);
        // Buy the Akimbo Mini-Uzi: it is the weapon with the kevlar's number.
        m.dom_key_on(page::CATEGORY, Rail::Special.key(), &r, &mut FixedRng(vec![], 0));
        let items = browse_items(Rail::Special.key(), &r);
        let mini_uzi = items.iter().position(|i| i.id == 16).expect("the Akimbo Mini-Uzi");
        m.dom_key_on(page::WEAPONS, mini_uzi as i32 + 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert!(m.current.entries.iter().any(|e| e.id == 16 && !e.is_item), "the gun is in the loadout");

        // The accessory's list does not think the kevlar is owned.
        m.dom_key_on(page::CATEGORY, Rail::Accessory.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, Rail::Accessory.key());
        let lines = m.state_lines(&r);
        assert!(!lines.iter().any(|l| l.starts_with("TSBUY owned")), "the accessory's items are not owned: {lines:?}");
        // And the gun's own row still is.
        m.dom_key_on(page::CATEGORY, Rail::Special.key(), &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        assert!(lines.contains(&format!("TSBUY owned {} 1", mini_uzi + 1)), "the gun is owned: {lines:?}");
    }

    /// The loadout screen reports the slot usage BOTH ways: how many of the five slots are in
    /// use, and how much of the slot pool they take.
    #[test]
    fn the_loadout_screen_reports_the_slot_usage_both_ways() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // An empty loadout: no slot is in use, and the pool is untouched.
        let lines = m.state_lines(&r);
        assert!(lines[0].contains("slots_in_use=0"), "{}", lines[0]);
        assert!(lines[0].contains("slots=0"), "{}", lines[0]);
        assert!(lines.contains(&"TSBUY slot 2 0 0 Pistols".to_owned()), "the slot records: {lines:?}");

        // A pistol: the second slot is in use, and it takes ten of the eighty-one.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        assert!(lines[0].contains("slots_in_use=1"), "one slot is in use: {}", lines[0]);
        assert!(lines[0].contains("slots=10"), "ten of the pool: {}", lines[0]);
        assert!(lines.contains(&"TSBUY slot 2 10 1 Pistols".to_owned()), "the slot record: {lines:?}");
        assert!(lines.contains(&"TSBUY slot 1 0 0 Melee · Grenades · Swords".to_owned()), "the rest: {lines:?}");
    }

    /// The accessory's list numbers only the items it lists: a restricted item is not on the
    /// list, so the keys after it move up and a key that names nothing buys nothing.
    #[test]
    fn the_accessory_list_numbers_only_the_items_it_lists() {
        ts30_gameplay::tables::make_default();
        // Without a teamplay mode the stealth shoes are restricted: the list is the kevlar
        // alone.
        let r = Rules { gamemode: 0, ..rules() };
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, Rail::Accessory.key(), &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, Rail::Accessory.key());
        let items = browse_items(Rail::Accessory.key(), &r);
        assert_eq!(items.len(), 1, "the kevlar alone: {items:?}");
        assert_eq!(items[0].id, ITEM_KEVLAR);
        let lines = m.state_lines(&r);
        let rows = dump_rows(&lines);
        let own: Vec<_> = rows.iter().filter(|(_, _, f, ..)| f != "dim").collect();
        assert_eq!(own.len(), 1, "one item row: {own:?}");
        assert_eq!(own[0].0, 1, "the kevlar is key 1");
        assert_eq!(own[0].5, "Kevlar");

        // Key 2 names nothing, so nothing is bought.
        let actions = m.dom_key_on(page::ITEMS, 2, &r, &mut FixedRng(vec![], 0));
        assert!(m.current.entries.iter().all(|e| e.id == 0), "nothing was bought: {:?}", m.current.entries);
        assert_eq!(m.current.total, 0, "and nothing was spent");
        assert!(!actions.iter().any(|a| matches!(a, Action::ServerCmd(_))), "nothing was sent: {actions:?}");

        // And key 1 buys the kevlar.
        m.dom_key_on(page::ITEMS, 1, &r, &mut FixedRng(vec![], 0));
        assert!(m.current.entries.iter().any(|e| e.id == ITEM_KEVLAR && e.is_item), "the kevlar is in the loadout");
    }

    /// A key for another screen's page is refused: the modern flow has screens, and a page
    /// that belongs to one of them is not on screen on another.
    #[test]
    fn a_key_for_another_screen_is_refused() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // The loadout screen: its own page, the rail and the tabs.
        assert!(m.page_is_drawn(page::MAIN));
        assert!(m.page_is_drawn(page::CATEGORY));
        assert!(m.page_is_drawn(page::LOAD));
        assert!(!m.page_is_drawn(page::WEAPONS));
        assert!(!m.page_is_drawn(page::OPTIONS));
        // A slot's list: its own page, the rail and the tabs.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        assert!(m.page_is_drawn(page::WEAPONS));
        assert!(m.page_is_drawn(page::CATEGORY));
        assert!(m.page_is_drawn(page::LOAD));
        assert!(!m.page_is_drawn(page::OPTIONS));
        // The attachments: the gun's own page, and nothing else.
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        assert!(m.page_is_drawn(page::OPTIONS));
        assert!(!m.page_is_drawn(page::WEAPONS));
        assert!(!m.page_is_drawn(page::CATEGORY));
        assert!(!m.page_is_drawn(page::LOAD));
    }

    /// The state line carries the slot pool's limit, so the panel can draw "41/81 slots".
    ///
    /// The number is the ruleset's (`combat.toml`'s `slots.total`) — the same table the
    /// server checks a loadout against — and never a constant of the browser's own.
    #[test]
    fn the_state_line_carries_the_slot_pool_limit() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let m = modern(&r);
        let lines = m.state_lines(&r);
        assert!(lines[0].contains(&format!("slot_limit={}", tables().combat.slots.total)), "{}", lines[0]);
        assert_eq!(tables().combat.slots.total, 81, "the ruleset's slot pool");
        assert_eq!(slot_limit(), tables().combat.slots.total, "the port reads it from the table");
        // And it is the same number the client's own slot pool is: the two cannot drift.
        assert_eq!(slot_limit(), super::super::buy::SLOTS);
    }

    /// The modern entry record carries the entry's attachments, its classic slot and the key
    /// that removes it: the loadout cards show a chip per attachment, they are grouped into
    /// the five slots, and they are clickable.
    ///
    /// The classic flow's four-field record is untouched.
    #[test]
    fn an_entry_carries_its_attachments_its_slot_and_its_remove_key() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // The Glock-18 with a silencer and a lasersight: $2,550 and ten slots.
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 2, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.pending_att, 1 | 2, "the silencer and the lasersight");
        // The attachments are the same title keys the OPTIONS page's rows use, so the browser
        // resolves them exactly the way it resolves every other label.
        let lines = m.state_lines(&r);
        assert!(lines.contains(&"TSBUY row 1 900 on 3 1 #HUD_Silencer".to_owned()), "the OPTIONS rows: {lines:?}");
        assert!(lines.contains(&"TSBUY row 2 800 on 3 2 #HUD_Lasersight".to_owned()), "the OPTIONS rows: {lines:?}");
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));

        let lines = m.state_lines(&r);
        assert!(
            lines.contains(&"TSBUY entry 0 2550 10 #HUD_Silencer,#HUD_Lasersight 2 10 Glock-18".to_owned()),
            "the entry record: {lines:?}"
        );
        // An entry with no attachments prints an empty field.
        //
        // The knife's place in slot 1's list depends on the rules (the M61 grenade is only
        // listed in a teamplay mode), so find it rather than counting. The "Add to loadout"
        // row's key depends on how many attachment rows the weapon has, so read it too.
        m.dom_key_on(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        let knife_key =
            browse_items(1, &r).iter().position(|i| i.name == "Combat Knife").expect("the knife is in slot 1's list") as i32 + 1;
        m.dom_key_on(page::WEAPONS, knife_key, &r, &mut FixedRng(vec![], 0));
        let add_key = m
            .state_lines(&r)
            .iter()
            .find_map(|l| {
                let mut parts = l.strip_prefix("TSBUY row ")?.splitn(6, ' ');
                let key: i32 = parts.next()?.parse().ok()?;
                let label = parts.nth(4)?;
                if label == "Add to loadout" { Some(key) } else { None }
            })
            .expect("the add row");
        m.dom_key_on(page::OPTIONS, add_key, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        let entries = dump_entries(&lines);
        let knife = entries.iter().find(|(_, _, _, _, _, _, name)| name == "Combat Knife").expect("the knife");
        assert_eq!(knife.3, "", "no attachments: an empty field");
        assert_eq!(knife.4, 1, "the knife's slot");
        assert!(knife.5 >= REMOVE_KEY_BASE, "and its remove key: {knife:?}");
    }

    /// The attachments screen reports the port's own total for the pending gun and its
    /// attachments, and the money that would be left after adding it.
    ///
    /// The browser must not compute it: a gun's price is not its base price (the akimbo and
    /// full-load multipliers change it), so browser arithmetic would be wrong for exactly the
    /// weapons where it matters.
    #[test]
    fn the_attachments_screen_reports_the_ports_total_and_the_money_left() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        // The silencer and the lasersight: $900 and $800 on top of the $850 gun.
        m.dom_key_on(page::OPTIONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 2, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        // The total is the port's: $2,550, not $850 + $900 + $800 done by the browser.
        assert!(lines.contains(&"TSBUY sum 2550 27100".to_owned()), "the summary: {lines:?}");
        // And it is the port's own price for the purchase, not the gun's base price.
        assert_eq!(purchase_price(&m, 1, 1 | 2, false), 2550);
        // The summary is on the attachments screen only.
        m.dom_key_on(page::OPTIONS, 10, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        assert!(!lines.iter().any(|l| l.starts_with("TSBUY sum")), "the browse screen has no summary: {lines:?}");
    }

    /// The remove key the entry record named removes that entry: the loadout screen's cards
    /// are clickable, and the click sends the key on the remove page.
    #[test]
    fn the_remove_key_removes_the_entry_it_names() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        // Two guns: the Glock-18 (slot 2) and the Katana (slot 1).
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.current.entries.len(), super::super::buy::ENTRIES);
        let lines = m.state_lines(&r);
        let entries = dump_entries(&lines);
        let glock = entries.iter().find(|(_, _, _, _, _, _, name)| name == "Glock-18").expect("the Glock-18");
        let katana = entries.iter().find(|(_, _, _, _, _, _, name)| name == "Katana").expect("the Katana");
        assert_eq!(glock.4, 2, "the Glock-18's slot");
        assert_eq!(katana.4, 1, "the Katana's slot");
        // The remove key is the entry's own index, ten on: the port's key, and the port
        // reads it back.
        assert_eq!(glock.5, REMOVE_KEY_BASE + glock.0 as i32);
        assert_eq!(katana.5, REMOVE_KEY_BASE + katana.0 as i32);

        // The remove page is on screen wherever the loadout is: the cards are there.
        assert!(m.page_is_drawn(page::REMOVE));

        // The key the record named removes that entry, refunds it, and applies the loadout
        // that is left.
        let actions = m.dom_key_on(page::REMOVE, glock.5, &r, &mut FixedRng(vec![], 0));
        assert!(!m.current.entries.iter().any(|e| e.id == 1), "the Glock-18 is off the loadout");
        // The Katana's weapon id is 34 (id 13 is a different weapon), and it is still in it.
        assert!(m.current.entries.iter().any(|e| e.id == 34), "the Katana is still in it");
        assert_eq!(m.current.total, 2900, "and the Glock's cost is refunded");
        let cmds: Vec<&str> = actions
            .iter()
            .filter_map(|a| match a {
                Action::ServerCmd(c) => Some(c.as_str()),
                _ => None,
            })
            .collect();
        assert_eq!(cmds[0], "rst_cfg", "the loadout that is left is applied: {cmds:?}");
        assert!(!cmds[1].contains("1_0"), "and the Glock-18 is not in it: {cmds:?}");
        assert!(cmds[1].contains("34_0"), "the Katana is: {cmds:?}");

        // A key that names nothing removes nothing.
        let before = m.current.clone();
        m.dom_key_on(page::REMOVE, REMOVE_KEY_BASE - 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::REMOVE, REMOVE_KEY_BASE + super::super::buy::ENTRIES as i32, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.current, before, "nothing was removed");
    }

    /// The classic flow's entry record is untouched: four fields, and no slot and no remove
    /// key. The browser parses both shapes.
    #[test]
    fn the_classic_entry_record_is_unchanged() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..BuyMenu::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.handle_key(page::MAIN, 2, &r, &mut FixedRng(vec![], 0));
        m.handle_key(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        m.handle_key(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        m.handle_key(page::OPTIONS, 1, &r, &mut FixedRng(vec![], 0));
        let lines = m.state_lines(&r);
        assert!(lines.contains(&"TSBUY entry 0 850 10 Glock-18".to_owned()), "the classic's entry record is four fields: {lines:?}");
    }
    #[test]
    fn dbg_entries() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = modern(&r);
        m.dom_key_on(page::CATEGORY, 2, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::WEAPONS, 1, &r, &mut FixedRng(vec![], 0));
        println!("pending={} ", m.pending_weapon);
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        println!("after glock: {:?}", m.current.entries.iter().map(|e| (e.id, e.cost)).collect::<Vec<_>>());
        m.dom_key_on(page::CATEGORY, 1, &r, &mut FixedRng(vec![], 0));
        println!("melee list: {:?}", browse_items(1, &r).iter().map(|i| (i.id, i.name.clone())).collect::<Vec<_>>());
        m.dom_key_on(page::WEAPONS, 2, &r, &mut FixedRng(vec![], 0));
        println!("pending={}", m.pending_weapon);
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        println!("after katana: {:?}", m.current.entries.iter().map(|e| (e.id, e.cost)).collect::<Vec<_>>());
        for l in m.state_lines(&r) {
            println!("{l}");
        }
    }
}
