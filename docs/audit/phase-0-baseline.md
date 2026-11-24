# Phase 0 — Befund und Messbasis
Datum: 24.11.2026. Read-only-Bestandsaufnahme; bestätigte IONOS-Referenz: 2bae30bd95265e9c4b6438bb9fd1845d496fd221, Clean Deploy 45466224411. Keine Änderung der veröffentlichten Vorschau in Phase 0. Entwicklungszweig audit/editorial-ux-2026-11.

## Quellen und Grenzen
Original-Archiv CreAid-Media.zip, 3 XML-Sitemaps vom 13.06.2026 (nur direkte url/loc gezählt, nicht image:loc), SEO Keyword Scoring Workbook.xlsx (Imported_374, Custom_42, Top_50_Initial, README und Lookup), Keyword Recherche Werbeagentur.txt, Masterworkflow 4.3, Blog-Optimizer 1.6. Quellcode src/_data/routes.json, aliases.json, pages.json, postsIndex.json, index.njk, blog.njk, service-crosshair.js und globale CSS. Ubersuggest-Domainabfrage Deutschland/de am 24.11.2026, PageSpeed-Audit der IONOS-Vorschau am selben Tag. Daten aus der Keyword-Datei sind historische Eingaben, nicht neu verifizierte Suchvolumen. Keine Search-Console-Daten vorhanden. Archiv ist ein Frontend-Mirror, kein vollständiges WordPress-Backup. Keine Bildrechte oder Referenzzuordnung automatisch behaupten.

## URL- und Contentbestand
98 kanonische Routen: 1 Home, 4 Service, 34 Agency, 59 Journal (39 Beiträge + 19 Archive + Journal-Übersicht). Alle 98 Metadatensätze haben Titel und Beschreibung. Aus Sitemaps: 32 Seiten + 36 Posts + 19 Kategorien = 87 ursprüngliche URLs; 86 unverändert kanonisch, 1 als konfigurierte Weiterleitung, 0 ohne Zuordnung. Siehe phase-0-url-matrix.json; dies ist ein Konfigurationsabgleich, keine neue HTTP-Prüfung. Die zusätzlichen Routen sind: /beste-landingpage-elemente-fuer-kampagnen, /cookie-einstellungen, /google-ads-social-media, /ki-automatisierung-fuer-unternehmen, /ki-automatisierung, /ki-workflows-crm, /kontakt, /leistungen, /projekt-detail, /referenzen, /ueber-uns, /webdesign-fuer-kleine-unternehmen. Cookie-Richtlinie -> Cookie-Einstellungen: rechtliche/inhaltsbezogene Gleichwertigkeit vor Launch gesondert prüfen. Legacy-Spezialleistungen (CS-Cart, Wartung, Hosting, Film etc.) fachlich bestätigen und Navigation/Angebotsstruktur anhand realer Leistungen überprüfen; keine ersatzlose Entfernung. Keine neue Stadt-Landingpage ohne echten Standortbezug.

## Sichtbarkeit der bestehenden Hauptdomain (Ubersuggest)
Deutschland, Deutsch; jüngster Monatsstand Oktober 2026. Geschätzte organische Besuche: August 1, September 4, Oktober 5. 1 erfasstes organisches Keyword, Domain Authority 12, 266 Backlinks, 126 verweisende Domains. Einziger zurückgegebener Suchbegriff: "cready online" Position 30, Volumen 110, URL http://creaid-media.de/. Kein Beleg für aktuelle Rankings relevanter Leistungskeywords. Datenanbieter-Schätzung, keine tatsächlichen Sessions/Impressionen, keine GSC-Daten. Hauptdomain und Vorschau nicht verwechseln.

## PageSpeed-Laborwerte — IONOS-Startseite
| Kennzahl | Desktop | Mobil |
|---|---:|---:|
| LCP | 406 ms | 1,8 s |
| FCP | 406 ms | 1,8 s |
| CLS | 0,005 | 0,006 |
| TBT | 0 ms | 0 ms |
| Speed Index | 1,3 s | 4,6 s |
| Ungenutztes CSS | 56 KB / geschätzt 80 ms | 38 KB / geschätzt 150 ms |
| Nicht minifiziertes CSS | 5 KB | 5 KB |
| Nicht minifiziertes JS | 2 KB | 2 KB |
Ubersuggest PageSpeed Audit done=true, beide Geräte status=ok. Keine Feldmetriken (INP/CrUX) und keine Lighthouse-Kategoriescores im Ergebnis geliefert. LCP/CLS im Labor günstig, mobiler Speed Index auffälliger; kein Anlass für Performance-opferndes Redesign oder pauschale Behauptung schlechter Core Web Vitals. Weitere Seitentypen im Browser-Messlauf erfassen. Vorschau-noindex beibehalten.

## Keyword-Strategie (historisches Workbook)
374 + 42 = 416 Datensätze einschließlich Überschneidungen; 286 + 30 = 316 mit Volumen 0 (keine Aussage über tatsächlich fehlende Nachfrage). Pro Business Score = Volumen * CPC * Intentgewicht * Fitgewicht / SEO Difficulty². Top_50_Initial ist historischer Snapshot, dessen Fit/Score teils von Imported_374 abweicht. Intent-Auto und Fit für jede Zielseite manuell verifizieren. CPC-Werte aus Workbook in EUR.
| Keyword | SV | CPC | SD | Pro Score Top_50_Initial | Ziel-URL-Vorschlag |
|---|---:|---:|---:|---:|---|
| wordpress website erstellen lassen | 880 | 19,92 | 26 | 46,68 | /webdesign |
| website erstellen lassen | 4400 | 15,23 | 51 | 46,38 | /webdesign |
| webdesign für ärzte | 1300 | 11,43 | 24 | 38,70 | /webdesign/webdesign-fuer-aerzte |
| webdesign für immobilienmakler | 260 | 5,76 | 10 | 22,46 | /webdesign-fuer-immobilienmakler-moderne-immobilien-websites |
| webdesign für handwerker | 880 | 7,73 | 26 | 15,09 | /webdesign/webdesign-fuer-handwerker-mehr-anfragen-statt-nur-empfehlungen |
| corporate design erstellen lassen | 140 | 8,26 | 12 | 14,46 | /grafikdesign-2 (kommerziell); gleichnamigen Ratgeber auf Informationsintention prüfen |
| werbeagentur deutschland | 480 | 3,18 | 21 | 5,19 (Imported_374) | / (prüfen; deutsche Kundschaft, tatsächlicher Sitz Türkei klar nennen) |
Startseite = Marken-/Agenturintention, keine künstliche Überladung mit Spezialkeywords. /webdesign = transaktionale Website-Erstellung, Branchenseiten = spezifische Angebote, Journal = konkrete Informations-/Problemintention. Handwerk-Cluster mit 4 thematisch nahen Ratgebern und Branchenseite ist Kandidat für Kannibalisierungsanalyse, kein bewiesener Rankingkonflikt. Corporate-Design-Ratgeber und Angebot ebenfalls trennen. Frische SERP-/Keyword-Daten und GSC-Auswertung in Phase 4. Keine automatisch erzeugten Ortsseiten.

## Originalmedien und Inhaltslücken
Archiv 1743 Einträge, 180 HTML-Dateien inklusive Archive/Pagination, 762 Bilddateien im wp-content/uploads, 185 Namen ohne Suffix -BreitexHöhe (kein garantiert eindeutiger Originalbestand). Alte Startseite 20 unterschiedliche img-src im Hauptinhalt, u.a. Ratgeber-Oktober-Mockup.jpg, Raetselmagazin-Mockup.jpg, Mockup-Responsive-Bauhaus-Seite.jpg, Fly2Change-Mockup.jpg, Mass-Mockup.jpg, KueArt-Mockup.jpg, restaurant-foto.jpg, Billboard-Berlin.jpeg, rheinautoglas-logo-klein-f-web.jpg und Gross-interior-designer-working-out-office.jpeg. Die neue Startseite hat keine echten Projektbilder im Hauptbereich, überwiegend CSS-Mockups. Originale Startseite mit zwei H1; neue besitzt einen semantischen H1, visuell große kreative Claims. Originale H2: Wie wir wirken; Darum Creaid-Media; Webdesign & Branding Arbeiten; Design entscheidet; Können wir helfen? Diese inhaltliche Direktheit wiederherstellen, ohne frühere Heading-Fehler zu reimportieren.
Medienkandidaten: Editorial/Print (Ratgeber/Rätselmagazin/Anzeige), Webdesign (Bauhaus responsive, Fly2Change), Branding/Outdoor (Mass/KueArt/Billboard), Fotografie (Restaurant/Motive). Rechte, Aktualität, reale Auftragszuordnung und Bildqualität einzeln prüfen; keine künstlichen Mitarbeiter-/Kundenbelege. Hero nicht zwingend Stockfoto; Portfolio-Fotografie kann Hauptmotiv sein. Original-Medienreferenzen als Quellen, keine Kopie der alten HTML-Struktur.

## Journal
39 Beiträge, Kategorien nach Daten: {"seo":8,"webdesign":14,"branding":10,"webdesign ecommerce":3,"ki webdesign ecommerce":1,"webdesign ecommerce ki":1,"webdesign ki":1,"ki":1}. 38/39 imageAlt leer; prüfen, ob als dekoratives Bild in einem verständlich benannten Link korrekt oder informativer Alt-Text nötig ist; nicht pauschal Keyword-Alt-Texte erzeugen. 19 Themenarchive mit vielen ähnlichen Labels; keine vorschnellen Löschungen. Paginierung: bisher scrollIntoView(#artikel) vor Archiv- und Filterblock; auf Arbeitszweig auf #journal-results geändert, Teststatus offen. Vorige UX-CSS hat Leitartikel bereits in normalen Flow überführt, legacy JS arbeitet noch am Bildtransform. Neue Informationsarchitektur: kompakter Hero, Themenfilter (Webdesign, Marketing & SEO, Branding/Print, KI, E-Commerce), statischer Leitartikel, 6–9 Karten mit Bild, Titel, kurzem Auszug und Lesezeit, zugängliche Pagination und Rückkehrposition. Filter-/URL-/History-Verhalten, no-JS und Archivverlinkung testen.

## Globales Design und Prioritäten
P0: Header/Footer, globale Komponenten und dunkle Sektionsflächen inventarisieren; CSS-/DOM-Messlauf. service-crosshair.js derzeit nur page-top/sp-hero, Startseite .axes, Agenturseiten .a-grid-cross. Einheitlicher Fadenkreuz-Standard auf dunklen Inhaltsbühnen, dekorativ, pointer-events:none, statischer reduced-motion-Fallback, keine Doppelung. Nicht wahllos dunkle Cards/Navigation dekorieren.
P1: Journal-UX, klare Sektionen, reale Projektbilder und Informationszugang; Homepage: eindeutiger Nutzen/CTA, 4 Leistungen mit Substanz, echte Referenzen, Vorgehen, Branchen, Journal, ggf. FAQ, Kontakt. Mobile first. Keine neuen erzwungenen Vollbild-Scrollstrecken.
P1: SEO: transaktionale und informative Intention trennen, H1/H2 und Inhalt, interne Links, Bilder, Schema, Meta-Texte, URL-Matrix. GSC-Daten und Rechte/Fakten vor finaler Abnahme ergänzen.
P2: vereinheitlichte Styles, Cache-Busting, ungenutztes CSS nach Browser-Coverage; LCP/CLS nicht verschlechtern, mobile Lade-/Scrolltests.
Qualitätsgate: keine fehlenden Routen, keine erfundenen Kunden/Preise/Referenzen, keine Indexierung der Vorschau, keine Hauptdomain-Änderung, kein Merge oder Deploy allein aufgrund bestandener Buildtests.

## Status
Quellenprüfung, Sitemap-Matrix, Keyword-Bestandsanalyse, organische Sichtbarkeit und Startseiten-PageSpeed abgeschlossen. Vollständige Browser-Inventur und Lighthouse-Kategorien noch ausstehend; automatisierter read-only Messlauf im Arbeitszweig eingerichtet. Danach Phase 0 abschließen und Phase 1 gezielt abarbeiten.
