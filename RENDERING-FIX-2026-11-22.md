# Rendering-Prüfung – CreAid-Media V10.1 – 22.11.2026

## Nachweisbare Probleme

1. **Versionskonflikt der Leistungsseiten:** `webdesign`, `digitales-marketing`, `grafikdesign-2`, `ki-automatisierung` laden in `src/_data/pages.json` die Stylesheets `motion-v3.css` und `motion-v4.css`, verwendeten unten im Seitentemplate aber `motion-v3.js`. Das V4-Layout nutzt eigene Sticky-/Scrollabschnitte und hat ein passendes `motion-v4.js`. Die vier Seiten wurden auf `motion-v4.js` umgestellt, auch im mitgelieferten `dist/`.
2. **Breites Logo und alte quadratische Iconregeln:** Das tatsächlich geladene Brandlogo `assets/creaid-media-logo.webp` misst 9066 × 1000 Pixel. In `scrollstory-base.css` existieren ältere `.brand img`-Regeln mit identischer Breite und Höhe (33 × 33 Pixel); `service.css` überschreibt diese beim aktuellen Template zwar bereits, sie stellen jedoch eine fragile Kollision dar. In `audit.css` wurden für die vier Header-Familien die tatsächlichen Logo-Proportionen mit `height:auto` und `aspect-ratio` abgesichert.
3. **Lokale Dateiöffnung:** Die HTML-Seiten referenzieren Ressourcen über `/assets/...`. Bei `file:///.../dist/index.html` führt das nicht zu den beiliegenden CSS-, Schrift- und Bilddateien. Der mitgelieferte Server `node scripts/preview.mjs` löst die Adressen korrekt auf. Ein doppelklickbarer Starter und ein ergänzter README-Hinweis wurden hinzugefügt.

## Prüfung

- Vorschau-Server auf freiem lokalem Port getestet: Startseite, Leistungsseiten, Blog, Logo, Fonts und CSS liefern HTTP 200.
- Quell- und `dist/`-Dateien hinsichtlich des V4-Skripts korrigiert.
- Browser-Screenshot-Abnahme war in dieser Prüfungsumgebung nicht möglich; eine finale Sichtprüfung an 390 px und 1440 px im Browser ist sinnvoll.

## So starten (Windows)

1. ZIP entpacken.
2. In `CreAid-Media-V10-Audit` auf `CreAid-Vorschau-starten.cmd` doppelklicken.
3. Im Browser `http://127.0.0.1:8080/` öffnen und das Terminal geöffnet lassen.

Alternativ in PowerShell im richtigen Projektordner `npm.cmd run preview` eingeben.
