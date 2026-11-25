# CreAid-Media · Umsetzung des UI/UX-Audits

Branch `optimization/full-website-ui-ux`, Ausgangspunkt `2de57cc`.

| ID | Status und Änderung |
|---|---|
| UI-01 | Die breite Tabelle im Freelancer-Artikel hat eine beschriftete und fokussierbare Scrollregion. Bei 320–430 px bleibt die Seite in allen drei Browser-Engines ohne horizontalen Dokumentüberlauf. |
| A11Y-01 | Der globale Schalter übernimmt seinen zugänglichen Namen aus dem sichtbaren Text. `aria-expanded` transportiert den Zustand. Der frühere axe-Befund am Schalter ist im Nachtest verschwunden. |
| A11Y-02 | Textkontraste in Header, Footer, Journal, Portfolio, Startseite und rechtlichen Seitenelementen verbessert. Restbefunde im gezielten axe-Nachtest auf Startseite, Journal und Impressum. Das Journal meldet insbesondere Text in Karten während der Einblendung. Eine separate Prüfung der Animation im Ruhezustand und weiterer Interaktionszustände bleibt offen. |
| PERF-01 | Die ausgeklappte Navigation für deaktiviertes JavaScript wird nur noch aus dem vorhandenen Noscript-Stylesheet geladen. Das Menü ist im regulären Betrieb ab dem ersten Layout geschlossen. Gedrosselter CLS-Nachtest auf Startseite, Kontakt und Journal jeweils < 0,001 gegenüber etwa 0,35. Reale Felddaten fehlen. |
| UX-01 | Globale Navigation und Footer verwenden größere Schriftstufen. Der kleine Text am Mobilmenü wurde ebenfalls vergrößert. |
| UX-02 | Kein Dokumentüberlauf im zielgerichteten Viewport-Nachtest. Die native Browserzoom-Prüfung bei 200 Prozent und die bekannte CSS-Zoom-Probe sind gesondert zu behandeln. |
| NAV-01 | Google-Ads-Archiv mit dem in WordPress zugeordneten publizierten Beitrag und einem Einstieg aus dem Journal ergänzt. |
| JRN-01 | Entwurfsbadge des veröffentlichten KMU-Artikels korrigiert. Der Artikel kennzeichnet den Text als Vorschaufassung. |
| JRN-02 | Die 42 veröffentlichten Artikel stehen nach dem verifizierten WordPress-Publikationsdatum absteigend im Index. Der zusätzliche Vorschauartikel und die 19 redaktionellen Entwürfe folgen. |
| JRN-05 | Die beiden Vorlagen für importierte Artikel leiten interne WordPress-Verweise auf nachweislich vorhandene Vorschau-Routen oder deren Alternativpfade. Anker und Query-Parameter bleiben erhalten. Live-Verweise ohne passendes Vorschauziel bleiben erhalten. |
| JRN-06 | Google Ads ist in der Themenübersicht auffindbar. Eine Änderung der Pagination und die weitergehende Kategorienabnahme stehen aus. |

## Geänderte Dateien nach Paket

- Paket 1 · `public/assets/global-shell.css`, `global-shell.js`, `no-script.css`, `journal-v9.css`, `legal-pages.css`, `content-phase3.css`, `ux-phase1.css`, `src/_includes/partials/header-global.njk` und `wordpress-preview-draft.njk`.
- Paket 2 · `eleventy.config.js`, `scripts/check-hero-experience.mjs`, `src/_data/{headingPlan,pages,postsIndex,routes}.json`, beide `wordpress-preview-*.njk`-Vorlagen, `src/pages/blog.njk`, `src/pages/archiv-google-ads.njk` und `src/posts/webdesign-agentur-fuer-kleine-unternehmen.njk`.

## Regression

- Paket 1 · Eleventy-Build, Struktur- und Qualitätsprüfung. 121 kanonische Routen und 282 Weiterleitungen geprüft. Gezielter Browser-Nachtest und gedrosselte CLS-Wiederholung.
- Paket 2 · Build, Struktur, Qualität, globaler Header/Footer und Startseitenanimation erfolgreich. 122 kanonische URLs, 285 Weiterleitungen, 6 Routing-Ressourcen und 3 Negativfälle. Statische Qualitätsprüfung mit 5.917 internen Link- und 2.624 Asset-Vorkommen, ohne Befund.
- 7 gezielte Seiten × 11 Viewports × Chromium 158, Firefox 153 und WebKit 26.5 ergeben 231 Layoutmessungen. Kein Dokumentüberlauf, keine aufgezeichneten JavaScript-Fehler. axe bleibt eine gezielte Teilprüfung, keine WCAG-Konformitätsaussage.
- Archivroute, Status, Sortierung, 62 Einträge und normalisierte Verweise separat geprüft. Der lokale Build ist die Testgrundlage.

## Getrennte Entscheidungen und Architektur

- PUB-01 · Der Vorschauzugriff und der öffentliche Entwurfsbestand folgen der bisherigen Freigabe. Eine geschützte Vorschau erfordert einen separat entschiedenen Zugriffspfad und eine Trennung der Deployment-Ausgaben.
- JRN-03 und JRN-04 · 19 Platzhalter und 23 vereinfachte Artikelvorlagen bleiben für Originalmedien und redaktionelle Piloten offen. Die Pagination bleibt bei sechs Karten.
- Die bestehende statische Form und der spätere Versandendpunkt sind ein separates Architekturthema. Preise, Rechtstexte, Integrationen, wesentliche Gestaltungsänderungen und Deployment unterliegen den vorgesehenen Freigaben.
- Die Branch-Commits enthalten die Quellen. Das Projekt erzeugt die kompilierte Vorschau mit `npm run build`.
