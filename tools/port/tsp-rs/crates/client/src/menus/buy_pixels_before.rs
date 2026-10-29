//! The buy menu's rows, as the canvas drew them BEFORE the row extraction.
//!
//! This is the "before" half of the pixel diff: the drawing code exactly as it was at
//! `e91ec43` (the parent commit of the buy-menu work), with the two drawing calls turned into
//! the same [`RowOp`]s the new code produces. The row logic -- which rows, in which order, in
//! which column, at which position, in which colour and at which brightness -- is untouched.
//!
//! Generated from `tools/port/tsp-rs/crates/client/src/menus/mod.rs` at `e91ec43`.

use super::RowOp;
use crate::hud;
use crate::hud::draw::half;
use crate::hud::text::Titles;
use crate::menus::buy::{self, BuyMenu, Rules, page};
use shared::weapons;

/// The titles the rows are resolved through, as the canvas resolves them.
fn buy_text(r: &Rules, msg: &str, titles: &dyn Titles) -> String {
    buy::text(&r.menu, titles, msg)
}

struct Column<'a> {
    out: &'a mut Vec<RowOp>,
    titles: &'a dyn Titles,
    r: &'a Rules,
    x: i32,
    y: i32,
    page: i32,
    dim: bool,
}

impl Column<'_> {
    fn row(&mut self, text: &str, rgb: [i32; 3], key: i32) {
        let dim = self.dim;
        self.row_scaled(text, rgb, key, dim);
    }

    /// A row with its own brightness: TS draws the chosen category and weapon at full
    /// brightness in a dimmed column.
    fn row_scaled(&mut self, text: &str, rgb: [i32; 3], key: i32, dim: bool) {
        let (w, h) = (128, 20);
        let scale = if dim { 0.5 } else { 1.0 };
        let alpha = hud::draw::ftol(50.0 * scale);
        let text_rgb = rgb.map(|c| hud::draw::ftol(c as f64 * scale));
        self.out.push(RowOp {
            x: self.x,
            y: self.y,
            w,
            h,
            rgb,
            alpha,
            text_rgb,
            text: buy_text(self.r, text, self.titles),
            page: self.page,
            key,
            weapon_box: None,
        });
        self.y += h;
    }
}

const RED: [i32; 3] = [195, 45, 45];
const GREEN: [i32; 3] = [45, 195, 45];
const BACK: [i32; 3] = [100, 100, 205];

pub(crate) fn draw_buy(out: &mut Vec<RowOp>, b: &BuyMenu, r: &Rules, hud: [i32; 3], screen_h: i32, titles: &dyn Titles) {
    let hud2 = half(hud);
    let y0 = screen_h / 2;
    let fmt = hud::text::format;
    use crate::hud::text::Arg::I;
    if b.page == page::TEAM {
        let mut c = Column { out, titles, r, x: 8, y: y0, page: page::TEAM, dim: false };
        c.row("#Chg_ChangeTeam", GREEN, 0);
        c.row("1 #Chg_Join Specialists", hud2, 1);
        c.row("2 #Chg_Join Mercenaries", hud2, 2);
        c.row("0 #Chg_Cancel", BACK, 10);
        return;
    }
    let cur = &b.current;
    // Wrapping: a loaded `tsbuylist.tsa` config's totals can be anything (C int arithmetic).
    let affordable = |cost: i32, slots: i32| cost.wrapping_add(cur.total) <= r.cash && slots.wrapping_add(cur.slots) <= buy::SLOTS;

    // Columns are drawn child-first, parents after (each TS page function calls its parent).
    if b.page == page::OPTIONS {
        let id = b.pending_weapon;
        let base = buy::cost(id, b.pending_att, false, false);
        let mut c = Column { out, titles, r, x: 0x188, y: y0, page: page::OPTIONS, dim: false };
        c.row("1 #Buy_Buy", if affordable(base, buy::slots_for(id, false, false, r)) { GREEN } else { RED }, 1);
        let labels = ["#HUD_Silencer", "#HUD_Lasersight", "#HUD_Flashlight", "#HUD_Scope"];
        let prices = [900, 800, 500, 1800];
        for bit in 0..4 {
            if b.attachment_allowed(1 << bit) {
                // The label shows the attachment's own price; the colour tests base + attachment.
                let price = base.wrapping_add(prices[bit]);
                let text = fmt(&format!("%i {}  %i", labels[bit]), &[I(bit as i64 + 2), I(prices[bit] as i64)]);
                c.row(&text, if price.wrapping_add(cur.total) <= r.cash { hud2 } else { RED }, bit as i32 + 2);
            }
        }
        if let Some(w) = weapons::tables().weapon(id.max(0) as u8) {
            if w.akimbo != -1 {
                let ok = affordable(buy::cost(id, b.pending_att, true, false), w.slots * 2);
                c.row("6 #Buy_Akimbo", if ok { GREEN } else { RED }, 6);
            } else if w.stack {
                let ok = affordable(buy::cost(id, 0, true, false), w.slots * w.pellets);
                c.row("6 #Buy_FullLoad", if ok { GREEN } else { RED }, 6);
            }
        }
        c.row("0 #Buy_GoBack", BACK, 10);
    }
    if matches!(b.page, page::WEAPONS | page::OPTIONS) {
        let mut c = Column { out, titles, r, x: 0x108, y: y0, page: page::WEAPONS, dim: b.page != page::WEAPONS };
        for row in 0..12 {
            let id = buy::table(&r.menu)[row][b.category.clamp(0, 4) as usize];
            if id == -1 || buy::restricted(id, false, r) {
                continue;
            }
            let Some(w) = weapons::tables().weapon(id as u8) else { continue };
            let (key, ch) = if row < 9 { (row as i32 + 1, (b'1' + row as u8) as char) } else { (11, 'A') };
            let ok = affordable(w.cost, w.slots);
            // `0x10037ad4`: full brightness on the weapon page and for the chosen weapon.
            let dim = b.page != page::WEAPONS && id != b.pending_weapon;
            c.row_scaled(&format!("{ch} {}", w.name), if ok { hud2 } else { RED }, key, dim);
            // `0x10037b44..0x10037b57`: the box is drawn from the chosen weapon's row, so a
            // weapon that isn't listed (restricted since it was chosen) has none.
            if id == b.pending_weapon {
                c.out.last_mut().unwrap().weapon_box = Some(id);
            }
        }
        if b.page == page::WEAPONS {
            c.row("0 #Buy_GoBack", BACK, 10);
        }
    }
    if b.page == page::ITEMS {
        let mut c = Column { out, titles, r, x: 0x108, y: y0, page: page::ITEMS, dim: false };
        for (key, id, label, price) in [(1i32, buy::ITEM_KEVLAR, "Kevlar", 1900i32), (2, buy::ITEM_STEALTH, "Stealth Shoes", 700)] {
            if buy::restricted(id, true, r) {
                continue;
            }
            let slots = buy::slots_for(id, false, true, r);
            let text = fmt(&format!("%i {label}  %i"), &[I(key as i64), I(price as i64)]);
            let ok = if r.menu.items_red_by_cash_only { price.wrapping_add(cur.total) <= r.cash } else { affordable(price, slots) };
            c.row(&text, if ok { hud2 } else { RED }, key);
        }
        c.row("0 #Buy_GoBack", BACK, 10);
    }
    if matches!(b.page, page::CATEGORY | page::WEAPONS | page::OPTIONS | page::ITEMS) {
        let mut c = Column { out, titles, r, x: 0x88, y: y0, page: page::CATEGORY, dim: b.page != page::CATEGORY };
        for (i, name) in buy::CATEGORIES.iter().enumerate() {
            // `0x1003788c`: the chosen category keeps full brightness.
            let dim = b.page != page::CATEGORY && i as i32 != b.category;
            c.row_scaled(&format!("{} {name}", i + 1), hud2, i as i32 + 1, dim);
        }
        if !r.menu.items_need_teamplay || r.gamemode > 1 {
            c.row("6 #Buy_PlayerAccessory", hud2, 6);
        }
        if b.page == page::CATEGORY {
            c.row("0 #Buy_GoBack", BACK, 10);
        }
    }
    if b.page == page::REMOVE {
        let mut c = Column { out, titles, r, x: 0x88, y: y0, page: page::REMOVE, dim: false };
        for (i, e) in cur.entries.iter().enumerate().filter(|(_, e)| e.id != 0) {
            c.row(&format!("{} {}", i + 1, BuyMenu::entry_name(e)), hud2, i as i32 + 1);
        }
        c.row("0 #Buy_GoBack", BACK, 10);
    }
    if matches!(b.page, page::SAVE | page::LOAD) {
        let save = b.page == page::SAVE;
        let mut c = Column { out, titles, r, x: 0x88, y: y0, page: b.page, dim: false };
        c.row(if save { "#Buy_SaveEquipment" } else { "#Buy_LoadEquipment" }, GREEN, 0);
        for (i, s) in b.saved.iter().enumerate() {
            let key = if s.total < 1 { "#Buy_SlotEmpty" } else { "#Buy_SlotAvailable" };
            let text = fmt(&buy_text(r, key, titles), &[I(i as i64 + 1)]);
            let red = !save && s.total > r.cash;
            c.row(&text, if red { RED } else { hud2 }, i as i32 + 1);
        }
        c.row("0 #Buy_GoBack", BACK, 10);
    }
    // Main page.
    let mut c = Column { out, titles, r, x: 8, y: y0, page: page::MAIN, dim: b.page != page::MAIN };
    if cur.total < 1 {
        c.row("1 #Buy_EmptyConfig", RED, 1);
    } else {
        let t = if b.new_config { "1 #Buy_UseNewConfig" } else { "1 #Buy_UseLastConfig" };
        c.row(t, if r.cash.wrapping_sub(cur.total) < 0 { RED } else { GREEN }, 1);
    }
    c.row("2 #Buy_Buy", hud2, 2);
    c.row("3 #Buy_RemoveItem", hud2, 3);
    c.row("4 #Buy_ResetConfig", hud2, 4);
    c.row("5 #Buy_SaveConfig", hud2, 5);
    c.row("6 #Buy_LoadConfig", hud2, 6);
    c.row("7 #Buy_Random", GREEN, 7);
    if b.page == page::MAIN {
        c.row("0 #Buy_Cancel", BACK, 10);
    }
}
