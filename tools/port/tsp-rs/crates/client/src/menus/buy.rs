//! TS buy menu (`CTSBuyMenu`, embedded in `CHudTSWeapons` at 0x100d1460): an immediate-mode page
//! machine drawn with `FillRGBA`/`DrawHudString`, digit keys through `slotN`, mouse clicks through
//! `IN_MouseEvent`. Saved loadouts live in `<gamedir>/tsbuylist.tsa` (nine 0x408-byte configs).
//! Reference: architecture-hud.md §6.2; decomp `unnamed_100337f0.c` 10036200..100398e0.

use shared::weapons::tables;

pub const CONFIG_SIZE: usize = 0x408;
pub const SAVED_CONFIGS: usize = 9;
pub const ENTRIES: usize = 16;
/// The money a menu that isn't `CashBased()` spends (`FUN_10036640`).
pub const CASH: i32 = 30000;
/// `FUN_10036660`: inventory slots.
pub const SLOTS: i32 = 0x51;

pub const ITEM_KEVLAR: i32 = 0x10;
pub const ITEM_STEALTH: i32 = 0x20;

/// One loadout entry (0x38 bytes at config+0x80).
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct Entry {
    /// +0x00: item (kevlar/stealth shoes) rather than a weapon.
    pub is_item: bool,
    /// +0x04: weapon id, or item bits.
    pub id: i32,
    /// +0x08: attachment bits.
    pub att: u32,
    /// +0x0c: price of this entry.
    pub cost: i32,
    /// +0x30: bought as akimbo.
    pub akimbo: bool,
    /// +0x34: count for stackables (grenades, knives).
    pub count: i32,
}

/// One loadout (`0x408` bytes): ammo {rounds, buys} per type, 16 entries, total cost, slots used.
#[derive(Debug, Clone, PartialEq)]
pub struct Config {
    pub ammo: [(i32, i32); 16],
    pub entries: [Entry; ENTRIES],
    pub total: i32,
    pub slots: i32,
}

impl Default for Config {
    fn default() -> Self {
        Config { ammo: [(0, 0); 16], entries: [Entry::default(); ENTRIES], total: 0, slots: 0 }
    }
}

/// A little-endian int at `o`, 0 past the end.
fn rd(b: &[u8], o: usize) -> i32 {
    b.get(o..o + 4).and_then(|s| s.try_into().ok()).map_or(0, i32::from_le_bytes)
}
fn wr(b: &mut [u8], o: usize, v: i32) {
    b[o..o + 4].copy_from_slice(&v.to_le_bytes());
}

impl Config {
    pub fn from_bytes(b: &[u8]) -> Self {
        let mut c = Config::default();
        if b.len() < CONFIG_SIZE {
            return c;
        }
        for (i, a) in c.ammo.iter_mut().enumerate() {
            *a = (rd(b, i * 8), rd(b, i * 8 + 4));
        }
        for (i, e) in c.entries.iter_mut().enumerate() {
            let o = 0x80 + i * 0x38;
            *e = Entry {
                is_item: b.get(o).is_some_and(|&v| v != 0),
                id: rd(b, o + 4),
                att: rd(b, o + 8) as u32,
                cost: rd(b, o + 0xc),
                akimbo: b.get(o + 0x30).is_some_and(|&v| v != 0),
                count: rd(b, o + 0x34),
            };
        }
        c.total = rd(b, 0x400);
        c.slots = rd(b, 0x404);
        c
    }

    pub fn to_bytes(&self) -> [u8; CONFIG_SIZE] {
        let mut b = [0u8; CONFIG_SIZE];
        for (i, a) in self.ammo.iter().enumerate() {
            wr(&mut b, i * 8, a.0);
            wr(&mut b, i * 8 + 4, a.1);
        }
        for (i, e) in self.entries.iter().enumerate() {
            let o = 0x80 + i * 0x38;
            b[o] = e.is_item as u8;
            wr(&mut b, o + 4, e.id);
            wr(&mut b, o + 8, e.att as i32);
            wr(&mut b, o + 0xc, e.cost);
            b[o + 0x30] = e.akimbo as u8;
            wr(&mut b, o + 0x34, e.count);
        }
        wr(&mut b, 0x400, self.total);
        wr(&mut b, 0x404, self.slots);
        b
    }
}

/// Parse `tsbuylist.tsa`: up to nine configs back to back.
pub fn parse_buylist(bytes: &[u8]) -> [Config; SAVED_CONFIGS] {
    std::array::from_fn(|i| bytes.get(i * CONFIG_SIZE..(i + 1) * CONFIG_SIZE).map(Config::from_bytes).unwrap_or_default())
}

pub fn write_buylist(saved: &[Config; SAVED_CONFIGS]) -> Vec<u8> {
    saved.iter().flat_map(|c| c.to_bytes()).collect()
}

/// What the gameplay ruleset decides about the menu
/// ([`ClientRules::buy_menu`](crate::gameplay::ClientRules::buy_menu)). The default is TS 3.0's.
#[derive(Debug, Clone, Copy)]
pub struct MenuRules {
    /// The handgun category (`Init` 10036200, column 0 of [`table`]).
    pub handguns: &'static [i32],
    /// `RandomConfig`'s pistols (`(id, may be akimbo)`), picked with `rand(from, from + len − 1)`.
    pub random_pistols: &'static [(i32, bool)],
    pub random_pistols_from: i32,
    /// Kevlar takes 10 slots, and items go through the slot check.
    pub items_use_slots: bool,
    /// The items page ("6 Player Accessory") only opens when `m_Teamplay > 1`.
    pub items_need_teamplay: bool,
    /// Stealth shoes are restricted when `m_Teamplay < 2`.
    pub stealth_needs_teamplay: bool,
    /// `cl_buykevlar` puts kevlar in a reset (and random) config.
    pub kevlar_cvar: bool,
    /// `add` buys a gun with no akimbo version (and not stackable) as a single one, whatever
    /// `full` says.
    pub akimbo_fixup: bool,
    /// The highest key `HandleKey` takes (11 = the `a` key).
    pub max_key: i32,
    /// Fixed menu text in place of `titles.txt`: each `#key` the menu draws or prints and its
    /// text ([`FixedTitles`]). `None` (TS 3.0) localises through the engine's titles.
    pub text: Option<&'static [(&'static str, &'static str)]>,
    /// The items page's rows are red by money only (TS 3.0 also tests the slots).
    pub items_red_by_cash_only: bool,
    /// The category column's mouse rows: `(m_Teamplay != 0) + 5` category rows before "back"
    /// (TS 3.0: always 6, the five categories and "Player Accessory").
    pub category_rows_by_teamplay: bool,
    /// Centre-printed when a click finds no row and leaves the page unset ([`Hit::Unset`]).
    /// TS 3.0 prints nothing.
    pub hole_message: Option<&'static str>,
    /// The summary writes an item's name (Kevlar, Stealth Shoes) in the halved HUD colour, never
    /// red. TS 3.0 (`0x10036af0`) uses the full HUD colour, or red when the item is restricted.
    pub summary_items_dim: bool,
    /// `Open` refuses during demo playback (TS 3.0 `0x10036670`). TS 2.1's (`0x1006b3f0`) doesn't
    /// check, and neither do its callers (`buy` `0x1008db00`, `Spectator` `0x100b28c0`), so a
    /// played-back demo opens it when the recorded player becomes an observer.
    pub refused_in_demo: bool,
}

impl Default for MenuRules {
    fn default() -> Self {
        MenuRules {
            handguns: &[1, 9, 12, 14, 2, 21, 22, 28, 31, 36],
            random_pistols: &[
                (36, false),
                (1, false),
                (9, true),
                (12, false),
                (14, true),
                (2, true),
                (21, false),
                (22, false),
                (28, false),
                (31, false),
            ],
            random_pistols_from: 0,
            items_use_slots: true,
            items_need_teamplay: false,
            stealth_needs_teamplay: true,
            kevlar_cvar: true,
            akimbo_fixup: true,
            max_key: 11,
            text: None,
            items_red_by_cash_only: false,
            category_rows_by_teamplay: false,
            hole_message: None,
            summary_items_dim: false,
            refused_in_demo: true,
        }
    }
}

/// Whether `Open` goes ahead: never during demo playback if the menu refuses it
/// ([`MenuRules::refused_in_demo`]).
pub fn opens(m: &MenuRules, demo_playing: bool) -> bool {
    !(demo_playing && m.refused_in_demo)
}

/// The colour of an item's name in the summary (`FUN_10036af0`'s item branch, TS 2.1
/// `0x1006b9a0`): see [`MenuRules::summary_items_dim`].
pub fn summary_item_rgb(id: i32, r: &Rules, hud: [i32; 3]) -> [i32; 3] {
    if r.menu.summary_items_dim {
        crate::hud::draw::half(hud)
    } else if restricted(id, true, r) {
        RED
    } else {
        hud
    }
}

/// `FUN_10036640`: the money the menu spends, `TSCash` when `CashBased()`
/// ([`ClientRules::buy_cash_based`](crate::gameplay::ClientRules::buy_cash_based), never in TS
/// 3.0), else [`CASH`].
pub fn cash(cash_based: bool, tscash: i32) -> i32 {
    if cash_based { tscash } else { CASH }
}

/// A ruleset's fixed menu text ([`MenuRules::text`]) as titles: a `#key` with no entry is left
/// as it is.
pub struct FixedTitles(pub &'static [(&'static str, &'static str)]);

impl crate::hud::text::Titles for FixedTitles {
    fn get(&self, key: &str) -> Option<String> {
        self.0.iter().find(|(k, _)| *k == key).map(|(_, t)| (*t).to_owned())
    }
}

/// The menu's text for `msg`, its `#key`s replaced: from the ruleset's fixed text, else from
/// `titles` (the engine's).
pub fn text(m: &MenuRules, titles: &dyn crate::hud::text::Titles, msg: &str) -> String {
    match m.text {
        Some(t) => crate::hud::text::localise_with(&FixedTitles(t), msg),
        None => crate::hud::text::localise_with(titles, msg),
    }
}

/// Server settings the menu depends on.
#[derive(Debug, Clone, Copy)]
pub struct Rules {
    /// `m_Teamplay` (GameMode): grenades and stealth shoes need > 1.
    pub gamemode: i32,
    /// `SrvSett` 3 weapon restriction mask.
    pub restriction: i32,
    /// `SrvSett` 2 `ammocount` column.
    pub ammocount: i32,
    /// `cl_buykevlar`: a reset config starts with kevlar.
    pub buy_kevlar: bool,
    /// The money the menu spends ([`cash`]).
    pub cash: i32,
    /// `CashBased()`: the summary shows the money left ([`cash`]).
    pub cash_based: bool,
    pub menu: MenuRules,
}

impl Default for Rules {
    fn default() -> Self {
        // The mask (`0x1018d174`) is zero until `SrvSett 3` arrives, so every weapon starts
        // restricted, as in TS.
        Rules { gamemode: 0, restriction: 0, ammocount: 0, buy_kevlar: true, cash: CASH, cash_based: false, menu: MenuRules::default() }
    }
}

/// `FUN_1000b6d0`: is the weapon blocked by the restriction mask? Ids 1..37 only; mask 0 blocks
/// all of them. The weapon type is `FUN_1000b670`'s: katana → knife, sawed-off → shotgun, akimbo
/// Uzi/Skorpion → SMG, the other akimbos and the Golden Colts → pistol, else the weapon table's
/// kind, which is the server's `GetWeaponType`/`IsRestrictedWeapon` too.
pub fn weapon_restricted(id: i32, mask: i32) -> bool {
    (1..38).contains(&id) && shared::weapons::is_restricted(id as u8, mask as u32)
}

/// `FUN_100365e0`: restricted for buying.
pub fn restricted(id: i32, item: bool, r: &Rules) -> bool {
    if !item {
        weapon_restricted(id, r.restriction) || (r.gamemode < 2 && id == 24)
    } else {
        r.menu.stealth_needs_teamplay && r.gamemode < 2 && id & ITEM_STEALTH != 0
    }
}

fn att_price(att: u32) -> i32 {
    shared::weapons::attachments_price(att)
}

/// The price of one attachment (the `attachment_price` table): the silencer, the laser, the
/// flashlight and the scope. The menu's options column shows these prices, and they are the
/// runtime tables' numbers, never a constant.
pub fn attachment_price(bit: u32) -> i32 {
    shared::weapons::attachment_price(bit)
}

/// `FUN_10012ad0`: price of an entry.
pub fn cost(id: i32, att: u32, full: bool, item: bool) -> i32 {
    if item {
        return if id & ITEM_KEVLAR != 0 {
            1900
        } else if id & ITEM_STEALTH != 0 {
            700
        } else {
            full as i32
        };
    }
    let Some(w) = tables().weapon(id as u8) else { return 0 };
    if w.stack {
        return w.cost * if full { w.pellets } else { 1 };
    }
    w.cost * (full as i32 + 1) + att_price(att)
}

/// `FUN_10038dc0`: inventory slots an entry takes.
pub fn slots_for(id: i32, full: bool, item: bool, r: &Rules) -> i32 {
    if item {
        return if id & ITEM_KEVLAR != 0 && r.menu.items_use_slots { 10 } else { 0 };
    }
    let Some(w) = tables().weapon(id as u8) else { return 0 };
    if !full {
        w.slots
    } else if !w.stack {
        w.slots * 2
    } else {
        w.pellets * w.slots
    }
}

/// Ammo type limits under the current `ammocount`: `FUN_100072c0` switches to column 1, 2 or 3
/// for those values and fills column 0's for any other, 4 and above or negative included
/// (issue #108).
fn ammo_max(t: usize, r: &Rules) -> i32 {
    let column = if (1..=3).contains(&r.ammocount) { r.ammocount as usize } else { 0 };
    tables().ammo(t as u8).map_or(0, |a| a.max_carry[column])
}

/// Things the menu asks the HUD to do.
#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    ServerCmd(String),
    /// `AddTSMessage(text, rgb, 2 s, flags 0)`; rgb (0,0,0) = HUD colour.
    Message(String, [i32; 3]),
    /// Like `Message`, with the titles.txt format string's `%s`/`%i` argument.
    MessageArg(String, String, [i32; 3]),
    Close,
    SaveFile,
}

const RED: [i32; 3] = [195, 45, 45];

/// What [`BuyMenu::hit_test`] found under the mouse.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Hit {
    /// A row: `HandleKey(page, key)`.
    Row(i32, i32),
    /// No row (`-1`): TS's left click then acts as key 1 on the current page.
    Miss,
    /// A path where TS returns without writing the page, leaving an uninitialised stack value
    /// (a full sixteen-entry remove list, or a weapon column with no end marker). The port does
    /// nothing.
    Unset,
}

/// Pages (`+0x04`).
pub mod page {
    pub const MAIN: i32 = 0;
    pub const CATEGORY: i32 = 1;
    pub const WEAPONS: i32 = 2;
    pub const OPTIONS: i32 = 3;
    pub const ITEMS: i32 = 4;
    pub const REMOVE: i32 = 5;
    pub const SAVE: i32 = 6;
    pub const LOAD: i32 = 7;
    pub const TEAM: i32 = 8;
}

/// Category table (`+0x2d6c`, 12 rows × 5 categories, set in `Init` 10036200). The handguns
/// are the ruleset's ([`MenuRules::handguns`]).
pub fn table(m: &MenuRules) -> [[i32; 5]; 12] {
    let mut t = [[-1; 5]; 12];
    let cols: [&[i32]; 5] = [m.handguns, &[3, 6, 7, 17, 19, 23], &[5, 13, 15, 27, 18], &[4, 11, 20, 26, 33], &[24, 25, 32, 34, 35]];
    for (c, col) in cols.iter().enumerate() {
        for (row, &id) in col.iter().take(12).enumerate() {
            t[row][c] = id;
        }
    }
    t
}

/// Category names (`Init` 10036200; `#Buy_SMGs` is at `0x10094dd0`).
pub const CATEGORIES: [&str; 5] = ["#Buy_Handguns", "#Buy_SMGs", "#Buy_Rifles", "#Buy_Shotguns", "#Buy_SpecialPurpose"];

// ---- the rows: what the canvas draws and what the state dump reports --------------------------------

/// A column of the buy menu. The canvas draws the columns at fixed x positions, and a column's
/// keys act on its own page ([`Column::page`]): the mouse's hit test answers with that page, and
/// the browser's DOM menu sends its rows' keys on it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Column {
    /// The main page's column (x 8): use the config, buy, remove, reset, save, load, random.
    Main,
    /// The category column (0x88): the five weapon categories and the player accessory.
    Category,
    /// The weapon column (0x108): the chosen category's weapons.
    Weapons,
    /// The items column (0x108): kevlar and the stealth shoes.
    Items,
    /// The options column (0x188): buy, the attachment toggles, akimbo or a full load.
    Options,
    /// The remove column (0x88): the config's entries.
    Remove,
    /// The save column (0x88): the nine saved slots.
    Save,
    /// The load column (0x88): the nine saved slots.
    Load,
    /// The team column (x 8): the team menu's own rows.
    Team,
}

impl Column {
    /// Where the canvas draws the column.
    pub fn x(self) -> i32 {
        match self {
            Column::Main | Column::Team => 8,
            Column::Category | Column::Remove | Column::Save | Column::Load => 0x88,
            Column::Weapons | Column::Items => 0x108,
            Column::Options => 0x188,
        }
    }

    /// The page whose keys the column answers for.
    pub fn page(self) -> i32 {
        match self {
            Column::Main => page::MAIN,
            Column::Category => page::CATEGORY,
            Column::Weapons => page::WEAPONS,
            Column::Items => page::ITEMS,
            Column::Options => page::OPTIONS,
            Column::Remove => page::REMOVE,
            Column::Save => page::SAVE,
            Column::Load => page::LOAD,
            Column::Team => page::TEAM,
        }
    }
}

/// The columns the canvas draws for a page, in the order it draws them (the children first: a
/// page's own column, then the columns it was reached from).
pub fn columns(pg: i32) -> &'static [Column] {
    match pg {
        page::TEAM => &[Column::Team],
        page::OPTIONS => &[Column::Options, Column::Weapons, Column::Category, Column::Main],
        page::WEAPONS => &[Column::Weapons, Column::Category, Column::Main],
        page::ITEMS => &[Column::Items, Column::Category, Column::Main],
        page::CATEGORY => &[Column::Category, Column::Main],
        page::REMOVE => &[Column::Remove, Column::Main],
        page::SAVE => &[Column::Save, Column::Main],
        page::LOAD => &[Column::Load, Column::Main],
        _ => &[Column::Main],
    }
}

/// The column a page's own rows are in: the rows a key on that page acts on.
pub fn own_column(pg: i32) -> Column {
    match pg {
        page::CATEGORY => Column::Category,
        page::WEAPONS => Column::Weapons,
        page::OPTIONS => Column::Options,
        page::ITEMS => Column::Items,
        page::REMOVE => Column::Remove,
        page::SAVE => Column::Save,
        page::LOAD => Column::Load,
        page::TEAM => Column::Team,
        _ => Column::Main,
    }
}

/// A row's flags: what the state dump reports and what the browser's DOM menu renders.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct RowFlags {
    /// The row is the selected one: the pending weapon, the chosen category, an attachment
    /// that is already on.
    pub on: bool,
    /// The row is drawn at half brightness: it belongs to a parent column, so it is not the
    /// page's own row.
    pub dim: bool,
    /// The row costs more than the budget allows.
    pub x: bool,
    /// The row is a header: it takes no key.
    pub sep: bool,
}

impl RowFlags {
    /// The flags as the state dump prints them: `0`, or a `+`-joined set.
    pub fn dump(self) -> String {
        let mut v: Vec<&str> = Vec::new();
        if self.on {
            v.push("on");
        }
        if self.dim {
            v.push("dim");
        }
        if self.x {
            v.push("x");
        }
        if self.sep {
            v.push("sep");
        }
        if v.is_empty() { "0".to_owned() } else { v.join("+") }
    }
}

/// The colour a row is drawn in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RowColor {
    /// The HUD's half colour: an ordinary row.
    Hud,
    /// Green: a row that works.
    Good,
    /// Red: a row that does not work (unaffordable, empty, restricted).
    Bad,
    /// The back colour: "go back" and "cancel".
    Back,
}

/// How a row's text is put together.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Text {
    /// The key, then the label: "1 #Buy_Buy".
    Keyed,
    /// The key, the label and the price: "1 Kevlar  1900".
    Priced,
    /// The label with the row's key as its number: the saved slots' titles ("Slot %i Empty").
    Numbered,
    /// The row's number in decimal, then the label: the remove column's entries
    /// ("10 Glock-18"). The remove column numbers its entries 1…16, past the key
    /// alphabet's "A".
    Decimal,
}

/// One row of the buy menu: what the canvas draws and what the state dump reports. The rows are
/// built once ([`column_rows`]) and consumed twice: the canvas draws them and the state dump
/// reports them, so the two can never disagree.
#[derive(Debug, Clone, PartialEq)]
pub struct Row {
    /// The column the row is in.
    pub column: Column,
    /// The key the row answers to (1..=11; 0 = the row takes no key).
    pub key: i32,
    /// The row's label: a `#Buy_…` title key, or the text the menu draws.
    pub label: String,
    /// What the row costs (0 = it costs nothing: a category row, a navigation row).
    pub price: i32,
    /// The row's flags.
    pub flags: RowFlags,
    /// The colour the row is drawn in.
    pub color: RowColor,
    /// How the row's text is put together.
    pub text: Text,
    /// The weapon or item the row is about (0 = none).
    pub id: i32,
}

impl Row {
    /// The number the canvas draws before the row's label: the key's own prefix ("1", "0",
    /// "A"), the entry's number in the remove column ("10"), or nothing when the number is
    /// part of the title (the saved slots).
    pub fn number(&self) -> String {
        match self.text {
            Text::Keyed | Text::Priced => key_prefix(self.key).trim_end().to_owned(),
            Text::Decimal => self.key.to_string(),
            Text::Numbered => String::new(),
        }
    }
}

/// The key a row's text starts with: "1 ".."9 ", "0 " for ten, "A " for eleven, and nothing for
/// a row that takes no key.
pub fn key_prefix(key: i32) -> &'static str {
    match key {
        1..=9 => ["1 ", "2 ", "3 ", "4 ", "5 ", "6 ", "7 ", "8 ", "9 "][(key - 1) as usize],
        10 => "0 ",
        11 => "A ",
        _ => "",
    }
}

/// The text a row is drawn with: the ruleset's own text for the label, with the key and the
/// price as the canvas draws them.
pub fn row_text(row: &Row, r: &Rules, titles: &dyn crate::hud::text::Titles) -> String {
    match row.text {
        Text::Keyed => text(&r.menu, titles, &format!("{}{}", key_prefix(row.key), row.label)),
        Text::Priced => text(&r.menu, titles, &format!("{}{}  {}", key_prefix(row.key), row.label, row.price)),
        // The remove column numbers its entries in decimal, not in the key alphabet.
        Text::Decimal => text(&r.menu, titles, &format!("{} {}", row.key, row.label)),
        // The saved slots' titles carry their own number ("Slot %i Empty"), so the title is
        // resolved first and the number formatted into it after.
        Text::Numbered => {
            let f = crate::hud::text::format(&text(&r.menu, titles, &row.label), &[crate::hud::text::Arg::I(row.key as i64)]);
            text(&r.menu, titles, &f)
        }
    }
}

/// Can the menu still afford this entry? The canvas's own test: the cost and the slots on top
/// of what the config already holds.
fn affordable(cost: i32, slots: i32, cur: &Config, r: &Rules) -> bool {
    cost.wrapping_add(cur.total) <= r.cash && slots.wrapping_add(cur.slots) <= SLOTS
}

/// The "go back" row every page's own column ends with.
fn back_row(column: Column) -> Row {
    Row {
        column,
        key: 10,
        label: "#Buy_GoBack".into(),
        price: 0,
        flags: RowFlags::default(),
        color: RowColor::Back,
        text: Text::Keyed,
        id: 0,
    }
}

/// The options column: buy the pending weapon, the attachment toggles, and akimbo or a full
/// load.
fn options_rows(b: &BuyMenu, r: &Rules) -> Vec<Row> {
    let cur = &b.current;
    let id = b.pending_weapon;
    let base = cost(id, b.pending_att, false, false);
    let mut rows = Vec::new();
    let ok = affordable(base, slots_for(id, false, false, r), cur, r);
    rows.push(Row {
        column: Column::Options,
        key: 1,
        label: "#Buy_Buy".into(),
        price: base,
        flags: RowFlags { x: !ok, ..Default::default() },
        color: if ok { RowColor::Good } else { RowColor::Bad },
        text: Text::Keyed,
        id,
    });
    let labels = ["#HUD_Silencer", "#HUD_Lasersight", "#HUD_Flashlight", "#HUD_Scope"];
    for bit in 0..4u32 {
        if !b.attachment_allowed(1 << bit) {
            continue;
        }
        // The label shows the attachment's own price; the colour tests base + attachment.
        let price = attachment_price(1 << bit);
        let total = base.wrapping_add(price);
        let ok = total.wrapping_add(cur.total) <= r.cash;
        rows.push(Row {
            column: Column::Options,
            key: bit as i32 + 2,
            label: labels[bit as usize].into(),
            price,
            flags: RowFlags { on: b.pending_att & (1 << bit) != 0, x: !ok, ..Default::default() },
            color: if ok { RowColor::Hud } else { RowColor::Bad },
            text: Text::Priced,
            id: 0,
        });
    }
    if let Some(w) = tables().weapon(id.max(0) as u8) {
        if w.akimbo != -1 {
            let price = cost(id, b.pending_att, true, false);
            let ok = affordable(price, w.slots * 2, cur, r);
            rows.push(Row {
                column: Column::Options,
                key: 6,
                label: "#Buy_Akimbo".into(),
                price,
                flags: RowFlags { x: !ok, ..Default::default() },
                color: if ok { RowColor::Good } else { RowColor::Bad },
                text: Text::Keyed,
                id,
            });
        } else if w.stack {
            let price = cost(id, 0, true, false);
            let ok = affordable(price, w.slots * w.pellets, cur, r);
            rows.push(Row {
                column: Column::Options,
                key: 6,
                label: "#Buy_FullLoad".into(),
                price,
                flags: RowFlags { x: !ok, ..Default::default() },
                color: if ok { RowColor::Good } else { RowColor::Bad },
                text: Text::Keyed,
                id,
            });
        }
    }
    rows.push(back_row(Column::Options));
    rows
}

/// The weapon column: the chosen category's weapons. A restricted weapon is not drawn at all
/// (TS hides it, it does not grey it out).
fn weapons_rows(b: &BuyMenu, r: &Rules) -> Vec<Row> {
    let cur = &b.current;
    let mut rows = Vec::new();
    for row in 0..12 {
        let id = table(&r.menu)[row][b.category.clamp(0, 4) as usize];
        if id == -1 || restricted(id, false, r) {
            continue;
        }
        let Some(w) = tables().weapon(id as u8) else { continue };
        // The tenth row onwards is the `a` key (the eleventh), as the mouse's hit test has it.
        let key = if row < 9 { row as i32 + 1 } else { 11 };
        let ok = affordable(w.cost, w.slots, cur, r);
        // `0x10037ad4`: full brightness on the weapon page and for the chosen weapon.
        let dim = b.page != page::WEAPONS && id != b.pending_weapon;
        rows.push(Row {
            column: Column::Weapons,
            key,
            label: w.name.clone(),
            price: w.cost,
            flags: RowFlags { on: id == b.pending_weapon, dim, x: !ok, sep: false },
            color: if ok { RowColor::Hud } else { RowColor::Bad },
            text: Text::Keyed,
            id,
        });
    }
    if b.page == page::WEAPONS {
        rows.push(back_row(Column::Weapons));
    }
    rows
}

/// The items column: kevlar and the stealth shoes.
fn items_rows(b: &BuyMenu, r: &Rules) -> Vec<Row> {
    let cur = &b.current;
    let mut rows = Vec::new();
    for (key, id, label) in [(1i32, ITEM_KEVLAR, "Kevlar"), (2, ITEM_STEALTH, "Stealth Shoes")] {
        if restricted(id, true, r) {
            continue;
        }
        let price = shared::weapons::item_price(id);
        let slots = slots_for(id, false, true, r);
        let ok = if r.menu.items_red_by_cash_only { price.wrapping_add(cur.total) <= r.cash } else { affordable(price, slots, cur, r) };
        rows.push(Row {
            column: Column::Items,
            key,
            label: label.into(),
            price,
            flags: RowFlags { x: !ok, ..Default::default() },
            color: if ok { RowColor::Hud } else { RowColor::Bad },
            text: Text::Priced,
            id,
        });
    }
    rows.push(back_row(Column::Items));
    rows
}

/// The category column: the five weapon categories and the player accessory.
fn category_rows(b: &BuyMenu, r: &Rules) -> Vec<Row> {
    let mut rows = Vec::new();
    for (i, name) in CATEGORIES.iter().enumerate() {
        // `0x1003788c`: the chosen category keeps full brightness.
        let dim = b.page != page::CATEGORY && i as i32 != b.category;
        rows.push(Row {
            column: Column::Category,
            key: i as i32 + 1,
            label: (*name).into(),
            price: 0,
            // The chosen category is in the state record (`cat`), not in a flag.
            flags: RowFlags { on: false, dim, x: false, sep: false },
            color: RowColor::Hud,
            text: Text::Keyed,
            id: 0,
        });
    }
    if !r.menu.items_need_teamplay || r.gamemode > 1 {
        rows.push(Row {
            column: Column::Category,
            key: 6,
            label: "#Buy_PlayerAccessory".into(),
            price: 0,
            // The accessory row is in the category column, so it takes the column's dim: half
            // brightness on every page but CATEGORY.
            flags: RowFlags { dim: b.page != page::CATEGORY, ..Default::default() },
            color: RowColor::Hud,
            text: Text::Keyed,
            id: 0,
        });
    }
    if b.page == page::CATEGORY {
        rows.push(back_row(Column::Category));
    }
    rows
}

/// The remove column: the config's entries, in the order they are in it.
fn remove_rows(b: &BuyMenu, _r: &Rules) -> Vec<Row> {
    let mut rows = Vec::new();
    for (i, e) in b.current.entries.iter().enumerate().filter(|(_, e)| e.id != 0) {
        rows.push(Row {
            column: Column::Remove,
            key: i as i32 + 1,
            label: BuyMenu::entry_name(e),
            price: e.cost,
            flags: RowFlags::default(),
            color: RowColor::Hud,
            text: Text::Decimal,
            id: e.id,
        });
    }
    rows.push(back_row(Column::Remove));
    rows
}

/// The save and load columns: the nine saved slots.
fn saved_rows(b: &BuyMenu, r: &Rules, save: bool) -> Vec<Row> {
    let column = if save { Column::Save } else { Column::Load };
    let mut rows = vec![Row {
        column,
        key: 0,
        label: if save { "#Buy_SaveEquipment".into() } else { "#Buy_LoadEquipment".into() },
        price: 0,
        flags: RowFlags { sep: true, ..Default::default() },
        color: RowColor::Good,
        text: Text::Keyed,
        id: 0,
    }];
    for (i, s) in b.saved.iter().enumerate() {
        let label = if s.total < 1 { "#Buy_SlotEmpty" } else { "#Buy_SlotAvailable" };
        let red = !save && s.total > r.cash;
        rows.push(Row {
            column,
            key: i as i32 + 1,
            label: label.into(),
            price: 0,
            flags: RowFlags { x: red, ..Default::default() },
            color: if red { RowColor::Bad } else { RowColor::Hud },
            text: Text::Numbered,
            id: 0,
        });
    }
    rows.push(back_row(column));
    rows
}

/// The main column: use the config, buy, remove, reset, save, load, random and cancel.
fn main_rows(b: &BuyMenu, r: &Rules) -> Vec<Row> {
    let cur = &b.current;
    // The main column is the parent of every other page, so it is dimmed on them.
    let dim = b.page != page::MAIN;
    let mut rows = Vec::new();
    if cur.total < 1 {
        rows.push(Row {
            column: Column::Main,
            key: 1,
            label: "#Buy_EmptyConfig".into(),
            price: 0,
            flags: RowFlags { dim, ..Default::default() },
            color: RowColor::Bad,
            text: Text::Keyed,
            id: 0,
        });
    } else {
        let label = if b.new_config { "#Buy_UseNewConfig" } else { "#Buy_UseLastConfig" };
        let red = r.cash.wrapping_sub(cur.total) < 0;
        rows.push(Row {
            column: Column::Main,
            key: 1,
            label: label.into(),
            price: 0,
            flags: RowFlags { dim, x: red, ..Default::default() },
            color: if red { RowColor::Bad } else { RowColor::Good },
            text: Text::Keyed,
            id: 0,
        });
    }
    for (key, label) in [(2, "#Buy_Buy"), (3, "#Buy_RemoveItem"), (4, "#Buy_ResetConfig"), (5, "#Buy_SaveConfig"), (6, "#Buy_LoadConfig")] {
        rows.push(Row {
            column: Column::Main,
            key,
            label: label.into(),
            price: 0,
            flags: RowFlags { dim, ..Default::default() },
            color: RowColor::Hud,
            text: Text::Keyed,
            id: 0,
        });
    }
    rows.push(Row {
        column: Column::Main,
        key: 7,
        label: "#Buy_Random".into(),
        price: 0,
        flags: RowFlags { dim, ..Default::default() },
        color: RowColor::Good,
        text: Text::Keyed,
        id: 0,
    });
    if b.page == page::MAIN {
        rows.push(Row {
            column: Column::Main,
            key: 10,
            label: "#Buy_Cancel".into(),
            price: 0,
            flags: RowFlags::default(),
            color: RowColor::Back,
            text: Text::Keyed,
            id: 0,
        });
    }
    rows
}

/// The team column: the team menu's own rows.
fn team_rows() -> Vec<Row> {
    vec![
        Row {
            column: Column::Team,
            key: 0,
            label: "#Chg_ChangeTeam".into(),
            price: 0,
            flags: RowFlags { sep: true, ..Default::default() },
            color: RowColor::Good,
            text: Text::Keyed,
            id: 0,
        },
        Row {
            column: Column::Team,
            key: 1,
            label: "#Chg_Join Specialists".into(),
            price: 0,
            flags: RowFlags::default(),
            color: RowColor::Hud,
            text: Text::Keyed,
            id: 0,
        },
        Row {
            column: Column::Team,
            key: 2,
            label: "#Chg_Join Mercenaries".into(),
            price: 0,
            flags: RowFlags::default(),
            color: RowColor::Hud,
            text: Text::Keyed,
            id: 0,
        },
        Row {
            column: Column::Team,
            key: 10,
            label: "#Chg_Cancel".into(),
            price: 0,
            flags: RowFlags::default(),
            color: RowColor::Back,
            text: Text::Keyed,
            id: 0,
        },
    ]
}

/// The rows of one column, for the menu's current state. The canvas draws these and the state
/// dump reports them: one source of truth, so the two can never disagree.
pub fn column_rows(b: &BuyMenu, r: &Rules, column: Column) -> Vec<Row> {
    match column {
        Column::Options => options_rows(b, r),
        Column::Weapons => weapons_rows(b, r),
        Column::Items => items_rows(b, r),
        Column::Category => category_rows(b, r),
        Column::Remove => remove_rows(b, r),
        Column::Save => saved_rows(b, r, true),
        Column::Load => saved_rows(b, r, false),
        Column::Main => main_rows(b, r),
        Column::Team => team_rows(),
    }
}

/// The title key of a page: the browser's DOM menu resolves it through the engine's titles.
pub fn page_title(pg: i32) -> &'static str {
    match pg {
        page::MAIN => "#Buy_MAIN",
        page::CATEGORY => "#Buy_CATEGORY",
        page::WEAPONS => "#Buy_WEAPONS",
        page::OPTIONS => "#Buy_OPTIONS",
        page::ITEMS => "#Buy_ITEMS",
        page::REMOVE => "#Buy_REMOVE",
        page::SAVE => "#Buy_SAVE",
        page::LOAD => "#Buy_LOAD",
        page::TEAM => "#Buy_TEAM",
        _ => "#Buy_MAIN",
    }
}

/// The slots an entry takes: the same count the menu's own slot check uses
/// ([`slots_for`], with the entry's own count or akimbo flag).
pub fn entry_slots(e: &Entry, r: &Rules) -> i32 {
    if e.is_item {
        return if e.id & ITEM_KEVLAR != 0 && r.menu.items_use_slots { 10 } else { 0 };
    }
    let Some(w) = tables().weapon(e.id as u8) else { return 0 };
    if e.count == 0 { w.slots * (e.akimbo as i32 + 1) } else { w.slots * e.count }
}

pub struct BuyMenu {
    pub active: bool,
    /// Port addition: the canvas menu is not drawn and the engine's own key and mouse paths
    /// are inert. The state machine keeps running, so the browser's DOM menu can drive it
    /// (`ts_buy_key`) and read its state (`ts_buy_state`).
    pub hidden: bool,
    pub page: i32,
    pub category: i32,
    pub pending_att: u32,
    pub pending_weapon: i32,
    pub current: Config,
    pub last: Config,
    pub saved: [Config; SAVED_CONFIGS],
    /// `+0x2f08`: the config changed since the last submit ("Use New Config").
    pub new_config: bool,
    /// `+0x2f0c`: the money the ammo fill spent ([`BuyMenu::recompute_ammo`]), which the summary
    /// adds to the total.
    pub ammo_spend: i32,
    /// `+0x2f10`: random loadout on the first open.
    pub random_first: bool,
}

impl Default for BuyMenu {
    fn default() -> Self {
        BuyMenu {
            active: false,
            hidden: false,
            page: 0,
            category: 0,
            pending_att: 0,
            pending_weapon: -1,
            current: Config::default(),
            last: Config::default(),
            saved: Default::default(),
            new_config: true,
            ammo_spend: 0,
            random_first: true,
        }
    }
}

/// Random source: `rand(lo, hi)` inclusive, and a float in [lo, hi).
pub trait Rng {
    fn long(&mut self, lo: i32, hi: i32) -> i32;
    fn float(&mut self, lo: f32, hi: f32) -> f32;
}

impl BuyMenu {
    /// `Init` (`0x10036200`), run by every `CHudTSWeapons::VidInit` (`0x1004cb50`, its only
    /// caller), given the configs `FUN_10036480` read from `tsbuylist.tsa`: closed (`+0`), page,
    /// category and pending attachments 0 (`+4/+8/+0xc`), no pending weapon (`+0x10` = −1), the
    /// current, last and saved configs zeroed (`+0x14`, `+0x41c`, `+0x824`) before the file is
    /// read, "new config" set (`+0x2f08`) and the random first loadout armed again (`+0x2f10`).
    /// So each connect, map change or video-mode change forgets the last config, and the next
    /// open picks a random one. The category table (`+0x2d6c`) and names (`+0x2e5c`) it rebuilds
    /// are [`table`] and [`MenuRules`]; `+0x2f14` is never read and `+0x2f1c` (the mouse's
    /// pressed bits) is rewritten by every mouse event. `+0x2f0c` (the ammo spend) is left as it
    /// is in TS; here it is 0, which nothing sees: only the open menu shows it, and `Open` zeroes it.
    pub fn new(saved: [Config; SAVED_CONFIGS]) -> BuyMenu {
        BuyMenu { saved, ..BuyMenu::default() }
    }

    fn back_to_main(&mut self) {
        self.page = page::MAIN;
        self.category = 0;
        self.pending_weapon = -1;
        self.pending_att = 0;
    }

    /// `Close` (10036720).
    pub fn close(&mut self) {
        self.pending_weapon = -1;
        self.active = false;
        self.page = 0;
        self.category = 0;
        self.pending_att = 0;
        self.ammo_spend = 0;
    }

    /// `Open` (10036670), minus the demo check and cursor centring (caller).
    pub fn open(&mut self, r: &Rules, rng: &mut dyn Rng) {
        if self.active {
            return;
        }
        self.current = self.last.clone();
        self.ammo_spend = 0;
        self.active = true;
        self.page = 0;
        self.new_config = false;
        if self.random_first {
            self.random_first = false;
            let p = rng.float(0.5, 1.0);
            self.random_config(p, r, rng);
        }
        self.recompute_ammo(r);
    }

    /// `FUN_10038800`: empty config (plus kevlar with `cl_buykevlar`).
    pub fn reset_config(&mut self, r: &Rules) {
        self.current = Config::default();
        self.new_config = true;
        if r.buy_kevlar && r.menu.kevlar_cvar {
            self.add(ITEM_KEVLAR, 0, false, true, r);
        }
    }

    /// `FUN_10038d70`: can the pending weapon take this attachment?
    pub fn attachment_allowed(&self, bit: u32) -> bool {
        if self.pending_att & bit != 0 {
            return false;
        }
        let Some(w) = tables().weapon(self.pending_weapon.max(0) as u8) else { return false };
        bit & w.att_default as u32 == 0 && bit & w.att_allowed as u32 != 0
    }

    /// `FUN_10039380`: one more ammo purchase of type `t`.
    fn add_ammo_buy(&mut self, t: usize, r: &Rules) -> bool {
        if t >= 16 {
            return false;
        }
        let max = ammo_max(t, r);
        let a = &mut self.current.ammo[t];
        if a.0 >= max {
            return false;
        }
        let per = tables().ammo(t as u8).map_or(0, |x| x.per_buy);
        a.0 = (a.0 + per).min(max);
        a.1 += 1;
        true
    }

    /// `FUN_100392b0`: fill ammo round-robin over the guns with the money left. With money to
    /// spend it records what the ammo cost, `(initial - remaining) & ((initial - remaining) < 1) - 1`
    /// (`0x10039354..0x10039365`), so at least 0; otherwise the spend keeps its value (issue #108).
    pub fn recompute_ammo(&mut self, r: &Rules) {
        let initial = r.cash.wrapping_sub(self.current.total);
        let mut budget = initial;
        self.current.ammo = [(0, 0); 16];
        if budget > 0 {
            loop {
                let mut changed = false;
                for i in 0..ENTRIES {
                    let e = self.current.entries[i];
                    if e.id == 0 || e.is_item {
                        continue;
                    }
                    let t = tables().weapon(e.id as u8).map_or(0, |w| w.ammo as usize);
                    let price = tables().ammo(t as u8).map_or(0, |a| a.price);
                    if budget - price >= 0 && self.add_ammo_buy(t, r) {
                        budget -= price;
                        changed = true;
                    }
                }
                if !changed {
                    break;
                }
            }
            self.ammo_spend = initial.wrapping_sub(budget).max(0);
        }
    }

    /// `FUN_10038e40`: remove entry `i` and compact the list.
    pub fn remove(&mut self, i: usize, r: &Rules) {
        let Some(&e) = self.current.entries.get(i) else { return };
        // A loaded `tsbuylist.tsa` can hold any numbers: C int arithmetic, which wraps.
        self.current.total = self.current.total.wrapping_sub(e.cost);
        if !e.is_item {
            let w = tables().weapon(e.id as u8).map_or(0, |w| w.slots);
            let n = if e.count == 0 { w.wrapping_mul(e.akimbo as i32 + 1) } else { w.wrapping_mul(e.count) };
            self.current.slots = self.current.slots.wrapping_sub(n);
        } else if e.id & ITEM_KEVLAR != 0 && r.menu.items_use_slots {
            self.current.slots = self.current.slots.wrapping_sub(10);
        }
        self.current.entries[i] = Entry::default();
        // Bubble empty entries to the end.
        let mut moved = true;
        while moved {
            moved = false;
            for j in 0..ENTRIES - 1 {
                if self.current.entries[j].id < 1 && self.current.entries[j + 1].id > 0 {
                    self.current.entries.swap(j, j + 1);
                    moved = true;
                }
            }
        }
        self.new_config = true;
    }

    /// `FUN_10038f60(id, attachments, full, is_item)`: add to the config. `full` = akimbo for
    /// guns with an akimbo version, full load for stackables.
    pub fn add(&mut self, id: i32, att: u32, full: bool, item: bool, r: &Rules) -> bool {
        if restricted(id, item, r) {
            return false;
        }
        let info = if item { None } else { tables().weapon(id as u8) };
        if !item && info.is_none() {
            return false;
        }
        let (mut att, mut full) = (att, full);
        if r.menu.akimbo_fixup
            && let Some(w) = info
            && w.akimbo == -1
            && !w.stack
        {
            full = false;
        }
        // `wrapping_add`: a loaded config's totals can be anything (C int arithmetic).
        if cost(id, att, full, item).wrapping_add(self.current.total) > r.cash {
            return false;
        }
        if (!item || r.menu.items_use_slots) && slots_for(id, full, item, r).wrapping_add(self.current.slots) > SLOTS {
            return false;
        }
        for i in 0..ENTRIES {
            let e = self.current.entries[i];
            if e.id != id || e.id == 0 {
                continue;
            }
            if item {
                if e.is_item {
                    return false;
                }
                continue;
            }
            let Some(w) = info else { continue };
            if w.stack {
                if e.count >= w.pellets {
                    return false;
                }
                let n = if full { w.pellets.wrapping_sub(e.count) } else { 1 };
                let en = &mut self.current.entries[i];
                en.count = en.count.wrapping_add(n);
                en.cost = en.cost.wrapping_add(w.cost.wrapping_mul(n));
                self.current.total = self.current.total.wrapping_add(w.cost.wrapping_mul(n));
                self.current.slots = self.current.slots.wrapping_add(w.slots.wrapping_mul(n));
                self.recompute_ammo(r);
                self.new_config = true;
                return true;
            }
            // Buying the same gun again: merge attachments and make it akimbo.
            if w.akimbo != -1 && !e.akimbo {
                att |= e.att;
                full = true;
            }
            self.remove(i, r);
            break;
        }
        let Some(j) = self.current.entries.iter().position(|e| e.id == 0) else { return false };
        let stack = info.is_some_and(|w| w.stack);
        let mut e = Entry { is_item: item, id, att: if item { 0 } else { att }, ..Default::default() };
        if !stack {
            e.akimbo = full;
        }
        e.cost = cost(id, att, full, item);
        if !item && stack {
            e.count = if full { info.map_or(1, |w| w.pellets) } else { 1 };
        }
        self.current.entries[j] = e;
        self.current.total = self.current.total.wrapping_add(e.cost);
        self.current.slots = self.current.slots.wrapping_add(slots_for(id, full, item, r));
        self.recompute_ammo(r);
        self.new_config = true;
        true
    }

    /// `FUN_10039810`: random attachments (50% silencer, 50% laser, 25% scope; allowed and not
    /// built in).
    fn random_attachments(id: i32, rng: &mut dyn Rng) -> u32 {
        let Some(w) = tables().weapon(id as u8) else { return 0 };
        let (allowed, builtin) = (w.att_allowed as u32, w.att_default as u32);
        let mut a = 0;
        for (bit, threshold) in [(1u32, 50), (2, 50), (8, 75)] {
            if rng.long(0, 100) > threshold && allowed & bit != 0 && builtin & bit == 0 {
                a |= bit;
            }
        }
        a
    }

    /// `RandomConfig` (100398e0): a melee weapon, then by `p`: a pistol (0.1 < p < 0.9), an SMG
    /// (0.3 < p < 0.7) or a rifle/shotgun (p ≥ 0.7). `p <= 0` picks `p` at random. The bounds
    /// are `double`s (`fcomp QWORD`, 3.0 `0x1007a540`.., 2.1 `0x10267838`..; issue #264): the
    /// `float` `p` is compared exactly, so `0.1f32` is above 0.1 and `0.7f32` below 0.7. The result
    /// also becomes the last config (`+0x14` copied to `+0x41c` at the end), so the next open
    /// brings it back even if it was never bought.
    pub fn random_config(&mut self, p: f32, r: &Rules, rng: &mut dyn Rng) {
        self.random_config_entries(p, r, rng);
        self.last = self.current.clone();
    }

    fn random_config_entries(&mut self, p: f32, r: &Rules, rng: &mut dyn Rng) {
        self.reset_config(r);
        let (melee, full) = match rng.long(0, 5) {
            2 => (35, rng.long(0, 2) == 0),
            3 => (34, false),
            _ => (25, rng.long(0, 2) == 0),
        };
        self.add(melee, 0, full, false, r);
        let p = if p <= 0.0 { rng.float(0.0, 1.0) } else { p };
        let pd = p as f64;
        if 0.1 < pd && pd < 0.9 {
            let (pistols, from) = (r.menu.random_pistols, r.menu.random_pistols_from);
            let last = pistols.len() as i32 - 1;
            // Guarded: the RNG stays in the list.
            let k = rng.long(from, from + last).wrapping_sub(from).clamp(0, last);
            let (id, can_akimbo) = pistols[k as usize];
            let ak = can_akimbo && rng.long(0, 1) != 0;
            let att = Self::random_attachments(id, rng);
            self.add(id, att, ak, false, r);
        }
        // `if (p <= 0.3 || 0.7 <= p) { if (p < 0.7) skip; rifle } else SMG`.
        if !(pd <= 0.3 || 0.7 <= pd) {
            const SMGS: [i32; 6] = [3, 6, 7, 17, 19, 23];
            let k = rng.long(1, 6).clamp(1, 6) as usize - 1;
            let id = SMGS[k];
            let ak = k == 0 && rng.long(0, 1) != 0;
            let att = Self::random_attachments(id, rng);
            self.add(id, att, ak, false, r);
        } else if pd >= 0.7 {
            const RIFLES: [i32; 11] = [4, 11, 20, 13, 5, 15, 26, 27, 33, 18, 32];
            let k = rng.long(1, 12);
            if (1..=11).contains(&k) {
                let id = RIFLES[k as usize - 1];
                let att = Self::random_attachments(id, rng);
                self.add(id, att, false, false, r);
            }
        }
    }

    /// `SubmitConfig` (10039400): `rst_cfg`, then the `tkw`, `tki` and `tka` lists.
    pub fn submit(&mut self, actions: &mut Vec<Action>, r: &Rules) -> bool {
        if self.current.total < 1 {
            actions.push(Action::Message("#Buy_ConfigEmpty".into(), RED));
        }
        if r.cash < self.current.total {
            actions.push(Action::Message("#Buy_NoCash".into(), RED));
            return false;
        }
        if SLOTS < self.current.slots {
            return false;
        }
        // Sort (bubble, pairs 0..15): ascending price, melee/grenades (no ammo type) first.
        let ammo_of = |id: i32| tables().weapon(id as u8).map_or(0, |w| w.ammo);
        // TS loops until a pass swaps nothing. Its order isn't transitive once items mix with
        // ammo-less guns, so the passes are capped (a consistent order needs fewer than
        // ENTRIES) to never hang on a loaded config.
        for _ in 0..ENTRIES * ENTRIES {
            let mut swapped = false;
            for i in 0..ENTRIES - 1 {
                let (a, b) = (self.current.entries[i], self.current.entries[i + 1]);
                if a.id <= 0 || b.id <= 0 {
                    continue;
                }
                let swap = if !a.is_item && !b.is_item {
                    let (aa, ab) = (ammo_of(a.id), ammo_of(b.id));
                    if aa == 0 || ab == 0 { if aa == 0 && ab == 0 { b.cost < a.cost } else { aa != 0 } } else { b.cost < a.cost }
                } else {
                    b.cost < a.cost
                };
                if swap {
                    self.current.entries.swap(i, i + 1);
                    swapped = true;
                }
            }
            if !swapped {
                break;
            }
        }
        let (mut tkw, mut tki, mut tka) = ("tkw ".to_owned(), "tki ".to_owned(), "tka ".to_owned());
        for e in self.current.entries.iter().filter(|e| e.id != 0) {
            if e.is_item {
                tki.push_str(&format!("{} ", e.id));
                continue;
            }
            let stack = tables().weapon(e.id as u8).is_some_and(|w| w.stack);
            if stack {
                tkw.push_str(&format!("{}_{} ", e.id, e.count));
            } else if e.akimbo {
                // Akimbo: the gun twice, the second copy without attachments.
                tkw.push_str(&format!("{}_{} {}_{} ", e.id, e.att, e.id, 0));
            } else {
                tkw.push_str(&format!("{}_{} ", e.id, e.att));
            }
        }
        for (t, a) in self.current.ammo.iter().enumerate() {
            if a.0 != 0 {
                tka.push_str(&format!("{}_{} ", t, a.1));
            }
        }
        actions.push(Action::ServerCmd("rst_cfg".into()));
        actions.push(Action::ServerCmd(tkw));
        actions.push(Action::ServerCmd(tki));
        actions.push(Action::ServerCmd(tka));
        let msg = if self.new_config { "#Buy_UsingNewConfig" } else { "#Buy_UsingLastConfig" };
        actions.push(Action::Message(msg.into(), [0; 3]));
        self.new_config = false;
        self.last = self.current.clone();
        true
    }

    /// Display name of an entry (remove page, messages).
    pub fn entry_name(e: &Entry) -> String {
        if e.is_item {
            if e.id & ITEM_KEVLAR != 0 {
                "Kevlar".into()
            } else if e.id & ITEM_STEALTH != 0 {
                "Stealth Shoes".into()
            } else {
                String::new()
            }
        } else {
            tables().weapon(e.id as u8).map_or_else(String::new, |w| w.name.clone())
        }
    }

    /// `FUN_10038410`: the menu row under the mouse. Columns are 128 px wide from x 8, rows 20 px
    /// high from mid-screen; each column answers for its page whatever page is showing.
    pub fn hit_test(&self, x: i32, y: i32, screen_h: i32, r: &Rules) -> Hit {
        if x < 8 || y < screen_h / 2 {
            return Hit::Miss;
        }
        let row = (y - screen_h / 2) / 20;
        let cur = self.page;
        match (x - 8) / 128 {
            0 => {
                if row > 7 || (cur != page::MAIN && row == 7) {
                    return Hit::Miss;
                }
                Hit::Row(page::MAIN, if row == 7 { 10 } else { row + 1 })
            }
            1 => match cur {
                page::CATEGORY..=page::ITEMS => {
                    // The rows before "back": TS 3.0 always 6; with `category_rows_by_teamplay`
                    // `(m_Teamplay != 0) + 5`, so in mode 1 the drawn "back" row (the sixth, with
                    // no "Player Accessory" above it) is key 6.
                    let n = if r.menu.category_rows_by_teamplay { (r.gamemode != 0) as i32 + 5 } else { 6 };
                    if row > n || (cur != page::CATEGORY && row == n) {
                        return Hit::Miss;
                    }
                    Hit::Row(page::CATEGORY, if row == n { 10 } else { row + 1 })
                }
                page::REMOVE => {
                    let mut i = 0;
                    while self.current.entries[i].id != 0 {
                        if row == i as i32 {
                            return Hit::Row(page::REMOVE, row + 1);
                        }
                        i += 1;
                        if i > 15 {
                            return Hit::Unset;
                        }
                    }
                    if row == i as i32 { Hit::Row(page::REMOVE, 10) } else { Hit::Miss }
                }
                page::SAVE | page::LOAD if row < 11 => Hit::Row(cur, row),
                _ => Hit::Miss,
            },
            2 => match cur {
                page::WEAPONS | page::OPTIONS => {
                    let (mut i, mut skipped) = (0i32, 0i32);
                    loop {
                        let Some(&id) = table(&r.menu).get(i as usize).map(|t| &t[self.category.clamp(0, 4) as usize]) else {
                            return Hit::Unset;
                        };
                        if id == -1 {
                            break;
                        }
                        if !restricted(id, false, r) {
                            if row == i - skipped {
                                let key = skipped + 1 + row;
                                return Hit::Row(page::WEAPONS, if key < 10 { key } else { key + 1 });
                            }
                        } else {
                            skipped += 1;
                        }
                        i += 1;
                    }
                    if row == i - skipped { Hit::Row(page::WEAPONS, 10) } else { Hit::Miss }
                }
                page::ITEMS if row < 3 => {
                    let item = match row {
                        0 => ITEM_KEVLAR,
                        1 => ITEM_STEALTH,
                        _ => 0,
                    };
                    let row = if restricted(item, true, r) { row + 1 } else { row };
                    Hit::Row(page::ITEMS, if row == 2 { 10 } else { row + 1 })
                }
                _ => Hit::Miss,
            },
            3 if cur == page::OPTIONS => {
                if row == 0 {
                    return Hit::Row(page::OPTIONS, 1);
                }
                let mut skipped = 0;
                for i in 0..4 {
                    if self.attachment_allowed(1 << i) {
                        if row == i - skipped + 1 {
                            return Hit::Row(page::OPTIONS, skipped + 1 + row);
                        }
                    } else {
                        skipped += 1;
                    }
                }
                // The akimbo / full-load row (key 6) exists for guns with an akimbo version and
                // for stackables; "back" follows the last row.
                let w = tables().weapon(self.pending_weapon.max(0) as u8);
                let full_row = w.is_some_and(|w| w.akimbo != -1 || w.stack);
                let mut n = 4;
                if full_row {
                    n = 5;
                    if row == 4 - skipped + 1 {
                        return Hit::Row(page::OPTIONS, 6);
                    }
                }
                if row == n - skipped + 1 { Hit::Row(page::OPTIONS, 10) } else { Hit::Miss }
            }
            _ => Hit::Miss,
        }
    }

    /// `HandleKey(page, key)` (10038840). Keys 1..11 (10 = "0"/back, 11 = the `a` key).
    pub fn handle_key(&mut self, pg: i32, key: i32, r: &Rules, rng: &mut dyn Rng) -> Vec<Action> {
        let mut out = Vec::new();
        if !(1..=r.menu.max_key).contains(&key) {
            return out;
        }
        match pg {
            page::MAIN => match key {
                1 => {
                    if self.submit(&mut out, r) {
                        self.close();
                        out.push(Action::Close);
                    }
                }
                2 => self.page = page::CATEGORY,
                3 => self.page = page::REMOVE,
                4 => {
                    self.reset_config(r);
                    out.push(Action::Message("#Buy_ConfigReset".into(), [0; 3]));
                    self.ammo_spend = 0;
                }
                5 => self.page = page::SAVE,
                6 => self.page = page::LOAD,
                7 => self.random_config(0.0, r, rng),
                10 => {
                    self.close();
                    out.push(Action::Close);
                }
                _ => {}
            },
            page::CATEGORY => match key {
                6 if !r.menu.items_need_teamplay || r.gamemode > 1 => self.page = page::ITEMS,
                1..=5 if table(&r.menu)[0][key as usize - 1] != -1 => {
                    self.page = page::WEAPONS;
                    self.category = key - 1;
                }
                10 => self.back_to_main(),
                _ => {}
            },
            page::WEAPONS => {
                if key == 10 {
                    self.page = page::CATEGORY;
                    self.pending_weapon = -1;
                    self.pending_att = 0;
                    return out;
                }
                let row = if key > 9 { key - 2 } else { key - 1 } as usize;
                let Some(&id) = table(&r.menu).get(row).and_then(|t| t.get(self.category as usize)) else { return out };
                if id == -1 || restricted(id, false, r) {
                    return out;
                }
                self.page = page::OPTIONS;
                self.pending_weapon = id;
            }
            page::OPTIONS => match key {
                1 | 6 => {
                    let (id, att) = (self.pending_weapon, self.pending_att);
                    self.add(id, att, key == 6, false, r);
                    self.page = page::CATEGORY;
                    self.pending_weapon = -1;
                    self.pending_att = 0;
                }
                2..=5 => {
                    let bit = 1u32 << (key - 2);
                    if self.attachment_allowed(bit) {
                        self.pending_att |= bit;
                    }
                }
                10 => {
                    self.page = page::WEAPONS;
                    self.pending_weapon = -1;
                    self.pending_att = 0;
                }
                _ => {}
            },
            page::ITEMS => match key {
                1 | 2 => {
                    let id = if key == 1 { ITEM_KEVLAR } else { ITEM_STEALTH };
                    if restricted(id, true, r) {
                        return out;
                    }
                    self.add(id, 0, false, true, r);
                    self.page = page::CATEGORY;
                    self.pending_weapon = -1;
                    self.pending_att = 0;
                }
                10 => {
                    self.page = page::CATEGORY;
                    self.pending_weapon = -1;
                    self.pending_att = 0;
                }
                _ => {}
            },
            page::REMOVE => {
                if key == 10 {
                    self.back_to_main();
                    return out;
                }
                let i = key as usize - 1;
                if i < ENTRIES && self.current.entries[i].id != 0 {
                    let name = Self::entry_name(&self.current.entries[i]);
                    out.push(Action::MessageArg("#Buy_Removed".into(), name, [0; 3]));
                    self.remove(i, r);
                    self.recompute_ammo(r);
                }
            }
            page::SAVE => {
                if key == 10 {
                    self.back_to_main();
                    return out;
                }
                if (1..=SAVED_CONFIGS as i32).contains(&key) {
                    self.saved[key as usize - 1] = self.current.clone();
                    out.push(Action::SaveFile);
                    self.back_to_main();
                    out.push(Action::MessageArg("#Buy_SavedConfig".into(), key.to_string(), [0; 3]));
                }
            }
            page::LOAD => {
                if key == 10 {
                    self.back_to_main();
                    return out;
                }
                if (1..=SAVED_CONFIGS as i32).contains(&key) && self.saved[key as usize - 1].total > 0 {
                    self.current = self.saved[key as usize - 1].clone();
                    self.recompute_ammo(r);
                    out.push(Action::MessageArg("#Buy_ConfigLoaded".into(), key.to_string(), [0; 3]));
                    self.back_to_main();
                    self.new_config = true;
                }
            }
            page::TEAM => {
                if key < 3 {
                    // `0x10038cf9`: `chgteam key - 1`.
                    out.push(Action::ServerCmd(format!("chgteam {}", key - 1)));
                    self.close();
                    out.push(Action::Close);
                } else if key == 10 {
                    self.close();
                    out.push(Action::Close);
                }
            }
            _ => {}
        }
        out
    }

    /// Does the canvas draw the menu? A hidden menu is not drawn, but its state machine keeps
    /// running: the browser's DOM menu drives it and reads its state.
    pub fn draws(&self) -> bool {
        self.active && !self.hidden
    }

    /// The DOM menu's write path: the key runs on the current page, hidden or not. It is the
    /// same [`BuyMenu::handle_key`] the canvas menu runs, so the two cannot disagree.
    pub fn dom_key(&mut self, key: i32, r: &Rules, rng: &mut dyn Rng) -> Vec<Action> {
        let pg = self.page;
        self.handle_key(pg, key, r, rng)
    }

    /// Whether the menu draws the given page's column now. The DOM menu may only press a key
    /// on a column the canvas is showing, like the mouse can only hit a drawn column.
    pub fn page_is_drawn(&self, pg: i32) -> bool {
        columns(self.page).iter().any(|c| c.page() == pg)
    }

    /// A key on a named page: the DOM menu's click path, which acts on the page the clicked
    /// row belongs to (the canvas's mouse picks the column the click was in).
    pub fn dom_key_on(&mut self, pg: i32, key: i32, r: &Rules, rng: &mut dyn Rng) -> Vec<Action> {
        self.handle_key(pg, key, r, rng)
    }

    /// The engine's own key path (the digit keys and the mouse). It is inert while the menu is
    /// hidden, so the browser's DOM menu owns the input. `None` when the key was not taken.
    pub fn engine_key(&mut self, key: i32, r: &Rules, rng: &mut dyn Rng) -> Option<Vec<Action>> {
        if self.hidden || !(1..=r.menu.max_key).contains(&key) {
            return None;
        }
        Some(self.dom_key(key, r, rng))
    }

    /// Every row the canvas draws for the menu's current page, in the order it draws them: the
    /// page's own column first, then the columns the page was reached from. The canvas draws
    /// these and the state dump reports them, so the two can never disagree.
    pub fn rows(&self, r: &Rules) -> Vec<Row> {
        let mut out = Vec::new();
        for column in columns(self.page) {
            out.extend(column_rows(self, r, *column));
        }
        out
    }

    /// The menu's state, as the `TSBUY` records the browser's DOM menu reads: one record per
    /// line, `TSBUY end` closing the set. The labels are the `#Buy_…` title keys the canvas
    /// menu draws too: the port does not localise them, the engine's titles do.
    pub fn state_lines(&self, r: &Rules) -> Vec<String> {
        let mut out = Vec::new();
        out.push(format!(
            "TSBUY state open={} hidden={} page={} budget={} total={} slots={} ammo_spend={} new={} cat={} pending={} att={}",
            self.active as i32,
            self.hidden as i32,
            self.page,
            r.cash,
            self.current.total,
            self.current.slots,
            self.ammo_spend,
            self.new_config as i32,
            self.category,
            self.pending_weapon,
            self.pending_att
        ));
        out.push(format!("TSBUY page {} {}", self.page, page_title(self.page)));
        for row in self.rows(r) {
            let number = row.number();
            out.push(format!(
                "TSBUY row {} {} {} {} {} {}",
                row.key,
                row.price,
                row.flags.dump(),
                row.column.page(),
                if number.is_empty() { "-".to_owned() } else { number },
                row.label
            ));
        }
        for (i, e) in self.current.entries.iter().enumerate() {
            if e.id == 0 {
                continue;
            }
            out.push(format!("TSBUY entry {} {} {} {}", i, e.cost, entry_slots(e, r), BuyMenu::entry_name(e)));
        }
        out.push("TSBUY end".to_owned());
        out
    }
}

/// `FUN_10036af0`'s header (`0x10036b64..0x10036bc1`): the total includes the ammo
/// ([`BuyMenu::ammo_spend`]), and a `CashBased()` menu also shows the money left after it,
/// `(cash - total - spend, total + spend)` (issue #108). The title key and its arguments.
pub fn summary_header(b: &BuyMenu, r: &Rules) -> (&'static str, Vec<i32>) {
    let with_ammo = b.current.total.wrapping_add(b.ammo_spend);
    if r.cash_based {
        ("#Buy_Total_CashBased", vec![r.cash.wrapping_sub(b.current.total).wrapping_sub(b.ammo_spend), with_ammo])
    } else {
        ("#Buy_Total", vec![with_ammo])
    }
}

/// `FUN_100368f0`: `(Sil,Las,Fla,Sco)` attachment summary.
pub fn attachment_summary(att: u32, loc: &dyn Fn(&str) -> String) -> String {
    if att == 0 {
        return String::new();
    }
    let parts: Vec<String> = [(1, "#Buy_Sil"), (2, "#Buy_Las"), (4, "#Buy_Fla"), (8, "#Buy_Sco")]
        .iter()
        .filter(|(b, _)| att & b != 0)
        .map(|(_, k)| loc(k))
        .collect();
    format!("({})", parts.join(","))
}

#[cfg(test)]
mod tests {
    use super::*;

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

    fn rules() -> Rules {
        Rules { restriction: 0x1f, ..Rules::default() }
    }

    /// The titles the menu draws, for the tests: the port never localises them itself.
    struct TestTitles;
    impl crate::hud::text::Titles for TestTitles {
        fn get(&self, key: &str) -> Option<String> {
            Some(
                match key {
                    "Buy_Handguns" => "Handguns",
                    "Buy_SMGs" => "SMGs",
                    "Buy_Rifles" => "Rifles",
                    "Buy_Shotguns" => "Shotguns",
                    "Buy_SpecialPurpose" => "Special Purpose",
                    "Buy_SaveEquipment" => "Save Equipment",
                    "Buy_GoBack" => "Go Back",
                    "Buy_Buy" => "Buy",
                    "Buy_EmptyConfig" => "Empty Config",
                    "Buy_SlotEmpty" => "Slot %i Empty",
                    "Buy_SlotAvailable" => "Slot %i Available",
                    "HUD_Silencer" => "Silencer",
                    _ => return None,
                }
                .to_owned(),
            )
        }
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

    #[test]
    fn parses_shipped_buylist() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../../ts/tsbuylist.tsa");
        let Ok(bytes) = std::fs::read(path) else { return }; // content not present in CI
        assert_eq!(bytes.len(), SAVED_CONFIGS * CONFIG_SIZE);
        let saved = parse_buylist(&bytes);
        let c = &saved[0];
        assert_eq!(c.total, 8300);
        assert_eq!(c.slots, 70);
        assert_eq!(c.entries[0], Entry { is_item: true, id: 0x10, att: 0, cost: 1900, akimbo: false, count: 0 });
        assert_eq!((c.entries[1].id, c.entries[1].count, c.entries[1].cost), (25, 5, 500));
        assert_eq!((c.entries[3].id, c.entries[3].att, c.entries[3].cost), (4, 2, 3800));
        assert_eq!(c.ammo[3], (60, 8));
        assert_eq!(write_buylist(&saved), bytes, "round trip is byte-exact");
    }

    /// Issue #189: `Init` (`0x10036200`), from every `VidInit`, forgets the current and last
    /// configs and arms the random first loadout again; the saved ones come from the file.
    #[test]
    fn init_forgets_the_last_config_and_rerolls() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu::default();
        m.open(&r, &mut FixedRng(vec![], 0));
        assert!(!m.random_first, "the first open used up the random loadout");
        let rolled = m.current.clone();
        assert!(rolled.entries.iter().any(|e| e.id != 0 || e.count != 0), "a random loadout was picked");
        m.last = rolled.clone();
        m.close();
        let mut saved: [Config; SAVED_CONFIGS] = Default::default();
        saved[2].total = 1234;
        let n = BuyMenu::new(saved.clone());
        assert!(!n.active);
        assert_eq!((n.page, n.category, n.pending_att, n.pending_weapon), (0, 0, 0, -1));
        assert_eq!(n.current, Config::default());
        assert_eq!(n.last, Config::default(), "the previous map's last config is gone");
        assert_eq!(n.saved, saved, "saved configs as read from tsbuylist.tsa");
        assert!(n.new_config && n.random_first);
        // So the next open rolls again instead of reopening the last config.
        let mut n = n;
        n.open(&r, &mut FixedRng(vec![], 0));
        assert!(!n.random_first);
        assert_eq!(n.current, rolled, "the same rng rolls the same loadout, not an empty last config");
    }

    #[test]
    fn add_and_costs() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu::default();
        m.reset_config(&r);
        assert_eq!((m.current.total, m.current.slots), (1900, 10), "kevlar from cl_buykevlar");
        assert!(m.add(13, 8, false, false, &r));
        assert_eq!(m.current.total, 1900 + 3000 + 1800);
        assert_eq!(m.current.slots, 50);
        assert_eq!(m.current.ammo[6].0, 90, "AK ammo filled to the ammocount 0 max");
        assert!(m.add(25, 0, true, false, &r), "full load of knives");
        let k = m.current.entries.iter().find(|e| e.id == 25).unwrap();
        assert_eq!((k.count, k.cost), (5, 500));
        assert!(!m.add(25, 0, false, false, &r), "already at max count");
        assert!(!m.add(24, 0, false, false, &r), "grenades need gamemode > 1");
        assert!(!m.add(ITEM_KEVLAR, 0, false, true, &r), "one kevlar");
        // Beretta then Beretta again = akimbo.
        assert!(m.add(2, 1, false, false, &r));
        assert!(m.add(2, 2, false, false, &r));
        let b = m.current.entries.iter().find(|e| e.id == 2).unwrap();
        assert!(b.akimbo);
        assert_eq!(b.att, 3);
        assert_eq!(b.cost, 900 * 2 + 900 + 800);
    }

    /// Issue #108: the ammo fill records what the ammo cost, and only when there was money to
    /// spend; the summary's total includes it, and a `CashBased()` menu shows the money left
    /// after it; `ammocount` outside 1..3 takes column 0.
    #[test]
    fn ammo_spend_and_summary() {
        ts30_gameplay::tables::make_default();
        let r = Rules { cash: 10000, ..rules() };
        let mut m = BuyMenu::default();
        assert!(m.add(13, 0, false, false, &r));
        let price = tables().ammo(6).unwrap().price;
        let (rounds, buys) = m.current.ammo[6];
        assert_eq!((rounds, m.ammo_spend), (90, buys * price), "AK47 ammo: {buys} buys");
        assert!(m.ammo_spend > 0);
        assert_eq!(summary_header(&m, &r), ("#Buy_Total", vec![3000 + m.ammo_spend]));
        let cash_based = Rules { cash_based: true, ..r };
        assert_eq!(summary_header(&m, &cash_based), ("#Buy_Total_CashBased", vec![10000 - 3000 - m.ammo_spend, 3000 + m.ammo_spend]));
        // No money to spend: the ammo is cleared and the spend keeps its value.
        let spend = m.ammo_spend;
        m.recompute_ammo(&Rules { cash: 3000, ..r });
        assert_eq!((m.current.ammo[6], m.ammo_spend), ((0, 0), spend));
        // `ammocount` 4 (or negative) is column 0's 90, not column 3's 0.
        for ammocount in [4, -1] {
            m.recompute_ammo(&Rules { ammocount, ..r });
            assert_eq!(m.current.ammo[6].0, 90, "ammocount {ammocount}");
        }
        m.recompute_ammo(&Rules { ammocount: 3, ..r });
        assert_eq!(m.current.ammo[6].0, 0, "column 3");
    }

    /// The category column's mouse rows: TS 3.0's six, or `(m_Teamplay != 0) + 5`
    /// ([`MenuRules::category_rows_by_teamplay`]).
    #[test]
    fn category_mouse_rows() {
        let m = BuyMenu { page: page::CATEGORY, ..BuyMenu::default() };
        let at = |row: i32, r: &Rules| m.hit_test(8 + 128 + 1, 300 + row * 20 + 1, 600, r);
        for gamemode in [0, 1, 2] {
            let r = Rules { gamemode, ..rules() };
            assert_eq!((at(5, &r), at(6, &r), at(7, &r)), (Hit::Row(page::CATEGORY, 6), Hit::Row(page::CATEGORY, 10), Hit::Miss));
        }
        let by_teamplay =
            |gamemode| Rules { gamemode, menu: MenuRules { category_rows_by_teamplay: true, ..MenuRules::default() }, ..rules() };
        assert_eq!((at(5, &by_teamplay(0)), at(6, &by_teamplay(0))), (Hit::Row(page::CATEGORY, 10), Hit::Miss));
        // Mode 1: the sixth row is drawn as "back" (no accessory row) but is key 6.
        assert_eq!((at(5, &by_teamplay(1)), at(6, &by_teamplay(1))), (Hit::Row(page::CATEGORY, 6), Hit::Row(page::CATEGORY, 10)));
        assert_eq!(at(6, &by_teamplay(2)), Hit::Row(page::CATEGORY, 10));
    }

    #[test]
    fn slot_limit() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu::default();
        assert!(m.add(18, 0, false, false, &r)); // barrett, 70 slots
        assert!(!m.add(5, 0, false, false, &r), "M4 (40) doesn't fit in 81");
        assert!(m.add(ITEM_KEVLAR, 0, false, true, &r));
        assert_eq!(m.current.slots, 80);
    }

    #[test]
    fn restrictions() {
        ts30_gameplay::tables::make_default();
        assert!(!weapon_restricted(13, 0x1f));
        assert!(weapon_restricted(13, 0x17), "rifles need 0x08");
        assert!(weapon_restricted(33, 0x0f), "sawed-off counts as a shotgun");
        assert!(weapon_restricted(34, 0x1e), "katana counts as a knife");
        assert!(weapon_restricted(16, 0x1b), "akimbo uzi counts as an SMG");
        assert!(weapon_restricted(24, 0), "mask 0 blocks everything in the client check");
        assert!(!weapon_restricted(24, 0x1f));
    }

    #[test]
    fn submit_protocol() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu::default();
        m.reset_config(&r);
        m.add(13, 8, false, false, &r);
        m.add(25, 0, true, false, &r);
        m.add(9, 1, true, false, &r); // akimbo MK23 with silencer
        let mut a = Vec::new();
        assert!(m.submit(&mut a, &rules()));
        assert_eq!(a[0], Action::ServerCmd("rst_cfg".into()));
        // Sorted: knives (no ammo) first, then by price: kevlar 1900 (item), MK23 akimbo 2300, AK 4800.
        assert_eq!(a[1], Action::ServerCmd("tkw 25_5 9_1 9_0 13_8 ".into()));
        assert_eq!(a[2], Action::ServerCmd("tki 16 ".into()));
        assert_eq!(a[3], Action::ServerCmd("tka 2_15 6_3 ".into()));
        assert_eq!(a[4], Action::Message("#Buy_UsingNewConfig".into(), [0; 3]));
        assert_eq!(m.last, m.current);
    }

    #[test]
    fn mouse_hit_test() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut b = BuyMenu::default();
        let at = |col: i32, row: i32| (8 + col * 128 + 5, 240 + row * 20 + 3);
        let hit = |b: &BuyMenu, (x, y): (i32, i32)| b.hit_test(x, y, 480, &r);
        assert_eq!(hit(&b, at(0, 0)), Hit::Row(page::MAIN, 1));
        assert_eq!(hit(&b, at(0, 7)), Hit::Row(page::MAIN, 10), "the last main row is back");
        assert_eq!(hit(&b, at(0, 8)), Hit::Miss);
        assert_eq!(hit(&b, (4, 300)), Hit::Miss);
        assert_eq!(hit(&b, (100, 200)), Hit::Miss, "above mid-screen");
        assert_eq!(hit(&b, at(1, 0)), Hit::Miss, "no category column on the main page");
        b.page = page::CATEGORY;
        assert_eq!(hit(&b, at(1, 6)), Hit::Row(page::CATEGORY, 10));
        assert_eq!(hit(&b, at(0, 7)), Hit::Miss, "a parent column has no back row");
        assert_eq!(hit(&b, at(0, 2)), Hit::Row(page::MAIN, 3), "parent columns stay clickable");
        b.page = page::WEAPONS;
        b.category = 0;
        // Handguns: ten weapons, none restricted under 0x1f; the 11th row is back.
        assert_eq!(hit(&b, at(2, 9)), Hit::Row(page::WEAPONS, 11), "keys skip 10");
        assert_eq!(hit(&b, at(2, 10)), Hit::Row(page::WEAPONS, 10));
        b.page = page::SAVE;
        assert_eq!(hit(&b, at(1, 3)), Hit::Row(page::SAVE, 3), "save/load rows are the key itself");
        b.page = page::REMOVE;
        b.current.entries[0].id = 13;
        assert_eq!(hit(&b, at(1, 0)), Hit::Row(page::REMOVE, 1));
        assert_eq!(hit(&b, at(1, 1)), Hit::Row(page::REMOVE, 10));
        for e in b.current.entries.iter_mut() {
            e.id = 13;
        }
        assert_eq!(hit(&b, at(1, 16)), Hit::Unset, "TS leaves the page unwritten");
    }

    #[test]
    fn page_machine() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut rng = FixedRng(vec![], 0);
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut rng);
        assert!(m.active);
        m.handle_key(page::MAIN, 2, &r, &mut rng);
        assert_eq!(m.page, page::CATEGORY);
        m.handle_key(page::CATEGORY, 3, &r, &mut rng); // rifles
        assert_eq!((m.page, m.category), (page::WEAPONS, 2));
        m.handle_key(page::WEAPONS, 2, &r, &mut rng); // AK47
        assert_eq!((m.page, m.pending_weapon), (page::OPTIONS, 13));
        m.handle_key(page::OPTIONS, 5, &r, &mut rng); // scope (bit 3)
        assert_eq!(m.pending_att, 8);
        m.handle_key(page::OPTIONS, 2, &r, &mut rng); // silencer not allowed on the AK
        assert_eq!(m.pending_att, 8);
        m.handle_key(page::OPTIONS, 1, &r, &mut rng);
        assert_eq!(m.page, page::CATEGORY);
        assert!(m.current.entries.iter().any(|e| e.id == 13 && e.att == 8));
        m.handle_key(page::CATEGORY, 10, &r, &mut rng);
        assert_eq!(m.page, page::MAIN);
        let a = m.handle_key(page::MAIN, 1, &r, &mut rng);
        assert!(a.contains(&Action::Close));
        assert!(!m.active);
        // Remove page.
        m.open(&r, &mut rng);
        m.handle_key(page::MAIN, 3, &r, &mut rng);
        let a = m.handle_key(page::REMOVE, 1, &r, &mut rng);
        assert_eq!(a[0], Action::MessageArg("#Buy_Removed".into(), "AK47".into(), [0; 3]));
        assert!(m.current.entries.iter().all(|e| e.id == 0));
    }

    #[test]
    fn random_config_is_valid() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu::default();
        // melee=knife full, pistol idx 3 (deagle), rifle k=4 (AK)
        let mut rng = FixedRng(vec![0, 0, 3, 0, 0, 0, 4, 0, 0, 0], 0);
        m.random_config(0.8, &r, &mut rng);
        let ids: Vec<i32> = m.current.entries.iter().filter(|e| e.id != 0).map(|e| e.id).collect();
        assert_eq!(ids, [ITEM_KEVLAR, 25, 12, 13]);
        assert!(m.current.slots <= SLOTS);
        assert_eq!(m.last, m.current, "RandomConfig ends by copying the config to the last one");
    }

    /// Issue #264: `RandomConfig` compares `p` with `double` bounds (`0x100398e0`): `0.1f32` and
    /// `0.3f32` are above theirs, `0.7f32` and `0.9f32` below.
    #[test]
    fn random_config_double_bounds() {
        ts30_gameplay::tables::make_default();
        let r = Rules { buy_kevlar: false, ..rules() };
        // Melee roll 3 (the katana, one rand), then whatever the branches draw: rand 2 picks the
        // second pistol, SMG or rifle.
        let kinds = |p: f32| {
            let mut m = BuyMenu::default();
            m.random_config(p, &r, &mut FixedRng(vec![3, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0], 0));
            let ids: Vec<i32> = m.current.entries.iter().map(|e| e.id).filter(|&id| id != 0 && id != 34).collect();
            let has = |list: &[i32]| ids.iter().any(|id| list.contains(id));
            (has(&[36, 1, 9, 12, 14, 2, 21, 22, 28, 31]), has(&[3, 6, 7, 17, 19, 23]), has(&[4, 11, 20, 13, 5, 15, 26, 27, 33, 18, 32]))
        };
        assert_eq!(kinds(0.1), (true, false, false), "0.1f32 > 0.1: a pistol");
        assert_eq!(kinds(0.9), (true, false, true), "0.9f32 < 0.9: a pistol and a rifle");
        assert_eq!(kinds(0.3), (true, true, false), "0.3f32 > 0.3: an SMG");
        assert_eq!(kinds(0.7), (true, true, false), "0.7f32 < 0.7: still an SMG, no rifle");
        assert_eq!(kinds(0.75), (true, false, true));
    }

    /// A tiny xorshift for the fuzz tests.
    struct XorShift(u64);
    impl XorShift {
        fn next(&mut self) -> u64 {
            self.0 ^= self.0 << 13;
            self.0 ^= self.0 >> 7;
            self.0 ^= self.0 << 17;
            self.0
        }
        fn bytes(&mut self, n: usize) -> Vec<u8> {
            (0..n).map(|_| self.next() as u8).collect()
        }
    }
    impl Rng for XorShift {
        fn long(&mut self, lo: i32, hi: i32) -> i32 {
            lo.wrapping_add((self.next() % (hi.wrapping_sub(lo) as u32 as u64 + 1)) as i32)
        }
        fn float(&mut self, lo: f32, hi: f32) -> f32 {
            lo + (self.next() % 1000) as f32 / 1000.0 * (hi - lo)
        }
    }

    /// Garbage, short, oversized and all-0xff buy lists parse, and every page and key on the
    /// loaded configs (any totals, ids, counts and costs) neither panics nor hangs.
    #[test]
    fn garbage_buylist_and_keys() {
        ts30_gameplay::tables::make_default();
        let mut rng = XorShift(0x9e37_79b9_7f4a_7c15);
        let mut files = vec![Vec::new(), vec![0xff; 3], vec![0xff; CONFIG_SIZE * SAVED_CONFIGS + 7], vec![0; CONFIG_SIZE - 1]];
        for _ in 0..40 {
            let n = (rng.next() % (CONFIG_SIZE as u64 * 10)) as usize;
            files.push(rng.bytes(n));
        }
        for file in files {
            let saved = parse_buylist(&file);
            assert_eq!(write_buylist(&saved).len(), CONFIG_SIZE * SAVED_CONFIGS);
            for gamemode in [0, 2] {
                let r = Rules { gamemode, restriction: rng.next() as i32, ammocount: rng.next() as i32, ..Rules::default() };
                let mut m = BuyMenu { saved: saved.clone(), ..BuyMenu::default() };
                m.open(&r, &mut rng);
                for _ in 0..200 {
                    let pg = (rng.next() % 10) as i32;
                    let key = (rng.next() % 13) as i32;
                    m.page = pg;
                    m.handle_key(pg, key, &r, &mut rng);
                    let (x, y) = ((rng.next() % 2000) as i32 - 100, (rng.next() % 2000) as i32 - 100);
                    m.hit_test(x, y, 480, &r);
                }
                for c in &saved {
                    m.current = c.clone();
                    m.recompute_ammo(&r);
                    m.submit(&mut Vec::new(), &r);
                    m.remove(0, &r);
                    m.remove(ENTRIES + 3, &r);
                    m.add(25, 0, true, false, &r);
                    m.add(13, 0xffff_ffff, true, false, &r);
                }
            }
        }
        // Extreme numbers in a config.
        let mut c = Config { total: i32::MAX, slots: i32::MIN, ..Config::default() };
        c.entries[0] = Entry { is_item: false, id: 25, att: 0, cost: i32::MIN, akimbo: true, count: i32::MIN };
        c.entries[1] = Entry { is_item: true, id: -1, att: u32::MAX, cost: i32::MAX, akimbo: true, count: i32::MAX };
        let r = rules();
        let mut m = BuyMenu { current: c, ..BuyMenu::default() };
        m.add(25, 0, true, false, &r);
        m.recompute_ammo(&r);
        m.remove(0, &r);
        m.remove(0, &r);
        m.submit(&mut Vec::new(), &r);
    }

    #[test]
    fn short_config_reads_zero() {
        assert_eq!(Config::from_bytes(&[0xff; CONFIG_SIZE - 1]), Config::default());
        assert_eq!(rd(&[1, 0, 0], 0), 0, "past the end");
    }

    #[test]
    fn summary_text() {
        let loc = |k: &str| k.trim_start_matches("#Buy_").to_owned();
        assert_eq!(attachment_summary(0b1011, &loc), "(Sil,Las,Sco)");
        assert_eq!(attachment_summary(0, &loc), "");
    }

    /// The hidden flag: the canvas menu is not drawn and the engine's own key path is inert,
    /// but the menu's state machine keeps running and the DOM menu's key path still works.
    #[test]
    fn the_hidden_flag_suppresses_the_draw_and_the_engines_keys() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        assert!(m.draws(), "an open menu is drawn");
        m.hidden = true;
        assert!(!m.draws(), "a hidden menu is not drawn");
        // The engine's key path (the digit keys and the mouse) is inert...
        assert!(m.engine_key(2, &r, &mut FixedRng(vec![], 0)).is_none());
        assert_eq!(m.page, page::MAIN, "the engine's key did nothing");
        // ...but the DOM menu's own path is not.
        let actions = m.dom_key(2, &r, &mut FixedRng(vec![], 0));
        assert!(actions.is_empty(), "the category page has no actions of its own");
        assert_eq!(m.page, page::CATEGORY, "the DOM's key ran");
    }

    /// The DOM menu's key path and the engine's key path run the same key: the same actions,
    /// the same state.
    #[test]
    fn the_dom_key_path_and_the_engines_key_path_agree() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut dom = BuyMenu { random_first: false, ..Default::default() };
        let mut engine = BuyMenu { random_first: false, ..Default::default() };
        dom.open(&r, &mut FixedRng(vec![], 0));
        engine.open(&r, &mut FixedRng(vec![], 0));
        for key in 1..=11 {
            let a = dom.dom_key(key, &r, &mut FixedRng(vec![], 0));
            let b = engine.engine_key(key, &r, &mut FixedRng(vec![], 0)).expect("the engine takes the key");
            assert_eq!(a, b, "key {key}");
            assert_eq!(dom.page, engine.page, "key {key}");
            assert_eq!(dom.current, engine.current, "key {key}");
        }
    }

    /// The state dump: one record per line, `TSBUY end` closing the set, and the shape the
    /// browser's DOM menu reads.
    #[test]
    fn the_state_dump_has_the_documented_shape() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.page = page::CATEGORY;
        let lines = m.state_lines(&r);
        assert_eq!(lines[0], "TSBUY state open=1 hidden=0 page=1 budget=30000 total=0 slots=0 ammo_spend=0 new=0 cat=0 pending=-1 att=0");
        assert_eq!(lines[1], "TSBUY page 1 #Buy_CATEGORY");
        assert_eq!(lines[2], "TSBUY row 1 0 0 1 1 #Buy_Handguns");
        assert_eq!(lines[3], "TSBUY row 2 0 0 1 2 #Buy_SMGs");
        assert_eq!(lines.last().unwrap(), "TSBUY end");
        assert!(lines.iter().all(|l| l.starts_with("TSBUY ")), "every line is a record");
        // Every page: the page record, the rows and the end.
        for pg in [page::MAIN, page::CATEGORY, page::WEAPONS, page::OPTIONS, page::ITEMS, page::REMOVE, page::SAVE, page::LOAD] {
            m.page = pg;
            let lines = m.state_lines(&r);
            assert_eq!(lines[1], format!("TSBUY page {pg} {}", page_title(pg)));
            assert_eq!(lines.last().unwrap(), "TSBUY end");
            assert!(lines.iter().all(|l| l.starts_with("TSBUY ")), "page {pg}");
            assert!(lines[0].contains(&format!(" page={pg} ")), "page {pg}: {}", lines[0]);
            assert!(!dump_rows(&lines).is_empty(), "page {pg}: the page has rows");
        }
        // The hidden flag is in the state record.
        m.hidden = true;
        assert!(m.state_lines(&r)[0].contains(" hidden=1 "));
    }

    /// The dump reports the rows the canvas draws: the same count, the same keys, the same
    /// prices and the same flags.
    #[test]
    fn the_dump_reports_the_rows_the_canvas_draws() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.add(13, 8, false, false, &r);
        for pg in [page::MAIN, page::CATEGORY, page::WEAPONS, page::OPTIONS, page::ITEMS, page::REMOVE, page::SAVE, page::LOAD] {
            m.page = pg;
            let rows = m.rows(&r);
            let dumped = dump_rows(&m.state_lines(&r));
            assert_eq!(dumped.len(), rows.len(), "page {pg}: as many rows as the canvas draws");
            for (row, (key, price, flags, page, number, label)) in rows.iter().zip(&dumped) {
                assert_eq!(key, &row.key, "page {pg}: {}", row.label);
                assert_eq!(price, &row.price, "page {pg}: {}", row.label);
                assert_eq!(flags, &row.flags.dump(), "page {pg}: {}", row.label);
                assert_eq!(page, &row.column.page(), "page {pg}: {}", row.label);
                // The dump writes "-" for a row with no number of its own.
                let expected = if row.number().is_empty() { "-".to_owned() } else { row.number() };
                assert_eq!(number, &expected, "page {pg}: {}", row.label);
                assert_eq!(label, &row.label, "page {pg}");
            }
        }
    }

    /// A row the player cannot afford is marked (`x`) and drawn red; the chosen category is
    /// the selected one (`on`).
    #[test]
    fn the_rows_carry_the_flags_the_dom_menu_needs() {
        ts30_gameplay::tables::make_default();
        let r = Rules { cash: 1000, ..rules() };
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.page = page::WEAPONS;
        m.category = 2;
        let rows = m.rows(&r);
        let ak = rows.iter().find(|row| row.label == "AK47").expect("the rifles column lists the AK47");
        assert!(ak.flags.x, "the AK47 costs more than 1000");
        assert_eq!(ak.color, RowColor::Bad);
        assert_eq!(ak.price, 3000);
        // The category column is a parent column here, so its rows are dimmed.
        let cat = rows.iter().find(|row| row.label == "#Buy_Handguns").expect("the handguns category");
        assert!(cat.flags.dim, "the parent column is dimmed");
        let chosen = rows.iter().find(|row| row.label == "#Buy_Rifles").expect("the rifles category");
        assert!(!chosen.flags.dim, "the chosen category keeps full brightness");
        // The options page marks the weapon the options are for.
        m.page = page::OPTIONS;
        m.pending_weapon = 13;
        let rows = m.rows(&r);
        let ak = rows.iter().find(|row| row.label == "AK47").expect("the rifles column lists the AK47");
        assert!(ak.flags.on, "the pending weapon is the selected one");
    }

    /// The client's budget and the tables' budget are the same number: the server checks a
    /// loadout against the table, so the two cannot drift.
    #[test]
    fn the_cash_and_the_tables_budget_agree() {
        ts30_gameplay::tables::make_default();
        assert_eq!(CASH, tables().combat.budget, "the client's budget is the table's");
        assert_eq!(rules().cash, tables().combat.budget);
    }

    /// The DOM menu's click acts on the row's own page, and the mouse's click on the same row
    /// does the same thing: the canvas picks the column the click was in, and a column's keys
    /// answer on that column's page.
    ///
    /// Without the page, a click on a parent column's row ran the key on the CURRENT page: on
    /// the weapons page, the category column's "1 Handguns" row would have picked weapon 1
    /// instead of the handguns.
    #[test]
    fn a_dom_click_does_what_the_mouse_click_does() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.page = page::WEAPONS;
        // Every row the canvas draws, and where it draws it: a column's rows start at the
        // middle of the screen and are 20 pixels high.
        let rows = m.rows(&r);
        let mut checked = 0;
        for (i, row) in rows.iter().enumerate() {
            if row.key == 0 {
                continue;
            }
            // The row's index in its own column: the rows above it in the same column.
            let idx = rows[..i].iter().filter(|o| o.column == row.column).count() as i32;
            let y = 240 + idx * 20;
            // The mouse's click: the row's box on the canvas.
            let hit = m.hit_test(row.column.x() + 4, y + 4, 480, &r);
            let Hit::Row(pg, key) = hit else {
                continue;
            };
            assert_eq!(pg, row.column.page(), "the mouse picks the column's page: {}", row.label);
            assert_eq!(key, row.key, "the mouse picks the row's key: {}", row.label);
            // The DOM's click: the key on the row's own page.
            let mut dom = BuyMenu { random_first: false, ..Default::default() };
            dom.open(&r, &mut FixedRng(vec![], 0));
            dom.page = page::WEAPONS;
            dom.dom_key_on(row.column.page(), row.key, &r, &mut FixedRng(vec![], 0));
            let mut mouse = BuyMenu { random_first: false, ..Default::default() };
            mouse.open(&r, &mut FixedRng(vec![], 0));
            mouse.page = page::WEAPONS;
            mouse.handle_key(pg, key, &r, &mut FixedRng(vec![], 0));
            assert_eq!(
                (dom.page, dom.category, dom.pending_weapon),
                (mouse.page, mouse.category, mouse.pending_weapon),
                "the DOM's click and the mouse's click end in the same state: {}",
                row.label
            );
            checked += 1;
        }
        assert!(checked > 5, "the test checked {checked} rows: it must check the columns' rows");
    }

    /// The page a row's key acts on is the column's page, and the dump reports it: the DOM
    /// sends the key there, so a parent column's row cannot act on the current page.
    #[test]
    fn a_row_reports_the_page_its_key_acts_on() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.page = page::WEAPONS;
        let rows = m.rows(&r);
        // The weapons column's rows answer on the weapons page; the category column's on the
        // category page; the main column's on the main page.
        let page_of = |label: &str| rows.iter().find(|row| row.label == label).map(|row| row.column.page());
        assert_eq!(page_of("Glock-18"), Some(page::WEAPONS), "the weapon row");
        assert_eq!(page_of("#Buy_Handguns"), Some(page::CATEGORY), "the category row");
        assert_eq!(page_of("#Buy_Buy"), Some(page::MAIN), "the main column's row");
        // The dump says the same, and the page it says is one the canvas draws.
        for (pg, _, _, dumped_page, _, _) in dump_rows(&m.state_lines(&r)) {
            let _ = pg;
            assert!(m.page_is_drawn(dumped_page), "the dump reports a page the canvas draws");
        }
    }

    /// The rows' text: the key, the label and the price, with the title keys resolved by the
    /// engine's titles.
    #[test]
    fn the_rows_text_is_what_the_canvas_draws() {
        ts30_gameplay::tables::make_default();
        let r = rules();
        let mut m = BuyMenu { random_first: false, ..Default::default() };
        m.open(&r, &mut FixedRng(vec![], 0));
        m.page = page::CATEGORY;
        let rows = m.rows(&r);
        assert_eq!(row_text(&rows[0], &r, &TestTitles), "1 Handguns");
        // The saved slots' titles carry their own number.
        m.page = page::SAVE;
        let rows = m.rows(&r);
        assert_eq!(row_text(&rows[0], &r, &TestTitles), "Save Equipment");
        assert_eq!(row_text(&rows[1], &r, &TestTitles), "Slot 1 Empty");
    }
}
