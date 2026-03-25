/**
 * Phase 4 → Phase 6 UI bridge
 *
 * Purpose:
 * - Keep Phase 4 headless: it emits HOOKS.EVENT_MESSAGE payloads.
 * - If enabled (client setting), render those payloads as ChatMessages.
 *
 * Architecture:
 * - Uses the canonical JANUS hook HOOKS.EVENT_MESSAGE (NOT a Foundry core hook).
 * - Foundry core hooks remain centralized in scripts/janus.mjs.
 */

import { JanusConfig } from '../../core/config.js';
import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
import { cleanupEngineHookBucket, registerEngineHook, registerRuntimeHook } from '../../core/hooks/runtime.js';

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
