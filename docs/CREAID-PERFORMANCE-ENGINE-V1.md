# CreAid Performance Engine V1.1

Wiederverwendbarer, optionaler Node-22-Buildschritt für statische Websites mit Root-Assetpfaden /assets/. Kein WordPress-Plugin, kein Service Worker, keine Serverinstallation. Das Modul verändert weder Quelldateien noch den normalen Build oder das Deployment.

## Verwendung

1. npm ci
2. npm run build
3. npm run test:performance
4. npm run performance:preview -- dist performance-preview

Der neue, vorher nicht existierende Ausgabeordner enthält site/ (statische Kopie), report.json (SHA-256-Manifest, Original-/Kompressionsgrößen, geprüfte Assets), Cache-Regelvorschläge und aktive Apache-Regeln in site/.htaccess. Nur site/ wäre ein späteres Deployment-Ziel; Berichte und Regelvorschläge außerhalb von site/ nicht veröffentlichen.

Preview: no-store für alle Antworten, Brotli mit Gzip-Fallback für komprimierbare Typen bei verfügbaren Apache-Modulen. Bestehende Zugriffssperren und Robots-Header werden nicht entfernt. no-store ist keine Zugriffssperre. Keine vertraulichen Entwürfe öffentlich ausliefern.

Production: ausschließlich aus einer separat freigegebenen, bereinigten und öffentlichen finalen Build-Ausgabe, nach allen Pfadumschreibungen:

node scripts/performance/engine.mjs dist-public performance-public production --approve-public-build

HTML wird revalidiert; SHA-256-versionierte Assets erhalten ein Jahr immutable bei erfolgreichen Antworten. Nicht versionierte öffentliche CSS-, JS-, Font- und Bilddateien werden revalidiert; Fehler und sonstige Dateien bleiben no-store. Originalassets bleiben für CSS-/JS-Abhängigkeiten erhalten. Vorhandene Cache-/Expires-Regeln werden nicht überschrieben; Konflikte führen zum Abbruch. Der Produktionsmodus verweigert erkennbare Preview-/noindex-/Draft-Eingaben. Das ist keine vollständige Prüfung vertraulicher Inhalte. Diese muss vorher separat erfolgen.

## Abnahme und Rollback

- npm run test:performance prüft Fixtures und Sicherheitsgrenzen; npm run verify prüft den unveränderten regulären Build.
- Vor IONOS-Einsatz: auf privatem Testziel vorhandene Rewrite-/Auth-Regeln und Apache-Module überprüfen, Header für HTML, versionierte Assets, Originalassets und 404 per curl -I prüfen; mit Accept-Encoding: gzip und ohne testen; ETag/Last-Modified und 304 prüfen. Bei Modulen, die nicht verfügbar sind oder Header überschreiben, nicht produktiv aktivieren.
- Browserprüfung aller Seitentypen, Lighthouse kalt/warm mit identischer Konfiguration, keine garantierten Scores.
- Rollback: unveränderten vorherigen Build und ursprüngliche .htaccess wiederherstellen. Alte Fingerprint-Dateien bei einem späteren Produktionsrollout für laufende Clients vorhalten; nicht blind löschen.
- Keine automatische Veröffentlichung; weder WordPress noch IONOS werden geändert. GitHub Pages unterstützt keine Apache-.htaccess.
- Brotli/Gzip werden in Apache ausgehandelt, wenn die entsprechenden Module verfügbar sind. Die Reportgrößen sind weiterhin Schätzungen, keine Messwerte des Zielservers. Responsive Bildgrößen, Critical CSS, JS-Delay und tiefe Abhängigkeitsanalyse bleiben getrennte Erweiterungen.


## Optionale Asset-Optimierung (vor dem Fingerprinting)

Bewusst getrennt vom normalen npm ci und Build. Installiere die exakt unterstützten Toolversionen in einem separaten Ordner (npm erzeugt dort ein eigenes Lockfile; dieses für Wiederholungsbuilds aufbewahren):

```sh
npm install --prefix .performance-tools --save-exact esbuild@0.25.12 sharp@0.34.1
node scripts/performance/optimize-input.mjs dist optimized-input optimization-allowlist.json .performance-tools
npm run performance:preview -- optimized-input/site performance-preview-optimized
```

Allowlist-Beispiel (Dateinamen anhand des tatsächlichen Builds prüfen; keine pauschale Aktivierung):

```json
{"files":["assets/example.css","assets/example.js","assets/example.png"]}
```

- CSS/JS: Parser-basierte Whitespace-Minifizierung ohne Identifier-Mangling, Syntaxoptimierung, Bundling oder Downleveling; bei SRI oder Source-Maps bewahren. Keine Änderung an HTML/Inline-Skripten.
- PNG/WebP: nur ausgewählte einfache sRGB-Bilder, ohne Animation, Farbprofile oder Metadaten; nur übernehmen, wenn Abmessungen, Alpha, Farbmodus und dekodierte Pixel übereinstimmen und die Datei kleiner wird. JPEG, AVIF und komplexe Bilder unverändert lassen.
- Byte- und SHA-256-Vergleich in optimization-report.json; für Code auch Gzip-/Brotli-Größen. Kein automatisches Deployment. Vor Nutzung auf realen Seiten Browser-/Bild- und Funktionsregression prüfen.
- HTTP-Integrationstest unter Linux: node scripts/performance/test-apache-http.mjs. Testet echte Antworten eines isolierten Apache, inklusive Brotli/Gzip, Fallbacks, Cache-Control, 304 und 404. Das ersetzt nicht den IONOS-Test.
- Die exakten optionalen Toolversionen werden geprüft; das separate Installations-Lockfile liegt nicht in diesem Repository. Abhängigkeiten vor produktivem Einsatz auf Sicherheitsupdates überprüfen.
