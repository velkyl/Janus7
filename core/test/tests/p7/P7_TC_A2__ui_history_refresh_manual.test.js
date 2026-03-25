/**
 * P7_TC_A2 — UI History Refresh (Manual)
 *
 * Verifies that the Phase 7 Roundtrip Apps refresh their History/Diff panels
 * reliably after Apply and after loading a file.
 */

export default {
  id: 'P7-TC-A2',
  title: 'Roundtrip UI refreshes history/diff reliably after apply/load',
  phases: [7],
  kind: 'manual',
  priority: 'P0',
  expected: 'After Apply/LoadFile, history updates immediately (no stale context) and diff box clears.',
  whereToFind: 'UI: Control Panel → KI Roundtrip (Phase 7)',
  async run() {
    console.log('[P7-TC-A2] MANUAL TEST');
    console.log('Steps:');
    console.log('1) Open KI Roundtrip: JanusKiRoundtripApp.showSingleton()');
    console.log('2) Paste a valid JANUS_KI_RESPONSE_V1 into textarea with at least one change.');
    console.log('3) Click "Apply Import" (as GM).');
    console.log('   EXPECT: History list updates immediately, diff box clears, no need to close/reopen.');
    console.log('4) Export (Download JSON) once, then put a modified response into worlds/<world>/janus7/io/inbox/.');
    console.log('5) In app, click "Browse…" and select the JSON from inbox, then click "Load File".');
    console.log('   EXPECT: History updates immediately.');
  }
};
