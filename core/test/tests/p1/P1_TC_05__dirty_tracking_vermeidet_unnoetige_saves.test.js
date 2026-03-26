export default {
  id: "P1-TC-05",
  title: "Dirty-Tracking vermeidet unnötige Saves",
  phases: [1],
  kind: "auto",
  expected: "Identische Set-Operationen toggeln _dirty nicht und verändern updatedAt nicht.",
  whereToFind: "JanusStateCore._dirty / save()",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const state = engine?.core?.state;
    if (!state) return { ok: false, summary: "State fehlt" };

    const targetPath = "time.phase";
    const beforeValue = state.getPath(targetPath);
    const beforeUpdatedAt = state.getPath("meta.updatedAt");
    const beforeDirty = !!state._dirty;

    let observed = null;
    try {
      await state.transaction((s) => {
        s._dirty = false;
        const txBeforeUpdatedAt = s.getPath("meta.updatedAt");
        const txBeforeValue = s.getPath(targetPath);
        const txResult = s.set(targetPath, txBeforeValue);
        observed = {
          txBeforeUpdatedAt,
          txAfterUpdatedAt: s.getPath("meta.updatedAt"),
          txDirty: !!s._dirty,
          txResult
        };
        const rollback = new Error("JANUS_TEST_ROLLBACK");
        rollback.name = "JanusTestRollback";
        throw rollback;
      }, { silent: true });
    } catch (_err) {
      // silent rollback expected
    }

    const afterValue = state.getPath(targetPath);
    const afterUpdatedAt = state.getPath("meta.updatedAt");
    const afterDirty = !!state._dirty;

    const ok = observed
      && observed.txDirty === false
      && observed.txBeforeUpdatedAt === observed.txAfterUpdatedAt
      && observed.txResult === beforeValue
      && afterValue === beforeValue
      && afterUpdatedAt === beforeUpdatedAt
      && afterDirty === beforeDirty;

    if (!ok) {
      return {
        ok: false,
        summary: `Idempotent set verletzt Dirty-/Meta-Vertrag (txDirty=${observed?.txDirty}, txBeforeUpdatedAt=${observed?.txBeforeUpdatedAt ?? 'null'}, txAfterUpdatedAt=${observed?.txAfterUpdatedAt ?? 'null'}, afterDirty=${afterDirty}, beforeDirty=${beforeDirty})`
      };
    }

    return {
      ok: true,
      summary: "Identisches state.set() bleibt clean und lässt updatedAt unverändert."
    };
  }
};
