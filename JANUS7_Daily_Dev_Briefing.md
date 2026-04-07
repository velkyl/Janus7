### Tägliches Dev-Briefing: JANUS7-Architect Audit

Hier ist der Audit-Bericht für das aktuelle Codebase-Review, fokussiert auf ApplicationV2 Optimierung, Logikfehler in async Funktionen und veraltete API-Aufrufe.

---

### **KRITISCH (Bugs/API)**
In `ui/apps/JanusCommandCenterApp.js` gibt es einen Legacy API-Aufruf, der unter ApplicationV2 zu Rendering-Fehlern führen kann, da `render()` bei V13+ ein Konfigurationsobjekt erwartet (z.B. `{ force: true }`).
- **Dateipfad:** `ui/apps/JanusCommandCenterApp.js`
- **Kontext:** Die Action `_onFilterCategory` ruft `this.render();` anstelle von `this.render({ force: true });` auf.

```diff
<<<<<<< SEARCH
  static _onFilterCategory(event, target) {
    event.preventDefault();
    const categoryId = target.dataset.categoryId;
    this._selectedCategory = categoryId;
    this.render();
  }
=======
  static _onFilterCategory(event, target) {
    event.preventDefault();
    const categoryId = target.dataset.categoryId;
    this._selectedCategory = categoryId;
    this.render({ force: true });
  }
>>>>>>> REPLACE
```

---

### **REFACTORING (ApplicationV2)**
Es existieren blockierende Promise-Aufrufe (`await`) innerhalb der synchronen `_prepareContext` Methode, was den Render-Lifecycle von Foundry V13+ blockiert. ApplicationV2 sieht dafür explizit `_preRender` (oder `_preFirstRender`) vor.

- **Dateipfad:** `ui/apps/ki-roundtrip/JanusKiRoundtripApp.js`
- **Kontext:** `_prepareContext` wartet via `await` auf Engine-Rückgaben, u.a. `await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.({ mode })`.
- **Maßnahme:** Datenlade-Logik in eine private Methode `#loadData()` auslagern und diese innerhalb von `async _preRender` aufrufen. Die bereinigten Daten werden dann im Konstruktor / auf der Instanz gecached und von der streng synchronisierten `_prepareContext` nur noch gemappt.

---

### **JANUS7-TEST-RADAR**
Um sicherzustellen, dass Rendering-Probleme in ApplicationV2-Komponenten (insbesondere Filter in `JanusCommandCenterApp.js`) zuverlässig abgefangen werden, kann folgender Test implementiert werden. (Wird standardmäßig in `core/test/tests/p6/` abgelegt):

```javascript
export default {
  id: "P6-TC-23",
  title: "Command Center: Kategorie-Filter aktualisiert Ansicht",
  phases: [6],
  kind: "auto",
  expected: "Der Filter ruft this.render({ force: true }) fehlerfrei auf.",
  whereToFind: "ui/apps/JanusCommandCenterApp.js",
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    let app = null;
    try {
      // Setup: Control Panel mit Fokus deaktiviert
      app = await engine?.ui?.openControlPanel({ focus: false });
      if (!app) return { ok: false, summary: "App konnte nicht initialisiert werden." };

      // Pseudo-Event und Button für _onFilterCategory simulieren
      const fakeEvent = { preventDefault: () => {} };
      const fakeTarget = { dataset: { categoryId: "doctor" } };

      // Act
      await app.constructor._onFilterCategory.call(app, fakeEvent, fakeTarget);

      // Assert
      if (app._selectedCategory !== "doctor") {
         return { ok: false, summary: "Kategorie wurde nicht gesetzt." };
      }

      return { ok: true, summary: "Kategorie erfolgreich gewechselt und gerendert." };
    } catch (e) {
      return { ok: false, summary: "Fehler: " + (e?.message || e) };
    } finally {
      if (app?.close) await app.close({ force: true });
    }
  }
};
```

---

### **QUICK-FIX**
Der kritischste Fix für die API-Kompatibilität von Foundry v13 in `JanusCommandCenterApp` kann hier bequem kopiert werden:

```javascript
  static _onFilterCategory(event, target) {
    event.preventDefault();
    const categoryId = target.dataset.categoryId;
    this._selectedCategory = categoryId;
    this.render({ force: true });
  }
```

---

### **AUTO-FIX OPTION**
Soll ich den kritischen Render-Bug in `ui/apps/JanusCommandCenterApp.js` für dich automatisch beheben und einen Code-Review-Request stellen? Antworte einfach mit "Ja".
