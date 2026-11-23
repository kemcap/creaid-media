# SEO-Freigabe und Produktionsvorbereitung – Phase 3

## Aktueller Status
- Das Repository dient ausschließlich als Vorschau; die produktive WordPress-Website wird nicht verändert.
- Alle HTML-Seiten in dist und _site tragen noindex,nofollow,noarchive. Die robots.txt lässt Crawling zu, damit Suchmaschinen noindex lesen können; dies ist kein Zugriffsschutz.
- GitHub Pages verwendet seine eigenen Canonical-, Open-Graph- und JSON-LD-URLs. Das produktive URL-Mapping bleibt in src/_data/routes.json und src/_data/pages.json erhalten.
- Die 59 HTML-Inhalte werden unter den bestehenden Routen ausgeliefert. Historische Slugs nicht ohne Weiterleitungsplan ändern.

## Vor einer ausdrücklichen Produktionsfreigabe
1. Phase 2: Kundenreferenzen und Anfrageprozess verifizieren. Phase 4: Datenschutz, Impressum, Consent und Leistungs-/Browserprüfung abschließen.
2. Aktuellen WordPress-URL-Bestand, XML-Sitemaps und Weiterleitungen vollständig vergleichen; fehlende URLs einzeln zuordnen. Keine pauschalen Redirects.
3. Google Search Console: Suchanfragen nach Seite exportieren (mindestens 90 Tage, Vergleichszeitraum), URL-Wechsel und überlappende Suchanfragen bewerten. Nur bei belegter Konkurrenz Inhalte zusammenführen.
4. Produktionsbuild getrennt vorbereiten, keine GitHub-Pages-Pfade. Canonicals, og:url, og:image, JSON-LD, Server-301 und echte HTTP-Statuscodes auf dem Zielhosting testen.
5. Nur nach expliziter Freigabe für fachlich vollständige Seiten robots auf index,follow ändern; Musterprojekte und unvollständige Rechtstexte nicht ungeprüft indexieren. Die Produktions-XML-Sitemap ausschließlich aus freigegebenen Canonical-URLs erzeugen, in robots.txt referenzieren und in Search Console einreichen. GitHub Pages bleibt noindex.
6. Nach Veröffentlichung Sitemap, URL-Prüfung, 404-Logs und Rankings kontrollieren.

## Suchintentionen (redaktionelle Hypothesen)
- Handwerker: Inhalte der ersten Website / Relaunch-Checkliste / Agenturauswahl / kommerzielle Leistungsseite.
- Corporate Design: Projektplanung und Umfang / Nutzen / Qualitätsprüfung.
- Local SEO: übergreifende Strategie / operative Checkliste.
- Ubersuggest, Deutschland, Abfrage 24.11.2026: ein Datensatz für die Domain, keine belastbaren Belege für Kannibalisierung. Keine Löschungen oder Zusammenlegungen.

Keine Produktionsfreigabe durch diesen Commit. Keine Garantie, dass Google die Inhalte indexiert oder bestimmte Positionen erreicht.
