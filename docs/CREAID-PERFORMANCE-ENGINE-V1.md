# CreAid Performance Engine V1.0

Wiederverwendbarer, optionaler Node-22-Buildschritt für statische Websites mit Root-Assetpfaden /assets/. Kein WordPress-Plugin, kein Service Worker, keine Serverinstallation. Das Modul verändert weder Quelldateien noch den normalen Build oder das Deployment.

## Verwendung

1. npm ci
2. npm run build
3. npm run test:performance
4. npm run performance:preview -- dist performance-preview

Der neue, vorher nicht existierende Ausgabeordner enthält site/ (statische Kopie), report.json (SHA-256-Manifest, Original-/Kompressionsgrößen, geprüfte Assets), Cache-Regelvorschläge und aktive Apache-Regeln in site/.htaccess. Nur site/ wäre ein späteres Deployment-Ziel; Berichte und Regelvorschläge außerhalb von site/ nicht veröffentlichen.

Preview: no-store für alle Antworten, Gzip für komprimierbare Typen bei verfügbaren Apache-Modulen. Bestehende Zugriffssperren und Robots-Header werden nicht entfernt. no-store ist keine Zugriffssperre. Keine vertraulichen Entwürfe öffentlich ausliefern.

Production: ausschließlich aus einer separat freigegebenen, bereinigten und öffentlichen finalen Build-Ausgabe, nach allen Pfadumschreibungen:

node scripts/performance/engine.mjs dist-public performance-public production --approve-public-build

HTML wird revalidiert; SHA-256-versionierte Assets erhalten ein Jahr immutable bei erfolgreichen Antworten. Nicht versionierte Dateien und Fehler bleiben no-store. Originalassets bleiben für CSS-/JS-Abhängigkeiten erhalten. Vorhandene Cache-/Expires-Regeln werden nicht überschrieben; Konflikte führen zum Abbruch. Der Produktionsmodus verweigert erkennbare Preview-/noindex-/Draft-Eingaben. Das ist keine vollständige Prüfung vertraulicher Inhalte. Diese muss vorher separat erfolgen.

## Abnahme und Rollback

- npm run test:performance prüft Fixtures und Sicherheitsgrenzen; npm run verify prüft den unveränderten regulären Build.
- Vor IONOS-Einsatz: auf privatem Testziel vorhandene Rewrite-/Auth-Regeln und Apache-Module überprüfen, Header für HTML, versionierte Assets, Originalassets und 404 per curl -I prüfen; mit Accept-Encoding: gzip und ohne testen; ETag/Last-Modified und 304 prüfen. Bei Modulen, die nicht verfügbar sind oder Header überschreiben, nicht produktiv aktivieren.
- Browserprüfung aller Seitentypen, Lighthouse kalt/warm mit identischer Konfiguration, keine garantierten Scores.
- Rollback: unveränderten vorherigen Build und ursprüngliche .htaccess wiederherstellen. Alte Fingerprint-Dateien bei einem späteren Produktionsrollout für laufende Clients vorhalten; nicht blind löschen.
- Keine automatische Veröffentlichung; weder WordPress noch IONOS werden geändert. GitHub Pages unterstützt keine Apache-.htaccess.
- Brotli wird im Bericht geschätzt; aktives Brotli, CSS-/JS-Minifizierung, responsive Bilder und tiefgehende Abhängigkeitsanalyse sind getrennte Erweiterungen. Keine ungetesteten Quelltransformationen.

