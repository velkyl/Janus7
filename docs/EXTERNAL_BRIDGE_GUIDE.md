# JANUS7 External Bridge Guide

Dieses Dokument beschreibt die Einrichtung und Nutzung der externen Brücke für SQLite und Python in JANUS7.

## 1. Einführung

Die **External Bridge** ermöglicht es JANUS7, über die Grenzen der Foundry VTT Sandbox hinaus auf Systemressourcen zuzugreifen. Dies ist besonders nützlich für:
- Abfragen von externen Kampagnen-Datenbanken (z.B. **Keeper Helper**).
- Ausführung von spezialisierter Logik in **Python** (KI-Modelle, Datenverarbeitung).
- Integration von Tools, die nicht in JavaScript verfügbar sind.

## 2. Architektur

Da Foundry VTT im Browser läuft und keinen direkten Zugriff auf das Dateisystem oder externe Prozesse hat, nutzt Janus7 ein **Outbox/Inbox-Prinzip**:

1. **Request (Foundry):** Janus schreibt eine JSON-Datei mit der Aufgabe (`sql` oder `python`) in den Ordner `Data/janus7/io/outbox`.
2. **Execution (Hintergrund):** Ein lokales Python-Skript (`janus_bridge.py`) überwacht diesen Ordner, führt die Aufgabe aus und schreibt das Ergebnis nach `Data/janus7/io/inbox`.
3. **Response (Foundry):** Janus liest das Ergebnis ein und gibt es an den Aufrufer (KI oder Makro) zurück.

## 3. Einrichtung

### Voraussetzungen
- Installiertes **Python 3.x**.
- (Optional) Bibliotheken für deine Skripte.

### Start der Brücke
1. Navigiere zum Modul-Ordner: `Data/modules/Janus7/extensions/external-bridge/`.
2. Starte die Brücke:
   ```bash
   python janus_bridge.py
   ```
3. Das Skript zeigt an, dass es den `outbox`-Ordner überwacht.

## 4. Nutzung in Foundry

### API-Zugriff
Die Funktionen sind über `game.janus7.capabilities.ext` verfügbar.

#### SQLite Abfragen
```javascript
const db = "modules/keeper-helper/database/keeper.db";
const sql = "SELECT name, role FROM npcs WHERE status = ?";
const params = ["active"];

const rows = await game.janus7.capabilities.ext.querySql(db, sql, params);
console.log("Ergebnisse aus SQLite:", rows);
```

#### Python Skripte
```javascript
const script = "extensions/external-bridge/test.py";
const args = { user: "Volker", action: "analyze" };

const result = await game.janus7.capabilities.ext.runScript(script, args);
console.log("Python Ergebnis:", result);
```

## 5. KI-Integration

Die KI (Gemini) ist automatisch über diese Werkzeuge informiert. Sie kann eigenständig entscheiden, eine Datenbank-Abfrage zu starten, wenn sie Informationen benötigt, die nicht im aktuellen State vorhanden sind.

**Beispiel für eine KI-Anweisung:**
> "Schau in der Datenbank des Keeper Helpers nach, welche Hinweise wir im letzten Abenteuer in Grangor gefunden haben."

Die KI wird dann das Tool `external_sql_query` mit dem entsprechenden Pfad und Query aufrufen.

## 6. Sicherheitshinweise

- Die Brücke führt Befehle auf deinem lokalen System aus. 
- Führe `janus_bridge.py` nur aus, wenn du den Inhalten deines `outbox`-Ordners vertraust.
- Standardmäßig ist der Zugriff auf den GM beschränkt.

## 7. Fehlerbehebung

- **"Service nicht verfügbar":** Die Brücke läuft nicht oder der `outbox`-Pfad ist falsch konfiguriert.
- **Timeout:** Die Brücke hat die Aufgabe nicht innerhalb der Zeit verarbeitet. Prüfe die Konsole des Python-Skripts.
- **SQL Fehler:** Prüfe, ob der Pfad zur `.db`-Datei relativ zum Foundry-Datenverzeichnis korrekt ist.
