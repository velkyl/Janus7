# ADR – Atmosphere Hybrid Routing

## Kontext
JANUS7 ist hybrid-first. Audio soll zentral laufen, während Logik/Steuerung auf beliebigen Clients ausgelöst werden kann.

## Entscheidung
- Alle Atmosphere-Kommandos können lokal oder remote ausgelöst werden.
- Nur der Master-Client führt Audio-Aktionen aus.
- Remote-Clients senden Socket-Messages an `module.janus7`.

## Security (Best-Effort)
Foundry Sockets sind nicht kryptografisch abgesichert.
Daher gilt:
- Eingehende Messages werden validiert (Sender existiert, GM-only für kritische Commands).
- Zusätzlich gilt weiterhin: Master-Client sollte ein GM-Account sein.

## Konsequenzen
- Sauberer Tischbetrieb mit Beamer-PC.
- Gute Debbugbarkeit via `status()` und Logger.
