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

## Lokaler Studio-Modus – Optimierung per Mausklick

Im Projektordner der Engine (Node.js 22, Git):
```sh
npm ci
npm run build
npm run performance:studio
```
Die im Terminal angezeigte Adresse http://127.0.0.1:<Port>/ im Browser öffnen. Safe auswählen und „Optimierung starten“ drücken. Der Server verarbeitet ausschließlich den aktuellen dist-Ordner. Im Ergebnis stehen der neue Website-Ordner und der Link zum lokalen Audit. Jeder Lauf verwendet einen eigenen Unterordner unter .creaid-performance-runs; bestehende Ausgaben und dist bleiben erhalten. Strg+C beendet den Server. Für Änderungen am Quellprojekt den regulären Build erneut ausführen; Studio selbst baut nicht neu.

Für Balanced/Maximum die optionalen Werkzeuge einmal separat installieren:
```sh
npm install --prefix .performance-tools --save-exact esbuild@0.25.12 sharp@0.34.1
```
Die tatsächlich vorhandenen Asset-Pfade im Panel eintragen. Der Lauf verwendet dieselbe Preview-Pipeline wie das CLI; die Bildvarianten werden nicht automatisch in das HTML eingebunden. JSON-Export bleibt auch im Offline-Studio verfügbar.

Der Server lauscht ausschließlich auf 127.0.0.1 und einem automatisch zugewiesenen Port, verwendet einen pro Start erzeugten Token für API-Zugriffe, prüft Host/Origin, beschränkt die Größe der Konfiguration und erlaubt nur einen Lauf gleichzeitig. Keine frei eingegebenen Shell-Befehle, keine externe URL, kein FTP oder Deployment, kein öffentlicher Server. Nicht für gemeinsam genutztes Hosting oder nicht vertrauenswürdige Projekte vorgesehen. Lokale Daten- und Werkzeugordner sind in .gitignore eingetragen. Der neue Browser-Test prüft den Klick bis zum echten Safe-Pipeline-Ergebnis; erst ein grüner CI-Lauf bestätigt die Funktion.

## Lokale Cache-Verwaltung im Studio

Im lokalen Modus (`npm run performance:studio`) erscheint der Bereich „Lokalen Build-Cache verwalten“. Technisch handelt es sich um die Bereinigung generierter Vorschau-Builds, nicht um einen HTTP-Cache. Die Oberfläche zeigt die Zahl der entfernbaren älteren erfolgreichen Testläufe dieser laufenden Studio-Sitzung. „Lokalen Build-Cache leeren“ verlangt eine ausdrückliche Bestätigung und löscht ausschließlich diese Testlaufordner inklusive ihrer Reports. Der neueste erfolgreiche Lauf, Original-Build dist, außerhalb der Testlaufordner gespeicherte Backups, Werkzeuge und frühere Studio-Sitzungen bleiben erhalten. Bei gleichzeitig laufender Optimierung ist die Bereinigung gesperrt. Unerwartete Verzeichnisstrukturen und Symlinks werden abgelehnt. Die gemeldete Datenmenge ist die Summe der entfernten Dateigrößen, nicht der gemessene freie Speicherplatz des Datenträgers. Vor dem Bereinigen gewünschte ältere Testläufe separat archivieren. Eine neue Optimierung erzeugt immer einen frischen isolierten Build; es gibt derzeit keinen wiederverwendeten lokalen Transformationscache.

Der HTTP-Cache der Website wird dadurch nicht geleert: Inhaltsänderungen erzeugen bei der nächsten Paketierung neue SHA-256-Asset-URLs, HTML und unversionierte öffentliche Assets werden im Produktionsprofil revalidiert. Eine bereits auf Endgeräten gespeicherte unveränderte Immutable-Datei lässt sich nicht zentral löschen. Eine IONOS-/CDN-Purge-Funktion setzt eine tatsächlich vorhandene und autorisierte Cache-Schnittstelle voraus und ist nicht integriert. Die aktuelle Vorschau bleibt no-store. Kein `Clear-Site-Data` und kein Entfernen produktiver Alt-Assets. Keine Änderung der Live-Website.

Die vorherige CreAid-SAFE-Abnahme (GitHub-Lauf 45700454647) bestätigte 122/122 kanonische Routen, 153 Asset-Fingerprints, 175 unveränderte Nicht-HTML-Dateien und 32/32 visuelle Stichproben ohne gemeldete Abweichungen. Die Cache-Bereinigung ist neu und besitzt einen zusätzlichen Browser-Test; deren Freigabe hängt vom erfolgreichen neuen CI-Lauf ab.

## Cache Warmup und optionale Aufbewahrung

### HTTP Warmup (CLI)

```json
{"origin":"https://example.com","paths":["/","/webdesign","/assets/example.css"],"passes":2,"delayMs":250}
```

Die Beispiel-URLs durch tatsächlich eigene, ausdrücklich freigegebene öffentliche statische Ressourcen ersetzen. Nicht für Logout-, API-, Formular-, Tracking- oder sonstige zustandsändernde URLs verwenden. Keine automatische Sitemap-Verfolgung. Lokale Loopback-Origins sind standardmäßig erlaubt; für öffentliche HTTPS-Origins muss der Bediener die Freigabe bewusst ergänzen:

```sh
npm run performance:warmup -- warmup-config.json warmup-report.json --approve-remote-public-get
```

Der CLI-Runner führt maximal 50 ausgewählte Pfade mit höchstens zwei sequentiellen Durchläufen aus. Keine Redirect-Verfolgung, keine Cookies/Anmeldedaten, Request-Timeout und Datenbudget, Abbruch bei 401/403/429/503 oder Transportfehler. Wertet Cache-Control, Age und ausgewählte Cache-Statusheader aus. Ein gemeldeter HIT ist eine Anbieter-Aussage; ein Cache-Control-Header allein ist kein Treffer. no-store/private/Set-Cookie-Antworten werden nicht als Shared-Cache-Warmup behandelt. Browser-Caches werden nicht gefüllt. Der lokale Vorschau-Server ist bewusst no-store und besitzt keinen Shared HTTP Cache. Nicht mit tatsächlicher Besucher-Performance oder Lighthouse gleichsetzen. Der CI-Test simuliert die HTTP-Header eines Cache-Anbieters. Keine öffentliche Website wurde damit automatisch aufgerufen. Ein tatsächlicher IONOS-/CDN-Warmup oder Purge erfordert die gesonderte Bestätigung der Hosting-Architektur und einer geeigneten Cache-Schnittstelle.

### Optionale zeitgesteuerte lokale Build-Bereinigung

Im lokalen Studio unter Cache-Verwaltung. Standardmäßig aus. Nach ausdrücklicher Aktivierung prüft der laufende Studio-Prozess einmal pro Minute, welche selbst erzeugten älteren erfolgreichen Testläufe dieser Sitzung zugleich außerhalb der Anzahl der aufzubewahrenden neuesten Läufe und älter als das eingestellte Mindestalter sind. Standardwerte: drei Läufe behalten, Mindestalter 24 Stunden. Einstellbar: 2–20 Läufe und 1–168 Stunden. Der letzte erfolgreiche Lauf wird nie automatisch entfernt; Originale, separate Backups, fremde Ordner und frühere Sitzungen bleiben unberührt. Läuft nicht während einer Optimierung oder manuellen Bereinigung. Keine Betriebssystem-Aufgabe, kein Hintergrunddienst nach Schließen des Studio-Prozesses, keine dauerhafte Aktivierung nach Neustart. Die Oberfläche zeigt den Status und das letzte Bereinigungsergebnis. Vor Löschung gewünschte Läufe außerhalb des generierten Cache-Ordners archivieren. Keine produktive Cache-Löschung.

QA-Stand: Der vorherige lokale Studio-Start und die manuelle Cache-Bereinigung (inkl. Bestätigungsdialog und Erhalt des letzten Builds) wurden erfolgreich im Chromium-Test geprüft. Die neuen Warmup- und Retention-Tests müssen separat grün werden; die Retention-Logik wird mit synthetischen Zeitwerten und dem UI-Schalter geprüft, kein 24-Stunden-Dauertest.

## Hosting-Vorbereitung: Release-Plan und Studio-Diagnose

Die Schaltfläche „Cache-Diagnose starten“ prüft ausschließlich die Startseite des letzten lokalen Preview-Pakets mit zwei GET-Anfragen an einen eigens gestarteten Loopback-Server. Dieser antwortet absichtlich mit no-store. Erwartung: kein gemeldeter Shared-Cache-HIT. Keine frei wählbaren Remote-Targets im Studio. Der CLI-Warmup bleibt getrennt.

```sh
npm run performance:release-plan -- previous-site next-site release-plan.json
```

Vergleicht zwei getrennte lokale Website-Verzeichnisse, validiert SHA-256-Namen, gruppiert geänderte immutable Assets, sonstige Assets, HTML und Serverregeln, und meldet entfernte Dateien, die vorerst erhalten bleiben sollen. Stabile geänderte Asset-URLs, entfernte unversionierte Seiten und Preview-Markierungen sind Prüfblocker. Kein FTP, keine automatische Veröffentlichung, keine automatische Löschung. Für einen produktiven Wechsel möglichst atomaren Releasewechsel verwenden; die Upload-Reihenfolge ist nur ein Planungshinweis, kein Ersatz für eine Abnahme. Alte immutable Assets bei Rollback oder offenen Browser-Tabs berücksichtigen. Die beiden Build-Verzeichnisse müssen außerhalb des Berichtspfads liegen.

IONOS bietet tarifabhängige CDN-Funktionen; die IONOS-Hilfe weist darauf hin, dass die CDN-Funktion in Webhosting-Tarifen ab 10.09.2024 nicht mehr enthalten ist. Den tatsächlichen Vertrag und die Aktivierung prüfen: https://www.ionos.de/hilfe/hosting/click-build-anwendungen/click-build-faq/ und https://www.ionos.de/hilfe/hosting/content-delivery-network-cdn/cdn-im-ionos-kundenkonto-aktivieren/. Keine unbestätigte Purge-API implementiert. Eine spätere geschützte Online-Verwaltung benötigt ein geeignetes Backend, Authentifizierung, TLS, getrennte Dateirechte und eine ausdrücklich konfigurierte Hosting-Schnittstelle. Den lokalen Studio-Server nicht öffentlich erreichbar machen.

## Priorisierte Audit-Aufgaben und direkter Studio-Benchmark

Der Audit erzeugt zusätzlich `priorities.json` und zeigt die 50 höchstpriorisierten unterschiedlichen Prüfaufgaben im Dashboard. Gleichartige Ressourcenhinweise werden über mehrere Seiten zusammengefasst; Budget- und Seitenhinweise bleiben seitenbezogen. Sortiert nach statischem Schweregrad, Zahl betroffener Seiten und Häufigkeit. Keine geschätzten Performance-Gewinne und keine automatischen Eingriffe.

Im Studio erhält jeder erfolgreiche Optimierungslauf eine eigene unveränderte Ausgangskopie unter `baseline/site` sowie ein SHA-256-Inventar. Diese Kopie wird als Eingabe für die Optimierung verwendet und vor späteren Messungen erneut geprüft. Sie gehört zum jeweiligen Testlauf und wird bei bestätigter Bereinigung dieses alten Laufs zusammen mit dessen Berichten entfernt. Wichtige Sicherungen weiterhin außerhalb des Studio-Cacheordners aufbewahren.

### Browser-Werkzeuge installieren und Benchmark starten

```sh
npm install --prefix .performance-browser-tools --save-exact playwright@1.56.1 lighthouse@12.8.2 pngjs@7.0.0 pixelmatch@7.1.0
npx --prefix .performance-browser-tools playwright install chromium
npm run performance:studio
```

Nach einem erfolgreichen Build im Studio „Performance messen“ wählen, Mobil oder Desktop auswählen. Drei Lighthouse-Läufe je Variante, abwechselnd ausgeführt. Die Oberfläche zeigt Fortschritt und eine Vergleichstabelle für Performance-Score, LCP, FCP, CLS, TBT und Speed Index. Die JSON-Datei im Benchmark-Unterordner enthält zusätzlich Min/Max-Spannweiten und Messkonfiguration. Nur die Startseite wird gemessen. Jeder Lauf startet eine frische lokale Browser-Messung; keine produktive Apache-Kompression, kein tatsächlicher Browser- oder CDN-Warmcache, keine Felddaten. Unterschiede können Messstreuung sein. Keine Veröffentlichung. Der CLI-Runner kann zwei separat bereitgestellte Builds vergleichen:

```sh
npm run performance:benchmark -- original-site optimized-site benchmark-report .performance-browser-tools mobile
```

Die neue GitHub-QA prüft den Start aus dem Studio mit sechs echten Lighthouse-Messungen einer synthetischen Testseite, nicht der echten CreAid-Website. Der vorherige QA-Lauf 45701738759 war vollständig erfolgreich, einschließlich Release-Plan, lokaler HTTP-Diagnose, Safe-Abnahme und Lighthouse-Smoke-Test. Der neue Benchmark und die priorisierte Audit-Ausgabe müssen im aktuellen CI-Lauf separat bestätigt werden.

## Responsive HTML integration and Balanced proposal

The responsive generation module now accepts an optional explicit layout map. Example:
```json
{
  "schemaVersion":1,
  "responsive":{
    "images":["assets/photo.jpg"],
    "widths":[320,640,1024],
    "quality":82,
    "integrate":{"index.html":{"/assets/photo.jpg":"(max-width: 640px) 100vw, 640px"}}
  }
}
```
Only use actual layout-reviewed values and existing source URLs. The integration checks exactly one matching image per page, declared dimensions matching the source aspect ratio, absence of existing picture/srcset/dynamic-loader attributes and competing preloads, and the generated variants' SHA-256 hashes. It inserts srcset and sizes only in the isolated staged HTML before fingerprinting. Images without smaller variants remain unchanged; conflicting markup requires manual review. The original source and fallback src remain. Variant selection is tested in Chromium with 320, 640 and 1440 CSS-pixel viewports and DPR 1. This is not a substitute for review of real photos, DPR, breakpoints and interactive states. The Studio adds an optional integration switch and layout JSON editor; Safe never activates it. Existing image generation remains candidate-only unless the integration map is provided.

The Balanced proposal can be generated from the original build audit:
```sh
npm run performance:audit -- dist original-audit
npm run performance:suggest-balanced -- original-audit/audit.json balanced-config.json
```
The candidate ranks directly referenced eligible assets by bytes multiplied by affected pages, excludes already optimized paths, limits selections to 30 minification/lossless assets and 20 responsive candidates, and never guesses sizes or script timing. These are heuristics, not real transfer savings or user traffic. Review the configuration before executing it. The CI creates a proposal for the real CreAid build, reports aggregate counts only and does not deploy or publish its reports. The actual site's responsive mapping remains to be reviewed separately.
