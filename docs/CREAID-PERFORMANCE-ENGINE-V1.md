# CreAid Performance Engine V1.4

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
- Brotli/Gzip werden in Apache ausgehandelt, wenn die entsprechenden Module verfügbar sind. Die Reportgrößen sind weiterhin Schätzungen, keine Messwerte des Zielservers. Responsive Bildkandidaten sind in V1.2 verfügbar; Critical CSS, JS-Delay und tiefe Abhängigkeitsanalyse bleiben getrennte Erweiterungen.


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

## V1.2 – Build-Audit, Dashboard, responsive Bilder und Lighthouse-Vergleich

### Audit und Dashboard

```sh
npm run build
npm run performance:audit -- dist performance-audit
```

Öffne performance-audit/dashboard.html lokal im Browser. Enthält Seiteninventar, direkt referenzierte unkomprimierte Assets, nach Häufigkeit gruppierte Hinweise und die größten Assets. Die JSON-Ausgabe eignet sich für weitere Auswertung. Standardbudgets: 150 KiB HTML, 200 KiB direktes CSS, 300 KiB direktes JS pro Seite, 400 KiB je Bild ohne srcset. Das sind frei konfigurierbare interne Prüfwerte, keine Google-Grenzwerte. Aus dem HTML ermittelte CSS-/JS-Hinweise sind keine Messung tatsächlich blockierender Ressourcen. Fehlende srcset-Alternativen, CSS-Abhängigkeiten und dynamische Ressourcen erfasst das Inventar nicht vollständig.

Berichte bleiben außerhalb des Website-Builds. Dieses Repository ist öffentlich: keine internen Routen-/Asset-Berichte in CI-Artefakten oder Commits veröffentlichen. Der CI-Lauf prüft den realen Build und zeigt aggregierte Zahlen, nicht die Detailberichte. noindex ist kein Zugangsschutz.

### Responsive Bilder

Mit dem separaten sharp-Toolordner aus V1.1:
```sh
node scripts/performance/responsive-images.mjs dist responsive-input responsive-allowlist.json .performance-tools
```
Konfiguration: {"images":["assets/example.jpg"],"widths":[320,480,768,1024,1440],"quality":82}

Erzeugt kleinere WebP-Kandidaten in einer isolierten Kopie, ohne Upscaling, Seitenverhältnisänderung oder Überschreiben der Originale. Der JSON-Report liefert srcset-Kandidaten. Einbindung in die tatsächlich geeigneten img/picture-Elemente mit realistischen sizes, korrekten Dimensionen, Alt-Text und LCP-Priorität ist separat zu prüfen. Kein automatisches Ändern des HTML. Varianten erst nach visueller Qualitätskontrolle verwenden; Fingerprinting danach.

### Lighthouse-Vergleich

Je Seite mindestens drei Vorher-/Nachher-Lighthouse-JSON-Messungen bei gleicher Browser-, Geräte-, Cache- und Drosselungskonfiguration aufnehmen. Kalt- und Warmläufe getrennt vergleichen. Beispiel:
```sh
node scripts/performance/compare-lighthouse.mjs --before before1.json before2.json before3.json --after after1.json after2.json after3.json --output comparison.json
```
Der Vergleich berechnet Median, Spannweite und Delta für Performance-Score, LCP, FCP, CLS, TBT und Speed Index. Keine eigene Browser-Messung und kein INP-/Felddatennachweis; die Vergleichbarkeit muss zusätzlich vom Prüfer sichergestellt werden.

### Bewusst offen

Critical CSS und automatische JS-Verzögerung werden nicht ohne echte Browser-Coverage, Prüfung dynamischer Zustände und visuelle/interaktive Regression aktiviert. Das Dashboard ist eine lokale HTML-Auswertung, kein Server-Adminpanel. IONOS-Header, tatsächliche Kompression, Live-Caching, Lighthouse-Messungen der realen Website und Freigabe des produktiven Builds bleiben separate Abnahmen.

## V1.3 – Zentrale Pipeline, Ressourcenhinweise und Browsermessungen

Alle Transformationen bleiben explizit, optional und ausschließlich in einer isolierten Vorschau. Beispiel für die zentrale JSON-Konfiguration:

```json
{
  "schemaVersion": 1,
  "optimize": {"files":["assets/example.css","assets/example.js"]},
  "responsive": {"images":["assets/example.jpg"],"widths":[320,640,1024],"quality":82},
  "hints": {
    "index.html": {
      "deferScripts":["/assets/example.js"],
      "preloadFonts":["/assets/example.woff2"],
      "preloadImages":["/assets/hero.webp"]
    }
  },
  "auditBudgets":{"html":153600,"css":204800,"js":307200,"image":409600}
}
```

Dateinamen sind Beispiele; nur tatsächliche und geprüfte Ressourcen eintragen. Minimal: {"schemaVersion":1}. Fehlende Module sind deaktiviert. Der optionale Optimizer-Toolordner wird nur für die jeweiligen Bild-/Minify-Module benötigt.

```sh
npm run performance:pipeline -- dist performance-v13 config.json .performance-tools
```

Reihenfolge: optionale Minifizierung/Bildvarianten → gezielte Ressourcenhinweise → Fingerprinting und Preview-Cache-Policy → privater Audit. Ergebnis unter performance-v13/package/site; alle Berichte außerhalb dieses Site-Ordners. Kein Produktionsmodus in der Pipeline. Keine automatische srcset-Einbindung. Schrift-Preloads behalten die Original-URL, weil die CSS-internen Font-URLs nicht umgeschrieben werden. Prüfen, dass die exakt vorgeladene Fontdatei auch tatsächlich verwendet wird. Skript-defer verändert Ausführungszeitpunkt; nur nach Prüfung aller Abhängigkeiten, Inline-Skripte und Animationen freigeben. Kein pauschaler Delay bis zur Interaktion. Preload nur für bewusst ausgewählte LCP-Bilder (einfaches eager img) und Schriften.

### Browser-Coverage und Lighthouse

Separater Toolordner; eigene Lockdatei aufbewahren:
```sh
npm install --prefix .performance-browser-tools --save-exact playwright@1.56.1 lighthouse@12.8.2
npx --prefix .performance-browser-tools playwright install chromium
npm run performance:coverage -- dist coverage.json .performance-browser-tools /
npm run performance:lighthouse -- dist lighthouse-before .performance-browser-tools lighthouse-config.json
```

Lighthouse-Konfiguration: {"routes":["/"],"runs":3,"formFactor":"mobile"}. Weitere Routen als lokale Pfade; der interne Server unterstützt direkte Dateien, .html- und index.html-Auflösung, nicht alle projektspezifischen Rewrite-Regeln. Für die Nachher-Messung denselben Aufruf mit dem erzeugten Site-Ordner, identischer Konfiguration und einem neuen Berichtsordner verwenden. Vergleiche anschließend die JSON-Messungen mit V1.2 compare-lighthouse. Messungen auf derselben Maschine ausführen. Nur synthetische Fixtures in CI messen; tatsächliche Website lokal und privat messen. Externe Ressourcen werden bei Coverage per Browser-Routing blockiert und bei Lighthouse durch einen absichtlich nicht erreichbaren Proxy eingeschränkt; das ist keine vollständige Netzisolation. Nur vertrauenswürdige statische Builds in isolierten Umgebungen ohne Zugangsdaten ausführen. Keine Rohberichte, Screenshots oder vertraulichen Daten veröffentlichen.

CSS-Coverage erfasst initiale und gescrollte Zustände auf 390 und 1440 Pixeln, meldet verwendete Bereiche und nicht beobachtete Zeichen. Dies ist ein Prüfwerkzeug, keine sichere Critical-CSS-Extraktion. Hover, Fokus, Navigation, Dialoge, Media Queries und dynamische Animationen benötigen zusätzliche Tests. Kein automatisches Entfernen von CSS. Lighthouse läuft gegen einen no-store-Loopback-Server; weder produktive HTTP-Kompression noch IONOS-Warmcache werden damit nachgewiesen. CI testet eine synthetische Lighthouse-Messung; kein Score-Ziel und kein Nachweis realer Website-Verbesserungen.

Verweise: https://playwright.dev/docs/api/class-coverage und https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md.

## V1.4 – Performance Studio, visuelle Regression und Snapshots

### Lokales Control Panel
Die Datei `scripts/performance/studio.html` direkt im Browser öffnen (kein Webserver notwendig). Safe aktiviert nur den Audit-/Cache-Paket-Workflow; Balanced bietet die optionale Minifizierung und responsive Bildkandidaten; Maximum zusätzlich explizite Defer-/Preload-Hinweise. Einzelne Module können unabhängig gewählt werden. Die Profile verändern keine Dateien automatisch. Dateilisten und Hinweise müssen vom Anwender eingegeben und geprüft werden, bevor die JSON-Datei exportiert wird. Audit-Budgets in KiB werden in Byte umgerechnet. Die Konfiguration entspricht dem bestehenden Pipeline-Schema. Anschließend die exportierte Datei in den Projektordner legen und den angezeigten npm-Befehl ausführen. Das Panel selbst ist kein Server-Adminpanel, führt keine Shell-Befehle aus und stellt keine Live-Website um.

### Lokale Build-Sicherung und Wiederherstellung
```sh
npm run performance:snapshot -- dist backup-before-v14
npm run performance:restore -- backup-before-v14 dist-restored
```
Die Sicherung enthält den unveränderten statischen Build samt SHA-256-Dateiinventar, auch vorhandene .htaccess und leere Verzeichnisse. Wiederherstellung prüft die Integrität vor und nach dem Kopieren und schreibt ausschließlich in einen neuen Ordner. Manipulierte oder unvollständige Sicherungen werden zurückgewiesen. Kein Überschreiben, kein automatischer IONOS-Rollback; für produktive Rollbacks Serverkonfiguration und alte versionierte Assets separat vorhalten. Sicherungen privat aufbewahren; Hashes erkennen versehentliche Änderungen, sind keine digitale Signatur gegen absichtliche Manipulation des gesamten Snapshots.

### Visueller Vorher-Nachher-Vergleich
```sh
npm install --prefix .performance-browser-tools --save-exact playwright@1.56.1 lighthouse@12.8.2 pngjs@7.0.0 pixelmatch@7.1.0
npm run performance:visual -- dist performance-v14/package/site visual-report .performance-browser-tools /
```
Vergleicht lokale Builds in Chromium auf 390 und 1440 Pixeln, jeweils am oberen und mittleren Seitenabschnitt. Erstellt Vorher-/Nachher-/Differenz-PNGs und einen JSON-Bericht, standardmäßig maximal 0,5 % abweichende Pixel (programmatisch konfigurierbar). Neue Browserfehler, defekte Bilder, horizontale Überläufe, veränderte Titel/H1 und Dokumenthöhe werden zusätzlich geprüft. Abweichungen führen zu einem Nichtbestehen des Vergleichs, nicht zu automatischer Fehlerbehebung. Screenshots bleiben privat; echte Seiten, dynamische/interaktive Zustände und weitere Browser separat prüfen. Reduzierte Animation und blockierte externe Requests können die Darstellung gegenüber der Live-Website verändern. Die CI prüft identische und absichtlich veränderte Testseiten sowie Studio-Bedienung und JSON-Download auf einem mobilen Viewport.

Lighthouse-Messungen und Medianvergleich bleiben eigene Befehle; die grafische Oberfläche exportiert die Konfiguration, orchestriert aber noch keine Browserläufe. Critical-CSS-Extraktion, JS-Verzögerung bis zur Interaktion, automatische Einbindung responsiver Varianten, vollständige visuelle Abnahme des tatsächlichen CreAid-Builds sowie Produktionsfreigabe bleiben offen.

CI-Hinweis: V1.3-Coverage und bisherige Unit-Tests bestanden; der Lighthouse-Smoke-Test meldete Exit 1. V1.4 speichert private stderr-Diagnosen. Nur der synthetische Fixture-Test im CI-Runner darf den expliziten Sandbox-Fallback nutzen; normale Messungen behalten den Browser-Sandbox-Standard. Die Behebung ist bis zum erfolgreichen erneuten Test offen.

## V1.4 – Abnahme des SAFE-Pakets für CreAid-Media

Der V1.4-QA-Lauf 45699941343 (Commit 7920665275c1353e8ebb1d28f0a074b6dfee2391) bestand sämtliche Prüfungen einschließlich Lighthouse-Smoke-Test, Studio-Bedienung, visuelle Fixture-Regression und normalem Website-Build. Der Sandbox-Fallback gilt nur für das synthetische CI-Fixture; lokale Produktionsmessungen sind separat zu prüfen. Der Lauf bestätigte 122 HTML-Seiten und 153 verifizierte Asset-Fingerprints. Der statische Audit meldete 1238 Hinweise, nicht 1238 Fehler; eine Priorisierung und tatsächliche Performance-Messung stehen separat aus.

```sh
npm run performance:accept -- dist performance-v14/package acceptance-report .performance-browser-tools
```

Verwendet ausschließlich das SAFE-Paket ohne optionale Transformationen. Prüft die exakte HTML-Übereinstimmung nach Rückersetzung der generierten Fingerprint-URLs, unveränderte Original-Assets, die erwartete Dateiliste, Preview-no-store sowie alle kanonischen Routen aus der projektinternen Routing-Tabelle. Chromium vergleicht acht repräsentative Seiten (Startseite, Webdesign, Grafikdesign, Shopentwicklung, Kontakt, Blogübersicht, Blogartikel und Branchenlandingpage) bei 390 und 1440 Pixeln am oberen und mittleren Seitenabschnitt. Die 32 Bildvergleichspaare bleiben lokal/privat. Der neue Gate-Schritt ist separat im CI konfiguriert; erst ein erfolgreiches Ergebnis bestätigt die zusätzliche Abnahme. Keine IONOS-Rewrite-Prüfung, keine produktive Cache-Messung, keine Freigabe der optionalen Optimierungsprofile. Lighthouse-Smoke-Test ist keine Lighthouse-Messung der tatsächlichen Website. Vor einem produktiven Release separate echte Vorher-Nachher-Messungen und interaktive Funktionsprüfung durchführen.
