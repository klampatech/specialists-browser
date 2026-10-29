//! The pixel diff: the buy menu's rows, before and after the row extraction.
//!
//! The spec's acceptance test for the row extraction ([`docs/BUY-MENU-UI.md`]): the canvas buy
//! menu must render identically before and after -- same pages, same rows, same colours, same
//! positions.
//!
//! The "before" is [`super::buy_pixels_before`]: the drawing code exactly as it was at
//! `e91ec43`, with the two drawing calls turned into the same [`crate::menus::RowOp`]s the new
//! code produces. The "after" is [`crate::menus::row_ops`], the new code's own row model. The two
//! are compared over a matrix of menu states: every page, every category, weapons bought and
//! not, attachments on and off, saved slots, restricted weapons, and a config long enough for the
//! remove column to number its entries past nine.

#[cfg(test)]
mod tests {
    use super::super::buy_pixels_before;
    use crate::hud::text::Titles;
    use crate::menus::RowOp;
    use crate::menus::buy::{self, BuyMenu, Config, Entry, MenuRules, Rules};
    use crate::menus::row_ops;

    /// The titles the rows are resolved through. TS's own titles, so the diff compares real text
    /// (and the saved slots' `%i`, which the number is formatted into).
    struct DiffTitles;

    impl Titles for DiffTitles {
        fn get(&self, key: &str) -> Option<String> {
            Some(
                match key {
                    "Buy_Handguns" => "Handguns",
                    "Buy_SMGs" => "SMGs",
                    "Buy_Rifles" => "Rifles",
                    "Buy_Shotguns" => "Shotguns",
                    "Buy_SpecialPurpose" => "Special Purpose",
                    "Buy_EmptyConfig" => "Empty Config",
                    "Buy_UseNewConfig" => "Use New Config",
                    "Buy_UseLastConfig" => "Use Last Config",
                    "Buy_Buy" => "Buy",
                    "Buy_RemoveItem" => "Remove Item",
                    "Buy_ResetConfig" => "Reset Config",
                    "Buy_SaveConfig" => "Save Config",
                    "Buy_LoadConfig" => "Load Config",
                    "Buy_Random" => "Random",
                    "Buy_Cancel" => "Cancel",
                    "Buy_GoBack" => "Go Back",
                    "Buy_PlayerAccessory" => "Player Accessory",
                    "Buy_SaveEquipment" => "Save Equipment",
                    "Buy_LoadEquipment" => "Load Equipment",
                    "Buy_SlotEmpty" => "Slot %i (Empty)",
                    "Buy_SlotAvailable" => "Slot %i (Available)",
                    "Buy_Akimbo" => "Akimbo",
                    "Buy_FullLoad" => "Full Load",
                    "HUD_Silencer" => "Silencer",
                    "HUD_Lasersight" => "Laser Sight",
                    "HUD_Flashlight" => "Flashlight",
                    "HUD_Scope" => "Scope",
                    "Chg_ChangeTeam" => "Change Team",
                    "Chg_Join" => "Join",
                    "Chg_Cancel" => "Cancel",
                    _ => return None,
                }
                .to_owned(),
            )
        }
    }

    /// TS 2.1's fixed menu text, as the ruleset carries it.
    static FIXED_TEXT: &[(&str, &str)] = &[
        ("Buy_Handguns", "Handguns"),
        ("Buy_SMGs", "SMGs"),
        ("Buy_Rifles", "Rifles"),
        ("Buy_Shotguns", "Shotguns"),
        ("Buy_SpecialPurpose", "Special Purpose"),
        ("Buy_SlotEmpty", "Slot %i (Empty)"),
        ("Buy_SlotAvailable", "Slot %i (Available)"),
        ("Buy_GoBack", "Go Back"),
    ];

    /// TS 3.0's rules, as the port's defaults carry them.
    fn rules() -> Rules {
        Rules { restriction: 0x1f, ..Rules::default() }
    }

    /// TS 2.1's rules: the fixed text, the teamplay-only items and the shorter key range.
    fn rules21() -> Rules {
        Rules {
            restriction: 0x1f,
            gamemode: 3,
            menu: MenuRules { text: Some(FIXED_TEXT), items_need_teamplay: true, max_key: 10, ..MenuRules::default() },
            ..Rules::default()
        }
    }

    /// A config with the given entries: (id, attachment bits, count).
    fn config(entries: &[(i32, u32, i32)], total: i32, slots: i32) -> Config {
        let mut c = Config::default();
        for (i, &(id, att, count)) in entries.iter().enumerate() {
            c.entries[i] = Entry { is_item: false, id, att, cost: 0, akimbo: false, count };
        }
        c.total = total;
        c.slots = slots;
        c
    }

    /// A menu on a page, with the given config and pending weapon.
    fn menu(page: i32, current: Config) -> BuyMenu {
        BuyMenu { active: true, page, current, new_config: true, ..BuyMenu::default() }
    }

    /// The matrix of menu states the diff runs over.
    fn cases() -> Vec<(String, BuyMenu, Rules)> {
        let mut out = Vec::new();
        let r = rules();

        // The main page: an empty config, a config that is too expensive, and a config that fits.
        out.push(("main, empty".to_owned(), menu(buy::page::MAIN, Config::default()), r));
        out.push(("main, a config".to_owned(), menu(buy::page::MAIN, config(&[(13, 0, 0)], 3000, 10)), r));
        out.push(("main, too expensive".to_owned(), menu(buy::page::MAIN, config(&[(13, 0, 0)], 40000, 10)), r));
        let mut last = menu(buy::page::MAIN, config(&[(13, 0, 0)], 3000, 10));
        last.new_config = false;
        out.push(("main, the last config".to_owned(), last, r));

        // Every category, on its own page and with the weapons page open.
        for cat in 0..5 {
            let mut m = menu(buy::page::CATEGORY, Config::default());
            m.category = cat;
            out.push((format!("category {cat}"), m, r));
            let mut m = menu(buy::page::WEAPONS, Config::default());
            m.category = cat;
            out.push((format!("weapons {cat}"), m, r));
        }

        // The weapons page with the chosen weapon pending (the options page), with and without
        // attachments, and with a weapon that has an akimbo version and one that stacks.
        let mut m = menu(buy::page::OPTIONS, Config::default());
        m.pending_weapon = 13;
        out.push(("options, a rifle".to_owned(), m, r));
        let mut m = menu(buy::page::OPTIONS, Config::default());
        m.pending_weapon = 13;
        m.pending_att = 0b1010;
        out.push(("options, attachments".to_owned(), m, r));
        let mut m = menu(buy::page::OPTIONS, Config::default());
        m.pending_weapon = 2;
        out.push(("options, akimbo".to_owned(), m, r));
        let mut m = menu(buy::page::OPTIONS, Config::default());
        m.pending_weapon = 25;
        out.push(("options, a full load".to_owned(), m, r));

        // The items page: with and without the teamplay-only shoes.
        out.push(("items".to_owned(), menu(buy::page::ITEMS, Config::default()), r));
        let mut m = menu(buy::page::ITEMS, Config::default());
        m.category = 2;
        out.push(("items, a category chosen".to_owned(), m, r));

        // The remove page: a config with one entry, and one long enough for the entries to be
        // numbered past nine (the canvas numbers them in decimal, not in the key alphabet).
        out.push(("remove, one entry".to_owned(), menu(buy::page::REMOVE, config(&[(13, 0, 0)], 3000, 10)), r));
        let many = config(
            &[(1, 0, 0), (2, 0, 0), (3, 0, 0), (4, 0, 0), (5, 0, 0), (6, 0, 0), (7, 0, 0), (8, 0, 0), (9, 0, 0), (10, 0, 0), (11, 0, 0)],
            30000,
            80,
        );
        out.push(("remove, eleven entries".to_owned(), menu(buy::page::REMOVE, many), r));

        // The save and load pages, with saved slots empty, filled and too expensive.
        let mut m = menu(buy::page::SAVE, Config::default());
        m.saved[0] = config(&[(13, 0, 0)], 3000, 10);
        m.saved[1] = config(&[(25, 0, 5)], 500, 5);
        out.push(("save, two slots".to_owned(), m, r));
        let mut m = menu(buy::page::LOAD, Config::default());
        m.saved[0] = config(&[(13, 0, 0)], 3000, 10);
        m.saved[1] = config(&[(25, 0, 5)], 500, 5);
        out.push(("load, two slots".to_owned(), m, r));

        // The team page.
        out.push(("team".to_owned(), menu(buy::page::TEAM, Config::default()), r));

        // The same states under TS 2.1's rules: the fixed text and the teamplay-only items.
        let r21 = rules21();
        out.push(("2.1, main".to_owned(), menu(buy::page::MAIN, Config::default()), r21));
        out.push(("2.1, category".to_owned(), menu(buy::page::CATEGORY, Config::default()), r21));
        out.push(("2.1, items".to_owned(), menu(buy::page::ITEMS, Config::default()), r21));
        out.push(("2.1, weapons".to_owned(), menu(buy::page::WEAPONS, Config::default()), r21));
        let mut m = menu(buy::page::SAVE, Config::default());
        m.saved[0] = config(&[(13, 0, 0)], 3000, 10);
        out.push(("2.1, save".to_owned(), m, r21));

        // A ruleset that blocks every weapon: the weapon columns are empty.
        let blocked = Rules { restriction: 0, ..rules() };
        out.push(("blocked, weapons".to_owned(), menu(buy::page::WEAPONS, Config::default()), blocked));

        out
    }

    /// The rows the canvas drew before the extraction, for a menu state.
    fn before(m: &BuyMenu, r: &Rules) -> Vec<RowOp> {
        let mut ops = Vec::new();
        buy_pixels_before::draw_buy(&mut ops, m, r, [255, 255, 255], 480, &DiffTitles);
        ops
    }

    /// The rows the canvas draws now, for a menu state.
    fn after(m: &BuyMenu, r: &Rules) -> Vec<RowOp> {
        row_ops(m, r, [255, 255, 255], 480, &DiffTitles)
    }

    #[test]
    fn the_canvas_draws_the_same_rows_before_and_after_the_extraction() {
        ts30_gameplay::tables::make_default();
        for (name, m, r) in cases() {
            let before = before(&m, &r);
            let after = after(&m, &r);
            assert!(!before.is_empty(), "{name}: the case draws no rows at all");
            assert_eq!(before, after, "{name}: the canvas draws something else now");
        }
    }

    /// The diff must be able to see a difference: a row that moved or changed colour fails it.
    #[test]
    fn the_pixel_diff_notices_a_changed_row() {
        ts30_gameplay::tables::make_default();
        let m = menu(buy::page::CATEGORY, Config::default());
        let r = rules();
        let mut after = after(&m, &r);
        let before = before(&m, &r);
        after[0].x += 1;
        assert_ne!(before, after, "a row that moved is not the same picture");
    }
}
