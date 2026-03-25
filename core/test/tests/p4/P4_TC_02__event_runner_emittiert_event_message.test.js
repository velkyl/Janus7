import { emitHook, HOOKS } from '../../../../core/hooks/emitter.js';

export default {
  id: 'P4-TC-02',
  title: 'Event Runner emittiert janus7EventMessage (headless)',
  phases: [4],
  kind: 'auto',
  expected: 'Beim janus7DateChanged feuert der Event Runner janus7EventMessage, wenn ein Auto-Event chatText/description hat.',
  whereToFind: 'academy/phase4.js (Event Runner)',
  async run(_ctx) {
    const engine = game?.janus7;
    const calendar = engine?.simulation?.calendar;
    const events = engine?.simulation?.events;
    if (!engine || !calendar || !events) {
      return { ok: false, summary: 'engine/simulation/calendar/events missing (is Phase 4 enabled?)' };
    }

    const slot = calendar.getCurrentSlotRef?.();
    if (!slot) return { ok: false, summary: 'calendar.getCurrentSlotRef() returned null' };

    let received = null;
    const listenerId = Hooks.on('janus7EventMessage', (payload) => { received = payload; });

    // Monkeypatch: ensure listEventsForSlot returns a soft auto-event with chatText
    const origList = events.listEventsForSlot?.bind(events);
    events.listEventsForSlot = (_slot) => ([{
      id: 'EVT_TEST_AUTO_SOFT',
      name: 'Test Auto Event',
      autoMode: 'soft',
      impact: 'flavor',
      chatText: 'Hello from test.'
    }]);

    try {
      emitHook(HOOKS.DATE_CHANGED, { current: slot, reason: 'test' });
      // Wait one tick to allow async handler to run
      await new Promise(r => setTimeout(r, 0));

      if (!received?.content) {
        return { ok: false, summary: 'No janus7EventMessage received (missing payload.content)' };
      }
      if (!String(received.content).includes('Test Auto Event')) {
        return { ok: false, summary: 'janus7EventMessage content did not include event name' };
      }

      return { ok: true, summary: 'janus7EventMessage emitted with HTML content' };
    } catch (err) {
      return { ok: false, summary: `Test failed: ${err?.message ?? err}` };
    } finally {
      try { Hooks.off('janus7EventMessage', listenerId); } catch (_) {}
      if (origList) events.listEventsForSlot = origList;
    }
  }
};
