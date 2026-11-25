# Interne Angebotsabnahme
Aus Angebote-Gesamt.pdf, Seiten 1–10, erfasst. Die 14 Pakete und 11 Module werden als eigenständige HTML-Prüfansicht gerendert, außerhalb von dist und _site. Keine Veröffentlichung, kein Kontaktversand. Die Darstellung dient als Entwurf für die spätere Eleventy-Integration. Die bereits übernommenen Live-Pakete bleiben unverändert. 

Lokal: `node scripts/render-additional-offers-review.mjs`, anschließend `qa-results/additional-offers-review.html` öffnen. Optional: `node scripts/check-additional-offers-review.mjs` nach Playwright-Installation. GitHub-Workflow erzeugt HTML, Browserbericht und Screenshots als internes CI-Artefakt. 

Vorgesehene Zuordnung nach fachlicher Freigabe: allgemeine Webdesign-Pakete und Module auf /webdesign; Ads-Einstieg und Betreuung auf /google-ads-social-media; Conversion auf /performance-optimization-3; WordPress-Wartung auf /upgrades-wartung. Keine neue öffentliche URL nötig. Freigabe für Hosting, Steuer, Werbebudget, Seitenumfang und Wartungsumfang separat dokumentieren. PDF-Seiten 2/4/6/8/10 enthalten weiterführende Leistungsbeschreibungen; diese vor öffentlicher Übernahme redaktionell prüfen.
