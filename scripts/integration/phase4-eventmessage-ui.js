/**
 * @file scripts/integration/phase4-eventmessage-ui.js
 * @phase 6 (UI-Concern)
 *
 * Phase 4 → Phase 6 UI bridge
 *
 * Purpose:
 * - Keep Phase 4 headless: it only emits internal HOOKS.EVENT_MESSAGE payloads.
 * - This file (Phase 6 concern) listens to those payloads and renders ChatMessages.
 *
 * Architecture:
 * - ONLY loaded when enableUI=true (Phase 6 gate in scripts/janus.mjs).
 * - Uses ONLY internal JANUS hooks (HOOKS.EVENT_MESSAGE, HOOKS.ENGINE_READY, HOOKS.DATE_CHANGED).
 *   NEVER registers Foundry core hooks directly – those stay in scripts/janus.mjs.
 * - Imports ONLY from Phase ≤1 modules (core/hooks, core/config) — no Phase 4 imports.
 *   Phase-Isolation-Vertrag: Phase N darf nur Phase ≤N importieren.
 *
 * Data flow:
 *   Phase 4 engine → emitHook(HOOKS.EVENT_MESSAGE) → this file → ChatMessage.create()
 */

import { JanusConfig, emitHook, HOOKS, cleanupEngineHookBucket, registerEngineHook, registerRuntimeHook } from '../core/public-api.mjs';

const TAG = '[JANUS7][EventMessageUI]';

registerRuntimeHook('janus7:ready:eventmessage-ui', HOOKS.ENGINE_READY, (engine) => {
  const logger = engine?.core?.logger;
  try {
    if (!engine) return;

    cleanupEngineHookBucket(engine, '_eventMessageUiHookIds');

    registerEngineHook(engine, '_eventMessageUiHookIds', HOOKS.EVENT_MESSAGE, async (payload = {}) => {
      try {
        if (!JanusConfig.get('uiEventMessagesToChat')) return;
        if (!payload?.content) return;

        // Respect permissions: allow players to see if they enabled it,
        // but avoid creating spam for non-GM unless they explicitly opted in.
        const speaker = ChatMessage.getSpeaker?.() ?? {};
        await ChatMessage.create({
          user: game.userId,
          speaker,
          content: String(payload.content),
          flags: {
            janus7: {
              kind: 'eventMessage',
              mode: payload?.mode ?? null,
              eventId: payload?.event?.id ?? payload?.event?.key ?? null,
              slot: payload?.slot ?? null,
              reason: payload?.reason ?? null
            }
          }
        });
      } catch (err) {
        (logger ?? console).warn?.(TAG, 'ChatMessage render failed:', err);
      }
    });

    registerEngineHook(engine, '_eventMessageUiHookIds', HOOKS.DATE_CHANGED, async (payload = {}) => {
      try {
        const eventsApi = engine?.simulation?.events ?? engine?.academy?.events ?? engine?.events ?? null;
        const slot = payload?.current ?? payload?.slot ?? engine?.calendar?.getCurrentSlotRef?.() ?? null;
        if (!eventsApi?.listEventsForSlot || !slot) return;
        const events = await Promise.resolve(eventsApi.listEventsForSlot(slot) ?? []);
        const candidate = (events || []).find((ev) => {
          const mode = String(ev?.autoMode ?? '').toLowerCase();
          return (mode === 'soft' || mode === 'hard' || ev?.auto === true) && (ev?.chatText || ev?.description);
        });
        if (!candidate) return;
        const body = String(candidate.chatText ?? candidate.description ?? '').trim();
        if (!body) return;
        const title = String(candidate.name ?? candidate.title ?? candidate.eventId ?? 'Event');
        const content = `<div class="janus7-event-message"><h3>${title}</h3><p>${body}</p></div>`;
        emitHook(HOOKS.EVENT_MESSAGE, {
          content,
          mode: candidate?.autoMode ?? null,
          event: candidate,
          slot,
          reason: payload?.reason ?? null
        });
      } catch (err) {
        (logger ?? console).warn?.(TAG, 'event-message emitter failed:', err);
      }
    });
  } catch (err) {
    (logger ?? console).warn?.(TAG, 'init failed:', err);
  }
});
