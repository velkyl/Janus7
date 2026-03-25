// janus7/core/test/register-builtins.js (ESM)

import { buildImportFailedPlaceholder, normalizeTestDefinition } from './normalize.js';

/**
 * Registers the active built-in test set.
 * Welle 4 split: autorunnable built-ins and manual/release suites are declared separately
 * so the shipped inventory is visible without overstating automated coverage.
 */
export const BUILTIN_AUTO_MODULES = [

  // Phase 0
  './tests/p0/P0_TC_01__leitbild_konsistent.test.js',
  './tests/p0/P0_TC_02__architekturdiagramm_vollstaendig.test.js',
  './tests/p0/P0_TC_03__tech_stack_dokumentiert.test.js',

  // Phase 1
  './tests/p1/P1_TC_01__engine_wird_geladen.test.js',
  './tests/p1/P1_TC_02__state_registrierung_erfolgreich.test.js',
  './tests/p1/P1_TC_03__state_get_set_funktioniert.test.js',
  './tests/p1/P1_TC_04__state_transaktion_mit_rollback.test.js',
  './tests/p1/P1_TC_05__dirty_tracking_vermeidet_unnoetige_saves.test.js',
  './tests/p1/P1_TC_06__logger_level_dynamisch_aenderbar.test.js',
  './tests/p1/P1_TC_07__export_import_state.test.js',
  './tests/p1/P1_TC_08__import_validierung_blockiert_invalide_daten.test.js',
  './tests/p1/P1_TC_09__autosave_setting_funktioniert.test.js',
  './tests/p1/P1_TC_10__validator_erkennt_fehlende_pflichtfelder.test.js',
  './tests/p1/P1_TC_11__core_hooks_nur_in_janus_mjs.test.js',
  './tests/p1/P1_TC_12__phase7_feature_flag_setting_exists.test.js',
  './tests/p1/P1_TC_13__test_registry_rejects_duplicates.test.js',
  './tests/p1/P1_TC_14__capabilities_namespace.test.js',
  './tests/p1/P1_TC_15__capabilities_healthcheck_smoke.test.js',
  './tests/p1/P1_TC_16__runner_ok_shorthand_normalization.test.js',
  './tests/p1/P1_TC_17__folder_service_registered.test.js',

  // Phase 2
  './tests/p2/P2_TC_01__json_loader_laedt_akademie_daten.test.js',
  './tests/p2/P2_TC_02__lektionen_schema_validiert_korrekt.test.js',
  './tests/p2/P2_TC_03__npc_daten_referenzieren_dsa5_uuids.test.js',
  './tests/p2/P2_TC_04__caching_layer_verhindert_doppeltes_laden.test.js',
  './tests/p2/P2_TC_05__examen_fragen_aus_json_laden.test.js',
  './tests/p2/P2_TC_06__ort_beschreibungen_mehrsprachig.test.js',
  './tests/p2/P2_TC_07__academy_extended_schemas.test.js',
  './tests/p2/P2_TC_08__academy_reference_integrity_diagnostics.test.js',
  './tests/p2/P2_TC_09__exam_question_sets_resolvable.test.js',

  // Phase 3
  './tests/p3/P3_GC_TC_01__group_check_bridge.test.js',
  './tests/p3/P3_TC_01__dsa5_roll_api_funktioniert.test.js',
  './tests/p3/P3_TC_02__roll_modifikatoren_werden_angewendet.test.js',
  './tests/p3/P3_TC_03__actor_wrapper_isoliert_dsa5_logik.test.js',
  './tests/p3/P3_TC_04__combat_integration_optional.test.js',
  './tests/p3/P3_TC_05__item_bridge_fuer_zauberformeln.test.js',
  './tests/p3/P3_TC_12__dsa5_library_service_registered.test.js',
  './tests/p3/P3_TC_13__scene_regions_bridge_registered.test.js',
  './tests/p3/P3_TC_ADV_01__advancement_bridge.test.js',
  './tests/p3/P3_TC_BUFF_01__postroll_teacher_bonus.test.js',
  './tests/p3/P3_TC_FATE_01__fate_bridge.test.js',
  './tests/p3/P3_TC_FATE_02__fate_bridge_edge_cases.test.js',
  './tests/p3/P3_TC_MOON_01__moon_bridge.test.js',
  './tests/p3/P3_TC_MOON_02__moon_bridge_constants.test.js',
  './tests/p3/P3_TC_SOCIAL_01__personae_social_sync.test.js',
  './tests/p3/P3_TC_TIMED_01__timed_conditions.test.js',
  './tests/p3/P3_TRAD_TC_01__tradition_circle_mapping.test.js',
  './tests/p3/P3_TC_14__dsa5_resolver_contract.test.js',
  './tests/p3/P3_TC_15__dsa5_condition_bridge.test.js',
  './tests/p3/P3_TC_16__janus_to_dsa5_condition_map.test.js',

  // Phase 4
  './tests/p4/P4_TC_01__calendar_progression.test.js',
  './tests/p4/P4_TC_02__event_runner_emittiert_event_message.test.js',
  './tests/p4/P4_TC_03__scoring_rejects_non_finite.test.js',
  './tests/p4/P4_TC_04__social_attitude_clamped.test.js',
  './tests/p4/P4_TC_04__social_graph_beziehungen_tracken.test.js',
  './tests/p4/P4_TC_05__scoring_system_lektion_abgeschlossen.test.js',
  './tests/p4/P4_TC_06__automatische_ferien_erkennung.test.js',
  './tests/p4/P4_TC_07__roll_scoring_connector_canonical_hook.test.js',
  './tests/p4/P4_TC_08__cron_period_detection.test.js',
  './tests/p4/P4_TC_09__cron_service_registered.test.js',
  './tests/p4/P4_TC_10__time_reactor_registered.test.js',

  // Phase 4b
  './tests/p4b/P4B_TC_01__quest_start.test.js',
  './tests/p4b/P4B_TC_02__quest_node_progression.test.js',
  './tests/p4b/P4B_TC_03__quest_completion.test.js',
  './tests/p4b/P4B_TC_04-10.test.js',
  './tests/p4b/P4B_TC_11__living_world_scheduler.test.js',
  './tests/p4b/P4B_TC_12__living_world_tick.test.js',
  './tests/p4b/P4B_TC_13__academy_progression_registered.test.js',
  './tests/p4b/P4B_TC_14__academy_progression_data_loaded.test.js',
  './tests/p4b/P4B_TC_15__academy_stats_summary_available.test.js',

  // Phase 5
  './tests/p5/P5_TC_01__atmosphere_mvp.test.js',
  './tests/p5/P5_TC_02__playlist_steuerung_mood_studious.test.js',
  './tests/p5/P5_TC_03__zeit_des_tages_moods_morgens_abends.test.js',
  './tests/p5/P5_TC_04__overlay_ui_fuer_beamer_optionales_feature.test.js',

  // Phase 6
  './tests/p6/P6_TC_01__control_panel_oeffnet.test.js',
  './tests/p6/P6_TC_02__mcq_examen_ui_laedt_fragen.test.js',
  './tests/p6/P6_TC_03__dashboard_pc_uebersicht.test.js',
  './tests/p6/P6_TC_03__director_time_advance.test.js',
  './tests/p6/P6_TC_04__permissions.test.js',
  './tests/p6/P6_TC_04__quick_action_zeit_vorspulen.test.js',
  './tests/p6/P6_TC_05__responsive_layout_tablet_desktop.test.js',
  './tests/p6/P6_TC_06__i18n.test.js',
  './tests/p6/P6_TC_07__control_panel_open_close.test.js',
  './tests/p6/P6_TC_08__director_kernel_summary.test.js',
  './tests/p6/P6_TC_09__director_kernel_start_day.test.js',
  './tests/p6/P6_TC_10__control_panel_director_runtime_context.test.js',
  './tests/p6/P6_TC_11__director_control_panel_actions.test.js',
  './tests/p6/P6_TC_12__control_panel_director_workflow_context.test.js',
  './tests/p6/P6_TC_13__control_panel_director_workflow_memory.test.js',
  './tests/p6/P6_TC_14__control_panel_director_runbook_context.test.js',
  './tests/p6/P6_TC_15__director_control_panel_runbook_actions.test.js',
  './tests/p6/P6_TC_16__director_quest_accept_action_registered.test.js',
  './tests/p6/P6_TC_17__control_panel_quest_actor_and_social_context.test.js',
  './tests/p6/P6_TC_18__base_app_registered.test.js',
  './tests/p6/P6_TC_19__lesson_item_sheet_registered.test.js',
  './tests/p6/P6_TC_20__shell_app_registered.test.js',
  './tests/p6/P6_TC_21__shell_template_actions_present.test.js',
  './tests/p6/P6_TC_22__shell_panel_registry_seeded.test.js',

  // Phase 7
  './tests/p7/P7_TC_01__ai_export_bundle_valid.test.js',
  './tests/p7/P7_TC_02__ai_export_deterministic.test.js',
  './tests/p7/P7_TC_03__ai_import_invalid_schema.test.js',
  './tests/p7/P7_TC_04__ai_diff_detection.test.js',
  './tests/p7/P7_TC_05__ai_import_transactional.test.js',
  './tests/p7/P7_TC_06__ki_patch_preview.test.js',
  './tests/p7/P7_TC_07__ki_patch_apply.test.js',
  './tests/p7/P7_TC_08__ki_preflight_invalid_version.test.js',
  './tests/p7/P7_TC_09__ki_preflight_valid_shape.test.js',
  './tests/p7/P7_TC_10__ki_import_rejects_empty_patches.test.js',
  './tests/p7/P7_TC_A1__permission_enforced.test.js',
  './tests/p7/P7_TC_A2__ui_history_refresh_manual.test.js',
  './tests/p7/P7_TC_A3__export_uses_saveDataToFile.test.js',

  // Phase 15
  './tests/p15/P15_TC_01__kill_switch_settings_registriert.test.js',
  './tests/p15/P15_TC_02__io_roundtrip_export_import.test.js',
  './tests/p15/P15_TC_03__diagnostics_enthaelt_version_und_flags.test.js',
  './tests/p15/P15_TC_04__manual_store_roundtrip.test.js',
  './tests/p15/P15_TC_05__graph_service_registered.test.js',
  './tests/p15/P15_TC_06__graph_diagnostics_and_query_smoke.test.js',
  './tests/p15/P15_TC_07__graph_hooks_dirty.test.js',
  './tests/p15/P15_TC_08__graph_strict_diagnostics.test.js',
  './tests/p15/P15_TC_09__graph_dsa5_index_provider_smoke.test.js',
  './tests/p15/P15_TC_10__dsa5_index_hook_emission_smoke.test.js',
  './tests/p15/P15_TC_11__academy_graph_library_nodes.test.js',
  './tests/p15/P15_TC_12__graph_dsa5_semantic_edges.test.js',
  './tests/p15/P15_TC_13__asset_resolver_contract.test.js',
  './tests/p15/P15_TC_14__graph_cache_contract.test.js',
  './tests/p15/P15_TC_15__diagnostic_snapshot_contract.test.js',
  './tests/p15/P15_TC_16__control_panel_diagnostics_context.test.js',

  // Phase 16
  './tests/p16/P16_TC_01__apps_registriert.test.js',
  './tests/p16/P16_TC_02__scoring_view_parts.test.js',
  './tests/p16/P16_TC_03__gm_only_enforcement.test.js',
  './tests/p16/P16_TC_04__config_panel_scene_mappings.test.js',
  './tests/p16/P16_TC_05__config_panel_feature_flags.test.js',
  './tests/p16/P16_TC_06__academy_overview_slot_mapping.test.js',
  './tests/p16/P16_TC_07__social_view_director_path.test.js',
  './tests/p16/P16_TC_08__atmosphere_dj_api_chain.test.js',
  './tests/p16/P16_TC_09__state_inspector_json.test.js',
  './tests/p16/P16_TC_10__ui_open_all_apps.test.js',

];

export const BUILTIN_MANUAL_MODULES = [
  // Integration
  './tests/int/INT_TC_01__end_to_end_lektion_starten_abschliessen.test.js',
  './tests/int/INT_TC_02__ki_roundtrip_export_edit_import.test.js',
  './tests/int/INT_TC_03__multi_user_state_sync.test.js',
  './tests/int/INT_TC_04__beamer_control_panel_sync.test.js',

  // Performance
  './tests/perf/PERF_TC_01__state_load_unter_200ms.test.js',
  './tests/perf/PERF_TC_02__json_loader_cacht_effizient.test.js',
  './tests/perf/PERF_TC_03__ui_rendering_unter_16ms_60fps.test.js',

  // Regression
  './tests/reg/REG_TC_01__autosave_bug_aus_review.test.js',
  './tests/reg/REG_TC_02__import_ohne_validierung_aus_review.test.js',
  './tests/reg/REG_TC_03__unnoetiges_save_nach_load_aus_review.test.js',

  // Security
  './tests/sec/SEC_TC_01__import_validiert_alle_felder.test.js',
  './tests/sec/SEC_TC_02__keine_script_injection_in_ui.test.js',
  './tests/sec/SEC_TC_03__keine_dsa5_actor_manipulation_ohne_berechtigung.test.js',
  './tests/sec/SEC_TC_04__secure_randomness.test.js',
];

export const BUILTIN_TEST_MODULES = [
  ...BUILTIN_AUTO_MODULES,
  ...BUILTIN_MANUAL_MODULES
];

async function registerModuleList({ registry, logger, modules = [], bucket = 'unknown' } = {}) {
  let ok = 0;
  let failed = 0;

  for (const rel of modules) {
    try {
      const mod = await import(rel);
      const test = normalizeTestDefinition(mod?.default ?? {}, {
        suiteClass: 'binding',
        sourceFile: rel,
        registrationStatus: 'registered'
      });
      registry.register(test);
      ok += 1;
    } catch (err) {
      failed += 1;
      logger?.warn?.(`[TEST] builtin import failed (${bucket}): ${rel}`, { message: err?.message });
      registry.register(buildImportFailedPlaceholder(rel, err));
    }
  }

  return { ok, failed };
}

export default async function registerBuiltins({ registry, logger } = {}) {
  if (!registry?.register) return;

  const autoResult = await registerModuleList({
    registry,
    logger,
    modules: BUILTIN_AUTO_MODULES,
    bucket: 'auto'
  });

  const manualResult = await registerModuleList({
    registry,
    logger,
    modules: BUILTIN_MANUAL_MODULES,
    bucket: 'manual'
  });

  const ok = autoResult.ok + manualResult.ok;
  const failed = autoResult.failed + manualResult.failed;
  const autoCount = BUILTIN_AUTO_MODULES.length;
  const manualCount = BUILTIN_MANUAL_MODULES.length;

  logger?.info?.(`[TEST] Built-in tests registered: ${ok} ok, ${failed} failed (auto=${autoCount}, manual=${manualCount}).`);
}
