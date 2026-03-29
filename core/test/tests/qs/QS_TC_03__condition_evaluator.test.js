export default {
  id: "QS-TC-03",
  title: "Condition Evaluator Parsing & Execution",
  phases: [4],
  kind: "auto",
  expected: "Logische Parser-Anfragen und DSA5 CHECK(...) Statements werden sauber interpretiert.",
  whereToFind: "game.janus7.academy.conditions",
  async run(ctx) {
    const engine = ctx?.engine ?? globalThis.game?.janus7;
    const condEngine = engine?.academy?.conditions;
    if (!condEngine) return { ok: false, summary: "JanusConditionEvaluator fehlt" };

    const actorId = "Actor.QSTestCond";

    // 1. Simple Logicals Test (leerer Actor sollte bei einfachen Math / Logik Dingen klappen)
    // Wenn 'true' -> ok. Wenn leere String -> true (laut Code: Empty expressions always return true).
    try {
      const p1 = await condEngine.evaluate("", { actorId });
      if (p1 !== true) return { ok: false, summary: "Leerer String evaluierte nicht auf true." };

      const p2 = await condEngine.evaluate("true", { actorId }); // boolean true im parser
      if (p2 !== true) return { ok: false, summary: "'true' evaluierte nicht auf true." };
    } catch (e) {
      return { ok: false, summary: `AST Parser throwed (logical): ${e.message}` };
    }

    // 2. CHECK() DSA5 Integration Mocking
    // Wir mocken dsa5Bridge.roll und sehen ob er gerufen wird.
    const originalRoll = condEngine.dsa5Bridge?.roll;
    let rollCalled = false;
    let rollArgs = null;
    
    if (condEngine.dsa5Bridge) {
      condEngine.dsa5Bridge.roll = async (args) => {
        rollCalled = true;
        rollArgs = args;
        return { qualityLevel: 2 }; // Erfolgreicher Wurf
      };
    }

    try {
      const p3 = await condEngine.evaluate("CHECK(Magiekunde, 13)", { actorId });
      if (condEngine.dsa5Bridge) {
         if (!rollCalled || rollArgs.difficulty !== 13 || rollArgs.talentId !== "skill_magicallore") {
            return { ok: false, summary: `CHECK Parser reichte Argumente nicht korrekt an dsa5Bridge weiter: ${JSON.stringify(rollArgs)}` };
         }
         if (p3 !== true) return { ok: false, summary: "CHECK mit QL 2 evaluierte auf false." };
      }
    } catch (e) {
      return { ok: false, summary: `CHECK Parser throwed: ${e.message}` };
    } finally {
      if (condEngine.dsa5Bridge) {
        condEngine.dsa5Bridge.roll = originalRoll;
      }
    }

    return { ok: true, summary: "Logische Evaluierung und CHECK(...) Roll-Delegator parsen die Expressions korrekt." };
  }
};
