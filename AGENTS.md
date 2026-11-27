# CreAid-Media – Einstieg für KI-Agenten
Vor jeder Änderung an der eigenen CreAid-Media-Marke zuerst [Living Style Guide](docs/CreAid-Media-Style-Guide.html) lesen (HTML, eingebettetes JSON und Original-CSS). Der Guide ist die zentrale Designreferenz. Für Kundenprojekte gilt die jeweilige Kundenidentität; die CreAid-Markenmotive sind nicht automatisch zu übernehmen.

## Operative Workflows
- Website-Redesign-Masterworkflow V4.3 mit Design-System-Ergänzung: Projektdatei, separat; Gate 0–3 und Veröffentlichungsfreigabe bleiben unverändert.
- Blog-Optimizer V2.1 mit Design-System-Ergänzung: Projektdatei, separat; SEO/GEO, Bildoptionen, E01–E20 und Freigaben bleiben unverändert.
- Keine privaten Projektdateien ungefragt in diesem öffentlichen Repository veröffentlichen.
- Bei CreAid-Media-Aufträgen gelten die komponentenspezifischen Designparameter und Einsatzregeln des Guides. Bestehende operative Freigaben werden dadurch nicht aufgehoben.
- Bei nicht vorliegendem Workflow oder fehlender Referenz den konkreten Mangel dokumentieren, nicht raten.

## Umsetzung
Freigegebene CSS-Komponenten aus public/assets/brand-motion.css verwenden. Änderungen an der kanonischen CSS-Quelle im HTML-Guide vornehmen, Asset entsprechend synchronisieren und node scripts/check-brand-motion.mjs ausführen. Keine neuen Varianten ohne Freigabe. Bestehende Headline-Signatur bleibt eigenständig. Illustrationsstil ist noch nicht final; keine Serienumstellung von Bildern.

npm run verify; Browser-Matrix im PR ausführen und Änderungen auf Desktop/Mobil prüfen. Keine Produktionsveröffentlichung ohne separate Freigabe. main deployt automatisch zur Vorschau; Merge erst nach Abnahme.
