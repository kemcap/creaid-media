# V10.1 – Testprotokoll

Stand 22.11.2026. Testbasis war die vollständig gerenderte Eleventy-Projektkopie.

| Prüfung | Ergebnis |
|---|---|
| Eleventy 3.1.8 | Nativer Build mit 59 HTML-Seiten und einem generierten Apache-Regelsatz |
| HTML, Links und Assets | 59 Seiten, 1.573 Links im Hauptinhalt einschließlich Sprunglinks; keine fehlenden lokalen Ziele oder Fragmente, keine fehlenden direkt referenzierten Assets |
| Metadaten | 59 eindeutige Titel/Beschreibungen, 59 eindeutige Canonicals und eine H1 pro Seite, 38 Artikel-JSON-LD-Blöcke |
| Browser | 236 Chromium-Ansichten bei 320, 375, 768 und 1440 px. Alle Seiten laden Ubuntu lokal. Keine beobachteten Seitenfehler, Dokumentüberläufe oder fehlgeschlagenen lokalen Ressourcen |
| Bedienung | 23 Funktionstests bestanden. Dazu gehören mobile Navigationsfamilien, Journal-Filter/Pagination/Suche, Artikel-Navigation, Formularvalidierung und Mail-Entwurf, Cookie-Auswahl, Scrollanimation und Navigation ohne JavaScript |
| Routing | Node-Vorschau und Apache 2.4.71. Je 59 kanonische 200-Routen, 127 direkte 301-Varianten mit erhaltenem Query-Parameter, 6 Ressourcen und 3 Negativtests |
| Live-URL-Bestand | 38 Artikelseiten, 32 sonstige Seiten und 20 Kategoriearchive aus aktuellen Rank-Math-Sitemaps. 41 Routen mit offener Übernahme |
| Vorschau und Live-Freigabe | Keine Veröffentlichung. Keine Messung der Google-Felddaten, keine Prüfung der künftigen HTML-Auslieferung und Formularzustellung über den Produktionshost |

Die Excel-Datei enthält jede geprüfte HTML-Seite, die Befunde mit Schweregrad, alle Artikelzuordnungen und die Empfehlungen zur internen Verlinkung. Der Sitemap-Kandidat unter `docs/` ist nicht Teil von `dist/`.
