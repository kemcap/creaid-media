# CreAid-Media – laufende Website-Entwicklung
Vor jeder Änderung an der eigenen CreAid-Media-Marke zuerst [Living Style Guide](docs/CreAid-Media-Style-Guide.html) lesen (HTML, eingebettetes JSON und Original-CSS). Der Guide ist die zentrale Designreferenz. Für Kundenprojekte gilt die jeweilige Kundenidentität; die CreAid-Markenmotive sind nicht automatisch zu übernehmen.

## Operative Workflows
- Website-Redesign-Masterworkflow V4.3: separate Projektquelle für neue Websites und grundlegende Kunden-Redesigns; für die laufende Pflege der eigenen Website nicht erforderlich. Keine erneute Moduswahl oder Hero-Konzeption bei kleinen Änderungen.
- Blog-Optimizer V2.2: separate Projektdatei für Redaktion, SEO/GEO und E01–E20. Die eigenständige Living-Dot-Illustrationssprache bleibt bis zur Freigabe ein eigener Arbeitsschritt.
- [Website-Finalization-Tracker](docs/WEBSITE-FINALIZATION-TRACKER.md): aktueller Bearbeitungsstand, Prüfungen und Freigaben. Der [interaktive Styleguide](https://vorschau.creaid-media.de/assets/demos/creaid-style-guide.html) lässt sich auf der Vorschauseite öffnen.
- Keine privaten Projektdateien ungefragt in diesem öffentlichen Repository veröffentlichen.
- Bei CreAid-Media-Aufträgen gelten die komponentenspezifischen Designparameter und Einsatzregeln des Guides. Bestehende operative Freigaben werden dadurch nicht aufgehoben.
- Bei nicht vorliegendem Workflow oder fehlender Referenz den konkreten Mangel dokumentieren, nicht raten.

## Umsetzung
Aktuellen Branch, offene PRs, betroffene Quellen und Vorschau prüfen. Bestehendes freigegebenes Design und Funktionen erhalten; nur beauftragte Änderungen vornehmen. Bereits entschiedene Punkte direkt umsetzen, wesentliche offene Entscheidungen einzeln abstimmen. SEO-Metadaten, Canonicals, Weiterleitungen, Barrierefreiheit, Performance und Kontaktfunktionen schützen. Keine echten Testanfragen ohne Freigabe. Nach Deployment die tatsächliche Vorschau prüfen; Ergebnisse und offene Punkte dokumentieren.

Freigegebene CSS-Komponenten aus public/assets/brand-motion.css verwenden. Änderungen an der kanonischen CSS-Quelle im HTML-Guide vornehmen, Asset entsprechend synchronisieren und node scripts/check-brand-motion.mjs ausführen. Keine neuen Varianten ohne Freigabe. Bestehende Headline-Signatur bleibt eigenständig. Illustrationsstil ist noch nicht final; keine Serienumstellung von Bildern.

npm run verify; Browser-Matrix im PR ausführen und Änderungen auf Desktop/Mobil prüfen. Keine Produktionsveröffentlichung ohne separate Freigabe. main deployt automatisch zur Vorschau; Merge erst nach Abnahme.
