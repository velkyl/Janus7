import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

function normalizeHookStatus(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'completed') return 'completed';
  if (key === 'discarded') return 'discarded';
  return 'queued';
}

function hookStatusLabel(status) {
  const key = normalizeHookStatus(status);
  if (key === 'completed') return 'Abgeschlossen';
  if (key === 'discarded') return 'Verworfen';
  return 'Vorgemerkt';
}

export class JanusSocialStoryHookService {
  constructor({ engine, logger, state } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
    this.state = state ?? this.engine?.core?.state ?? null;
  }

  _getRoot() {
    return foundry.utils.deepClone(this.state?.get?.('academy.social.storyHooks') ?? { records: {}, history: [] });
  }

  async queueHook({ hookId, title, detail, priorityLabel, fromId = null, toId = null, source = 'session-prep' } = {}) {
    const id = String(hookId ?? '').trim();
    if (!id) throw new Error('hookId fehlt');

    const now = new Date().toISOString();
    await this.state.transaction(async (tx) => {
      const root = foundry.utils.deepClone(tx.get('academy.social.storyHooks') ?? { records: {}, history: [] });
      root.records = root.records ?? {};
      root.history = Array.isArray(root.history) ? root.history : [];
      root.records[id] = {
        ...(root.records[id] ?? {}),
        hookId: id,
        title: String(title ?? '').trim() || 'Social-Story-Hook',
        detail: String(detail ?? '').trim() || '—',
        priorityLabel: String(priorityLabel ?? '').trim() || 'Living-World-Dynamik',
        fromId: String(fromId ?? '').trim() || null,
        toId: String(toId ?? '').trim() || null,
        source: String(source ?? 'session-prep').trim() || 'session-prep',
        status: 'queued',
        queuedAt: root.records[id]?.queuedAt ?? now,
        updatedAt: now
      };
      root.history.unshift({
        hookId: id,
        actionLabel: `Story-Hook vorgemerkt: ${String(title ?? '').trim() || id}`,
        changedAt: now,
        status: 'queued'
      });
      root.history = root.history.slice(0, 20);
      tx.set('academy.social.storyHooks', root);
    });

    const root = this._getRoot();
    this._emitHookChange({ action: 'queued', hookId: id, record: root?.records?.[id] ?? null });
    return root;
  }

  async setHookStatus({ hookId, status } = {}) {
    const id = String(hookId ?? '').trim();
    if (!id) throw new Error('hookId fehlt');

    const nextStatus = normalizeHookStatus(status);
    const now = new Date().toISOString();
    await this.state.transaction(async (tx) => {
      const root = foundry.utils.deepClone(tx.get('academy.social.storyHooks') ?? { records: {}, history: [] });
      root.records = root.records ?? {};
      root.history = Array.isArray(root.history) ? root.history : [];
      const existing = root.records[id] ?? null;
      if (!existing) throw new Error(`Story-Hook nicht gefunden: ${id}`);
      root.records[id] = {
        ...existing,
        status: nextStatus,
        updatedAt: now
      };
      root.history.unshift({
        hookId: id,
        actionLabel: `Story-Hook ${hookStatusLabel(nextStatus).toLowerCase()}: ${existing?.title ?? id}`,
        changedAt: now,
        status: nextStatus
      });
      root.history = root.history.slice(0, 20);
      tx.set('academy.social.storyHooks', root);
    });

    const root = this._getRoot();
    this._emitHookChange({ action: nextStatus, hookId: id, record: root?.records?.[id] ?? null });
    return root;
  }

  _emitHookChange({ action = 'queued', hookId = null, record = null } = {}) {
    try {
      emitHook(HOOKS.STORY_HOOK_CHANGED, {
        action,
        hookId: String(hookId ?? '').trim() || null,
        status: normalizeHookStatus(record?.status ?? action),
        title: record?.title ?? null,
        fromId: record?.fromId ?? null,
        toId: record?.toId ?? null,
        updatedAt: record?.updatedAt ?? null,
      });
    } catch (err) {
      this.logger?.warn?.('[JANUS7][SocialStoryHooks] janus7StoryHookChanged hook error', err);
    }
  }
}

export default JanusSocialStoryHookService;
