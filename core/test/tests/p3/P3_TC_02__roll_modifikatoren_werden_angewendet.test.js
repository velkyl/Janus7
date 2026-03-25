export default {
  id: 'P3-TC-02',
  title: 'bridgeRollTest reicht Roll-Modifikatoren an die Bridge weiter',
  phases: [3],
  kind: 'auto',
  expected: 'game.janus7.commands.bridgeRollTest({ modifier }) uebergibt den numerischen Modifier an bridge.rollSkill(...).',

  async run({ engine }) {
    if (!game?.user?.isGM) {
      return {
        ok: true,
        status: 'SKIP',
        summary: 'SKIP: GM-Kontext erforderlich, da bridgeRollTest permission-gated ist.',
      };
    }

    const command = game?.janus7?.commands?.bridgeRollTest;
    const bridge = engine?.bridge?.dsa5 ?? game?.janus7?.bridge?.dsa5 ?? null;
    if (typeof command !== 'function') {
      return { ok: false, summary: 'bridgeRollTest-Command nicht verfuegbar.' };
    }
    if (!bridge || typeof bridge.rollSkill !== 'function') {
      return { ok: false, summary: 'DSA5-Bridge oder rollSkill() nicht verfuegbar.' };
    }

    const originalRollSkill = bridge.rollSkill;
    let captured = null;

    try {
      bridge.rollSkill = async (actorRef, skillRef, options = {}) => {
        captured = { actorRef, skillRef, options };
        return { success: true, quality: 1, raw: null, context: { type: 'skill' } };
      };

      const actorId = 'Actor.test_p3_tc_02';
      const skillName = 'Magiekunde';
      const result = await command({ actorId, skillName, modifier: '3' });

      const ok = result?.success === true
        && captured?.actorRef === actorId
        && captured?.skillRef === skillName
        && captured?.options?.modifier === 3;

      if (!ok) {
        return {
          ok: false,
          summary: `Modifier nicht korrekt weitergereicht (success=${result?.success ?? 'null'}, actor=${captured?.actorRef ?? 'null'}, skill=${captured?.skillRef ?? 'null'}, modifier=${captured?.options?.modifier ?? 'null'})`,
        };
      }

      return {
        ok: true,
        summary: 'bridgeRollTest leitet modifier=3 korrekt an bridge.rollSkill weiter.',
      };
    } catch (err) {
      return {
        ok: false,
        summary: `P3-TC-02 Exception: ${err?.message ?? err}`,
      };
    } finally {
      bridge.rollSkill = originalRollSkill;
    }
  }
};
