//! The modern buy flow: the loadout screen, the browse screen and the attachments screen.
//!
//! The classic canvas menu ([`super::buy`]) is the game's own and stays exactly as it is. This
//! is a SECOND flow on the same menu, the one the browser's redesigned panel drives: the same
//! prices, the same budget, the same slot pool and the same saved loadouts — organised by the
//! classic weapon slot instead of by the game's five categories.
//!
//! ## The slot
//!
//! A weapon's classic slot is [`WeaponInfo::hud`][0], the HUD grid column, 1-based. It is not a
//! new table: the data is already there, so the rail is a read and not a migration.
//!
//! | slot | holds |
//! | --- | --- |
//! | 1 | M61 Grenade, Katana, Combat Knife, Seal Knife (and the kung-fu, which is the empty id) |
//! | 2 | every pistol |
//! | 3 | every SMG |
//! | 4 | every rifle and shotgun, plus the Barrett M82A1 and the M60E3 |
//! | 5 | the akimbo weapons |
//!
//! Slot 6 is the player accessory: the game's ITEMS page, not a weapon slot.
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

use super::buy::{
    Action, BuyMenu, ENTRIES, ITEM_KEVLAR, ITEM_STEALTH, RowFlags, Rules, Rng, SAVED_CONFIGS, Screen, attachment_price, cost,
    entry_slots, key_prefix, page, restricted, slots_for,
};
use shared::weapons::{WeaponInfo, tables};

/// The five classic weapon slots.
pub const SLOT_COUNT: i32 = 5;

/// The player accessory: the ITEMS page, numbered as a sixth slot so the rail can carry it.
pub const ACCESSORY_SLOT: i32 = 6;

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

/// The slot labels.
///
/// The first four are the game's own kinds. Slot 5 is the design mockup's "Special": it holds
/// the akimbo weapons (the HUD grid's fifth column), which the mockup had wrong — the mockup
/// put the M60E3 there, and the M60E3 is slot 4.
pub fn slot_label(slot: i32) -> &'static str {
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
    let mut out: Vec<&WeaponInfo> = tables()
        .weapons()
        .filter(|w| w.hud[0] as i32 == slot && w.id != 0 && !restricted(w.id as i32, false, r))
        .collect();
    out.sort_by_key(|w| (w.hud[1], w.id));
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

/// The list the browse screen shows: the slot's weapons, or the accessory's items.
pub fn browse_items(slot: i32, r: &Rules) -> Vec<BrowseItem> {
    if slot == ACCESSORY_SLOT {
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
    slot_weapons(slot, r)
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

/// The rail: the five slots and the accessory. They are dimmed, because they answer on the
/// rail's own page — the same way a parent column's row answers on the parent's page in the
/// classic menu.
fn rail_rows() -> Vec<ModernRow> {
    (1..=ACCESSORY_SLOT)
        .map(|slot| ModernRow {
            key: slot,
            price: 0,
            flags: RowFlags { dim: true, ..Default::default() },
            page: page::CATEGORY,
            number: slot.to_string(),
            label: slot_label(slot).to_owned(),
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
/// The accessory and the actions answer on the loadout screen's page. "Clear" is the game's
/// own reset row (the MAIN page's key 4), and the panel draws the design's keycap for it.
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
        ModernRow {
            key: 4,
            price: 0,
            flags: RowFlags::default(),
            page: page::MAIN,
            number: "X".to_owned(),
            label: "#Buy_ResetConfig".to_owned(),
        },
    ]
}

/// The browse screen's own rows: the slot's weapons, with their prices, the owned mark and
/// the unaffordable mark.
fn browse_rows(b: &BuyMenu, r: &Rules) -> Vec<ModernRow> {
    let items = browse_items(b.modern_slot, r);
    let page = if b.modern_slot == ACCESSORY_SLOT { page::ITEMS } else { page::WEAPONS };
    items
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let key = i as i32 + 1;
            // An owned row is not a purchase: selecting it takes the weapon off the loadout,
            // and that costs nothing. So it is never out of reach.
            let ok = owned(b, item.id, item.item) || affordable(b, r, item.price, item.slots);
            ModernRow {
                key,
                price: item.price,
                flags: RowFlags { on: b.modern_focus == item.id, x: !ok, ..Default::default() },
                page,
                number: key_prefix(key).trim_end().to_owned(),
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
pub fn slot_records(b: &BuyMenu, r: &Rules) -> Vec<String> {
    (1..=ACCESSORY_SLOT)
        .map(|slot| {
            let (slots, count) = slot_usage(b, r, slot);
            format!("TSBUY slot {slot} {slots} {count} {}", slot_label(slot))
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
    (0..SAVED_CONFIGS)
        .map(|i| format!("TSBUY tab {i} {} {}", tab_label(i), (i == b.tab) as i32))
        .collect()
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

/// The screen's title: the loadout screen's own, the slot's label, or the gun's name.
pub fn screen_title(b: &BuyMenu) -> String {
    match b.screen {
        Screen::Loadout => "BUY MENU".to_owned(),
        Screen::Browse => slot_label(b.modern_slot).to_uppercase(),
        Screen::Attach => tables()
            .weapon(b.pending_weapon.max(0) as u8)
            .map_or_else(|| "ATTACHMENTS".to_owned(), |w| w.name.to_uppercase()),
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
        out.push(format!(
            "TSBUY row {} {} {} {} {} {}",
            row.key,
            row.price,
            row.flags.dump(),
            row.page,
            row.number,
            row.label
        ));
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
        for (key, item) in browse_items(b.modern_slot, r).iter().enumerate() {
            if owned(b, item.id, item.item) {
                // Taking a weapon off costs nothing, so an owned row is never short.
                continue;
            }
            let short = shortfall(b, r, item.price);
            if short > 0 {
                out.push(format!("TSBUY short {} {}", key + 1, short));
            }
        }
        // The owned rows: the weapons already in the loadout.
        for (key, item) in browse_items(b.modern_slot, r).iter().enumerate() {
            if owned(b, item.id, item.item) {
                out.push(format!("TSBUY owned {} 1", key + 1));
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
/// `bare` says the key was typed rather than sent with the page of a row: the panel sends a
/// bare key for the actions that are not rows (the back action), and a key with its page for
/// everything that is. That is the only thing that separates the "go back" key from the tenth
/// weapon of a long list.
pub fn key(b: &mut BuyMenu, pg: i32, key: i32, bare: bool, r: &Rules, rng: &mut dyn Rng) -> Vec<Action> {
    let mut out = Vec::new();
    // The remove page's keys run past the key alphabet: the loadout's entries are removed
    // by their own keys, and there can be more entries than the alphabet has keys.
    let max = if pg == page::REMOVE { REMOVE_KEY_BASE + ENTRIES as i32 - 1 } else { r.menu.max_key };
    if !(1..=max).contains(&key) {
        return out;
    }
    match pg {
        // The loadout screen.
        page::MAIN => match key {
            // The slots. "Clear" is the game's own reset row, the MAIN page's key 4, so the
            // slots are opened with the rail's rows (the rail's own page).
            1 | 2 | 3 | 5 => open_slot(b, key, r),
            4 => clear(b, r, &mut out),
            6 => open_accessory(b, r),
            7 => random(b, r, rng, &mut out),
            10 => {
                b.close();
                out.push(Action::Close);
            }
            _ => {}
        },
        // The rail.
        page::CATEGORY => match key {
            1..=SLOT_COUNT => open_slot(b, key, r),
            ACCESSORY_SLOT => open_accessory(b, r),
            10 => back_to_loadout(b),
            _ => {}
        },
        // The weapon list.
        page::WEAPONS => {
            if key == 10 && bare {
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
            if key == 10 {
                // Back to the slot's list.
                b.pending_weapon = -1;
                b.pending_att = 0;
                b.screen = Screen::Browse;
                b.page = page::WEAPONS;
                return out;
            }
            if key == 6 {
                commit(b, r, &mut out);
                return out;
            }
            // The attachments toggle, so a second press takes one off again.
            let bit = 1u32 << (key - 1);
            let w = tables().weapon(b.pending_weapon.max(0) as u8);
            if attachment_allowed(w, bit) {
                b.pending_att ^= bit;
            }
        }
        // The accessory's items.
        page::ITEMS => {
            if key == 10 {
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

/// Browse a slot.
fn open_slot(b: &mut BuyMenu, slot: i32, r: &Rules) {
    b.modern_slot = slot;
    b.modern_focus = focus_first(slot, r);
    b.pending_weapon = -1;
    b.pending_att = 0;
    b.screen = Screen::Browse;
    b.page = page::WEAPONS;
}

/// The list row a key names: the slot's own list, the accessory's items included.
///
/// The list is the row's list, so a key always names the row the panel drew: a restricted
/// item is not on the list, and the keys after it move up.
fn item_at(b: &BuyMenu, key: i32, r: &Rules) -> Option<BrowseItem> {
    browse_items(b.modern_slot, r).get(key as usize - 1).cloned()
}

/// Browse the player accessory (the ITEMS page).
fn open_accessory(b: &mut BuyMenu, r: &Rules) {
    b.modern_slot = ACCESSORY_SLOT;
    b.modern_focus = focus_first(ACCESSORY_SLOT, r);
    b.pending_weapon = -1;
    b.pending_att = 0;
    b.screen = Screen::Browse;
    b.page = page::ITEMS;
}

/// The first row of a slot's list: the one the screen focuses when it opens, so that
/// "Enter picks the focused row" has something to pick.
fn focus_first(slot: i32, r: &Rules) -> i32 {
    browse_items(slot, r).first().map_or(0, |item| item.id)
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
        assert_eq!(own[2].0, 4, "Clear");
        assert_eq!(own[2].4, "X", "the design's keycap for Clear");
        // The rail and the tabs are dimmed: they answer on their own pages.
        let dim: Vec<_> = rows.iter().filter(|(_, _, f, ..)| f == "dim").collect();
        assert_eq!(dim.len(), 6 + SAVED_CONFIGS, "the rail and the tabs");

        // ---- the browse screen: a slot's weapons.
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
            ["Glock-18", "SOCOM-MK23", "Desert Eagle", "Five-seveN", "Glock-20C", "Ruger-MK1", "Raging Bull", "Contender G2", "Beretta 92F"]
        );
        assert_eq!(names(3), ["Mini-Uzi", "MP5SD", "MP5K", "Skorpion", "MP7-PDW", "UMP"]);
        assert_eq!(
            names(4),
            [
                "Benelli M3", "M4A1", "AK47", "STEYR-AUG", "Barrett M82A1", "SPAS-12", "Mossberg 500", "M16A4", "M60E3", "Sawed-off",
                "USAS-12"
            ]
        );
        assert_eq!(names(5), ["Akimbo Berettas", "Akimbo MK23", "Akimbo Mini-Uzi", "Golden Colts", "Akimbo Five-seveN", "Akimbo Skorpions"]);
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
        let cmds: Vec<&str> = actions.iter().filter_map(|a| match a {
            Action::ServerCmd(c) => Some(c.as_str()),
            _ => None,
        }).collect();
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
        let cmds: Vec<&str> = actions.iter().filter_map(|a| match a {
            Action::ServerCmd(c) => Some(c.as_str()),
            _ => None,
        }).collect();
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
        m.dom_key_on(page::CATEGORY, 5, &r, &mut FixedRng(vec![], 0));
        let items = browse_items(5, &r);
        let mini_uzi = items.iter().position(|i| i.id == 16).expect("the Akimbo Mini-Uzi");
        m.dom_key_on(page::WEAPONS, mini_uzi as i32 + 1, &r, &mut FixedRng(vec![], 0));
        m.dom_key_on(page::OPTIONS, 6, &r, &mut FixedRng(vec![], 0));
        assert!(m.current.entries.iter().any(|e| e.id == 16 && !e.is_item), "the gun is in the loadout");

        // The accessory's list does not think the kevlar is owned.
        m.dom_key_on(page::CATEGORY, 6, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, ACCESSORY_SLOT);
        let lines = m.state_lines(&r);
        assert!(!lines.iter().any(|l| l.starts_with("TSBUY owned")), "the accessory's items are not owned: {lines:?}");
        // And the gun's own row still is.
        m.dom_key_on(page::CATEGORY, 5, &r, &mut FixedRng(vec![], 0));
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
        m.dom_key_on(page::CATEGORY, ACCESSORY_SLOT, &r, &mut FixedRng(vec![], 0));
        assert_eq!(m.modern_slot, ACCESSORY_SLOT);
        let items = browse_items(ACCESSORY_SLOT, &r);
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
        let knife_key = browse_items(1, &r)
            .iter()
            .position(|i| i.name == "Combat Knife")
            .expect("the knife is in slot 1's list") as i32
            + 1;
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
        let cmds: Vec<&str> = actions.iter().filter_map(|a| match a {
            Action::ServerCmd(c) => Some(c.as_str()),
            _ => None,
        }).collect();
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
        assert!(
            lines.contains(&"TSBUY entry 0 850 10 Glock-18".to_owned()),
            "the classic's entry record is four fields: {lines:?}"
        );
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
        for l in m.state_lines(&r) { println!("{l}"); }
    }
}
