export class JanusContentSuggestionService {
  constructor({ engine, logger } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
  }

  buildSeeds({ slotRef, currentSlot, activeLocation, quests }) {
    const lesson = currentSlot?.lessons?.[0] ?? null;
    const exam = currentSlot?.exams?.[0] ?? null;
    const event = currentSlot?.events?.[0] ?? null;
    const quest = quests?.items?.[0] ?? null;
    const place = activeLocation?.name ?? 'der aktuelle Ort';
    const time = `${slotRef?.day ?? 'Unbekannter Tag'} / ${slotRef?.phase ?? 'Unbekannte Phase'}`;

    const seeds = [];

    seeds.push({
      id: 'scene-hook',
      title: 'Szenenaufhänger',
      text: `Ort: ${place}. Zeit: ${time}.\n\nAufhänger: Eine scheinbar routinierte Szene kippt, als ein kleines Detail nicht zum erwarteten Akademiealltag passt. Beschreibe zuerst Atmosphäre, dann den Bruch, dann eine direkte Entscheidung für die Spieler.`
    });

    seeds.push({
      id: 'complication',
      title: 'Komplikation / Twist',
      text: `Komplikation für ${place}:\n- Eine Autoritätsperson verlangt sofortige Erklärung oder Gehorsam.\n- Ein Hilfsmittel, Dokument oder Fokus fehlt im falschen Moment.\n- Ein NSC deutet an, mehr zu wissen, verschweigt aber den Preis seiner Hilfe.`
    });

    if (lesson || exam) {
      const topic = lesson?.title ?? exam?.title ?? 'Unterricht';
      seeds.push({
        id: 'teaching-beat',
        title: 'Unterrichts-/Prüfungsbeat',
        text: `Thema: ${topic}.\n\nBeat-Struktur:\n1. Fachliche Erklärung in 2-3 Sätzen.\n2. Praktische Herausforderung oder Demonstration.\n3. Persönlicher Einsatz: Wer riskiert Ansehen, Fehler oder Erkenntnis?\n4. Konsequenz bei Erfolg/Misserfolg.`
      });
    }

    if (quest) {
      seeds.push({
        id: 'quest-followup',
        title: 'Quest-Fortsetzung',
        text: `Aktive Quest: ${quest.title}. Aktueller Knoten: ${quest.currentNodeTitle ?? quest.currentNodeId ?? 'unbekannt'}.\n\nVorschlag: Erzeuge eine kurze Anschluss-Szene, die entweder Information, Beziehung oder Preis der nächsten Entscheidung sichtbar macht. Gib mindestens einen falschen, aber plausiblen Weg und einen riskanten, aber lohnenden Weg.`
      });
    }

    if (event) {
      seeds.push({
        id: 'event-variant',
        title: 'Event-Variante',
        text: `Aktuelles Event: ${event.title ?? event.name ?? 'unbenannt'}.\n\nSchreibe drei Varianten:\n- leise / sozial\n- investigativ / unheimlich\n- eskalierend / sichtbar\nJede Variante in höchstens 3 Sätzen.`
      });
    }

    return seeds.slice(0, 5);
  }
}

export default JanusContentSuggestionService;
