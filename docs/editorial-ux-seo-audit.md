# CreAid-Media: Redaktioneller UX-, Design- und SEO-Audit
Stand: 24.11.2026. Ausgangspunkt: bestätigter Pages-Commit 2bae30bd95265e9c4b6438bb9fd1845d496fd221; IONOS-Neu-Upload 45466224411 erfolgreich (98 Seiten, 141 Assets, 239 HTTP-Hashprüfungen). main ddc28f08ac83949198dec670a0a5092e442a41d8 unterscheidet sich ausschließlich in Deployment-/Auditdateien. Keine Übernahme der experimentellen PR #3. Keine Veröffentlichung ohne gesonderte Freigabe.

## Phase 0 – Referenz und Messbasis
Originalarchiv CreAid-Media.zip (WordPress-Mirror 18.11.2026), drei XML-Sitemaps, Masterworkflow 4.3, Keyword-Recherche, SEO-Scoring und Blog-Optimizer 1.6 mit bestätigtem IONOS-Build abgleichen. Originaltexte, Medien, Leistungen, Referenzrechte und URL-Intention prüfen. Lighthouse Desktop/Mobil und echte GSC-Daten getrennt erfassen. Vorschau-noindex bewusst erhalten.

## Phase 1 – Journal und Bedienbarkeit
Befund: journal.js blättert zu #artikel zurück, vor Themenarchiven, Filtern und Karten. Erstmaßnahme: Pagination direkt zur Ergebnisleiste inklusive Fokus und Sticky-Header-Abstand. Weiter: kompakter Hero, statischer Leitartikel, klarer Filter/Suche, wenige Oberthemen, Detailarchive weiter verlinkt, konsistente Karten und Bildformate, URL/History und Rückkehrposition, kein Scrollzwang. 19 Archive nicht ohne Mapping entfernen.

## Phase 2 – Globales Designsystem
Befund: service-crosshair.js adressiert nur main > .page-top und main > .sp-hero. Startseite nutzt .axes, Agenturseiten .a-grid-cross; weitere dunkle Bühnen fehlen. Einheitliche dekorative Komponente je dunkler Inhaltssektion, nicht jeder Karte/Navigation; genau eine Instanz, CSS-Fallback, reduced motion, keine dauerhafte RAF. Computed-Style-/Screenshotinventar aller Seitenfamilien. Globale Header/Footer/CTA, Typografie, Radius, Abstände, Raster, Links, Formularfelder und Icons konsolidieren.

## Phase 3 – Startseite, Bildwelt und Dramaturgie
Befund: index.njk enthält überwiegend CSS-Mockups statt Fotos. Originalarchiv: 762 Upload-Bilddateien inkl. Varianten; vorhandene Startseitenmotive u.a. Ratgeber-Oktober-Mockup.jpg, Raetselmagazin-Mockup.jpg, Mockup-Responsive-Bauhaus-Seite.jpg, Fly2Change-Mockup.jpg, Mass-Mockup.jpg, KueArt-Mockup.jpg, restaurant-foto.jpg, Billboard-Berlin.jpeg. Herkunft/Rechte/Fakten prüfen; keine Stockpersonen als Mitarbeiter/Kunden ausgeben. Bold Editorial + Human & Authentic + Creative Technology. CreAid-Palette und Typografie bewahren; echte Bilder, verständliche Texte, Weißraum, ruhige Motion. Zielstruktur: Hero/Nutzen/CTA, vier Leistungen, ausgewählte Arbeiten und belegbare Vertrauenssignale, Vorgehen, Zielgruppen, Journal, FAQ soweit sinnvoll, Kontakt. Responsive WebP/AVIF, width/height, srcset, Hero priorisieren, unten lazy. Keine pauschale 100vh-Pflicht. Desktop-/Mobilentwurf vor Übertragung auf alle Seitenfamilien prüfen.

## Phase 4 – Inhalte und SEO
Befund: korrekter sichtbarer H1 und Title/Description vorhanden; wenig konkrete Leistungsinformationen und reale Bild-/Referenzsubstanz. Keyword-zu-URL-Mapping, Suchintention, SERP/GSC-Evidenz, Kannibalisierung, H1/H2, Title/Description, Links, alt-Texte, strukturierte Daten und belegbare Vertrauenssignale. Keine Keyword-Fülltexte. URLs/301s erhalten oder Änderungen dokumentieren. Journal-Taxonomie aus tatsächlichem Artikelbestand ableiten. Kein Indexieren der Vorschau; rechtliche Entwürfe bleiben gesperrt.

## Phase 5 – Performance und Barrierefreiheit
PR #2 separat nachvollziehen, nicht blind mergen. LCP/CLS/INP, Netzwerk/JS, Bild-/Fontoptimierung, Content-Hashing, Tastatur, Touch, Fokus, Kontrast, No-JS, reduced motion. Beide Host-Builds vereinheitlichen. Vorschau no-store, Produktion gesondert entscheiden.

## Phase 6 – Gesamtabnahme
Build, 98 Ausgangsseiten (Änderung nur mit URL-Matrix), Links, Redirects, Metadaten, Desktop/Tablet/Mobil, Chromium/Firefox/WebKit, Journal-Interaktionen und Crosshair-Inventar. Soll-Ist-Vergleich mit freigegebenem neuen Design statt unveränderter Pixelgleichheit. Vorher/Nachher-Messungen, Fehlerliste, offene Entscheidungen. IONOS-Vorschau erst nach Prüfung aktualisieren; Hauptdomain/DNS/Indexierung unverändert.

## Status
Phase 0: erste Quellen-/Codeprüfung durchgeführt, Messbasis ausstehend.
Phase 1: Pagination-Korrektur auf isoliertem Branch implementiert, Test ausstehend.
Phasen 2–6: geplant, nicht umgesetzt. Keine behaupteten neuen Lighthouse-Werte.
