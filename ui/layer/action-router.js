
import { JanusCommands } from '../commands/index.js';

async function _notifyResult(result, _fallbackLabel = 'JANUS7') {
  if (!result) return result;
  const ok = result.ok !== false;
  const summary = result.summary ?? result.message ?? null;
  if (summary) {
    if (ok) ui.notifications?.info?.(summary);
    else ui.notifications?.warn?.(summary);
  }
  return result;
}

async function _openQuestJournal() {
  const mod = await import('../../scripts/ui/quest-journal.js');
  const app = new mod.JanusQuestJournal();
  try { app.render?.({ force: true, focus: true }); } catch (_) { app.render?.(true); }
  return { ok: true, summary: 'Quest-Journal geöffnet.' };
}

export async function runShellAction(app, descriptor = {}) {
  const kind = descriptor.kind ?? 'noop';
  switch (kind) {
    case 'command': {
      const fn = JanusCommands?.[descriptor.command];
      if (typeof fn !== 'function') {
        return { ok: false, summary: `Befehl fehlt: ${descriptor.command}` };
      }
      const result = await fn(descriptor.dataset ?? {});
      return _notifyResult(result, descriptor.label);
    }
    case 'openApp': {
      const opened = game?.janus7?.ui?.open?.(descriptor.appKey, descriptor.options ?? {});
      if (!opened) return { ok: false, summary: `App konnte nicht geöffnet werden: ${descriptor.appKey}` };
      return { ok: true, summary: `${descriptor.label ?? descriptor.appKey} geöffnet.` };
    }
    case 'openPanel': {
      app?._setActivePanel?.(descriptor.panelId ?? null);
      return { ok: true };
    }
    case 'setView': {
      app?._setView?.(descriptor.viewId ?? 'director');
      return { ok: true };
    }
    case 'setViewState': {
      const key = String(descriptor.key ?? '').trim();
      if (!key) return { ok: false, summary: 'View-State-Key fehlt.' };
      const mode = String(descriptor.mode ?? 'set').trim().toLowerCase();
      const rawValue = descriptor.value ?? '';
      const current = app?._getViewState?.(descriptor.viewId ?? null) ?? {};
      let nextValue = rawValue;

      if (mode === 'delta') {
        nextValue = Number(current?.[key] ?? 0) + Number(rawValue ?? 0);
      } else if (mode === 'clear') {
        nextValue = '';
      }

      app?._setViewState?.(descriptor.viewId ?? null, { [key]: nextValue });
      return { ok: true };
    }
    case 'closePanel': {
      app?._setActivePanel?.(null);
      return { ok: true };
    }
    case 'panelAction': {
      switch (descriptor.action) {
        case 'graphInvalidate':
          try { game?.janus7?.graph?.cache?.invalidate?.(); } catch {}
          try { game?.janus7?.graph?.invalidate?.(); } catch {}
          app?.refresh?.();
          return { ok: true, summary: 'Graph-Cache invalidiert.' };
        case 'graphRebuild':
          try { await game?.janus7?.graph?.rebuild?.(); } catch {}
          try { game?.janus7?.graph?.cache?.invalidate?.(); } catch {}
          app?.refresh?.();
          return { ok: true, summary: 'Graph neu aufgebaut.' };
        case 'openQuestJournal':
          return _openQuestJournal();
        default:
          return { ok: false, summary: `Panel-Aktion unbekannt: ${descriptor.action}` };
      }
    }
    default:
      return { ok: false, summary: `Action-Kind unbekannt: ${kind}` };
  }
}

export default { runShellAction };
