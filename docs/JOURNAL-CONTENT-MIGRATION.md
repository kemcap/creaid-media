# CreAid-Media · Journal und Content-Migration

## Überprüfung des bisherigen Maßnahmenpakets

Ausgangsstand `ef2071f`. Der Abgleich mit dem UI/UX-Audit und `UI-UX-IMPLEMENTIERUNG.md` bestätigt die dokumentierte Abnahme für UI-01, A11Y-01 und PERF-01 im gemessenen Umfang sowie NAV-01, JRN-01, JRN-02 und JRN-05. Der globale Regressionslauf wurde nach der Migration erneut ausgeführt. Native Browserzoom-Prüfung, verbleibende globale Kontrastbefunde sowie Performance-Felddaten bleiben offen und sind kein Bestandteil der Journalmigration.

## Fehler-IDs und Umsetzung

| ID | Ergebnis |
|---|---|
| JRN-03 | Die 19 Entwurfskarten und Artikelköpfe verwenden wieder die jeweiligen WordPress-Beitragsbilder. Zuordnung über die gespeicherten Beitragsbild-IDs, Alt-Texte aus der Mediathek, WebP-Originale per HTTPS bytegleich übernommen. Die vier bereits migrierten veröffentlichten Beiträge behalten vorhandene Cover und Inlinebilder. |
| JRN-04 | 23 importierte Artikel verwenden die bestehende CreAid-Journalgestaltung mit gemeinsamem Artikelkopf, Artikelstruktur und Inhaltsverzeichnis. Vorhandene Lesezeit/Themen stehen einmal direkt unter der H1, sofern im Ausgangstext vorhanden. Desktop-Navigation und mobile aufklappbare Navigation verwenden die tatsächlichen H2. Bestehende IDs bleiben erhalten. Die drei Piloten decken Prozessratgeber, Vergleich und Audit ab. |
| JRN-06 | Neun Karten pro Seite ergeben sieben Journal-Seiten. Google Ads hat einen Filter für den in WordPress zugeordneten Beitrag. Suche, Leerzustand, Rückkehr zur Trefferliste, Vor/Zurück und Archivroute wurden geprüft. Andere Themenzuordnungen werden wie bisher verwendet. |

## Visuelle Pilotprüfung

- Google Maps · Prozessratgeber mit Originalcover, vorhandener Nummerierung und sichtbarer Abschnittsfolge im Inhaltsverzeichnis.
- Freelancer oder Full-Service-Agentur · Vergleich mit Originalcover und klarer Tabellenhierarchie. Die Tabelle besitzt einen beschrifteten, per Tastatur erreichbaren Scrollbereich. Der Artikel bleibt innerhalb des Viewports.
- Website-Audit · Analytischer Artikel mit Originalcover, sichtbarer Themenzeile sowie bestehenden Belegfotos im Lesefluss.

Die Piloten verwenden vorhandene Typografie, Raster und Scrollmechanik. Jedes Design wurde vor der Serienübernahme gerendert und auf Medien, H1/H2-Hierarchie, Reflow und Navigation geprüft. Nach der Sichtung wurden das Seitenverhältnis des Covers und der Platz der Metazeile präzisiert. Die Screenshotreihe enthält Ganzseiten und Details zu Einstieg, Inhalt und Abschluss aus dem lokalen Eleventy-Build.

## Regression und Abnahmeumfang

- Pilotprüfung · 3 Artikel × 5 Viewports (320, 360, 390, 768, 1440 px) × 3 Engines = 45 Browserprüfungen.
- Serienprüfung · 85 Browserprüfungen. Chromium prüfte alle 23 migrierten Artikel, Firefox und WebKit die drei Piloten. HTTP, H1, H2/TOC-Zuordnung, mobile Sprungziele, Bilder und horizontaler Überlauf wurden geprüft.
- Inhaltserhalt · Die Textsequenz aller 23 Artikel wurde gegen die vorherigen Quelldaten verglichen. URLs, Seitenmetadaten, Inlinebilder, Beitragsstatus und Journalbestand wurden separat abgeglichen. Bestand: 62 Einträge, davon 42 veröffentlichte Beiträge, 19 Entwürfe und ein Vorschauartikel.
- Globale Regression · Eleventy, Struktur, Header/Footer, Startseitenanimation, Qualität und Routen erfolgreich. 122 kanonische URLs, 285 Weiterleitungen, 6 Routing-Ressourcen und 3 Negativfälle. Die Qualitätsprüfung meldet bei 6.342 internen Link- und 2.643 Asset-Vorkommen keine Befunde.
- Prüfumgebung ist der lokale Build. Eine Prüfung der bereitgestellten Website nach Freigabe bleibt aus. Es wurde kein WordPress-Inhalt geschrieben.

## Geänderte Dateien

Artikelvorlagen unter `src/_includes/partials/`, Profil- und Bildzuordnung in `src/_data/journalEditorial.json`, Karten und Filterdaten in `src/_data/postsIndex.json`, Journalseite in `src/pages/blog.njk`, HTML-Aufbereitung in `scripts/journal-editorial.mjs` und `eleventy.config.js`, Darstellung und Pagination in `public/assets/journal-v9.css` und `journal.js`, 19 Originalbilder unter `public/assets/blog/wp-original/`.

## Offene Entscheidungen

PUB-01 und die bestehende Freigabe des Entwurfszugriffs gelten weiter. Die Prüfung aller historischen Themenzuordnungen und das Aufräumen weiterer redaktioneller Vorlagen außerhalb der 23 Importe bleiben außerhalb dieses Rollouts. Merge und Deployment erfordern die vorgesehene Freigabe.
