/**
 * gamerules — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/gamerules__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_gamerules = "gamerules";


export interface ClassFieldMap_gamerules {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_gamerules = 39;

/** Names of decompiled methods (sorted). */
export const methodNames_gamerules = [
  "CTSGameRules__AddObjectiveInList_p_?_?",
  "CTSGameRules__CallCheckDeads",
  "CTSGameRules__CheckDeads",
  "CTSGameRules__CheckVotes",
  "CTSGameRules__ClearObjectiveList",
  "CTSGameRules__CountPlayers",
  "CTSGameRules__FindIndexByObjective_p_CTSObjective",
  "CTSGameRules__GetPlayerModel_p_CBasePlayer",
  "CTSGameRules__GetRandomPowerup_int",
  "CTSGameRules__GetTeamCash_p_CBasePlayer",
  "CTSGameRules__GetTeamIndex_p_?_?",
  "CTSGameRules__GetTeamsNum",
  "CTSGameRules__GlobalSlowMotion2_float_bool",
  "CTSGameRules__Init",
  "CTSGameRules__InitHUD_p_CBasePlayer",
  "CTSGameRules__InitObjectives",
  "CTSGameRules__InitTeamScore_p_?_int",
  "CTSGameRules__InitTeams",
  "CTSGameRules__IsCTB",
  "CTSGameRules__PlayerVote_p_?_?",
  "CTSGameRules__PutPowerUp_int",
  "CTSGameRules__ResetRestartRound_int",
  "CTSGameRules__RespawnEntities_bool",
  "CTSGameRules__RestartRound",
  "CTSGameRules__RoundTimeLeft",
  "CTSGameRules__SelectRandomTheOne",
  "CTSGameRules__SendObjectiveList_p_CBaseEntity",
  "CTSGameRules__SendObjectiveToHud_int_p_CBaseEntity",
  "CTSGameRules__SetGlobalSlowMotion_float_float",
  "CTSGameRules__SetObjective",
  "CTSGameRules__SetPlayerTheOne_p_CBasePlayer",
  "CTSGameRules__SetTeamList_p_?_?",
  "CTSGameRules__SetTeamModelList_int_p_?_?",
  "CTSGameRules__ShowObjectiveOnHud_p_?_?",
  "CTSGameRules__TeamWin_int_int_bool_?",
  "CTSGameRules__TheOneIsDead_p_?_?",
  "CTSGameRules__Think",
  "CTSGameRules__TogglePlayerFromSlow_p_CBasePlayer",
  "CTSGameRules__UpdateTeamScores_int_int",
] as const;
