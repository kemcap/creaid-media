# CreAid-Media · Fertigstellung der Website

Stand 27.11.2026 (Europe/Istanbul) · Eleventy-Basis `7480a1e` · IONOS-Inhaltsstand `9025597`

**Freigabestatus:** Vorschau veröffentlicht. Produktionsreife wird geprüft. Änderungen an `creaid-media.de` erfordern die ausdrückliche Produktionsfreigabe. Die Vorschau bleibt auf `noindex,nofollow,noarchive`.

Priorität P0 blockiert den Launch, P1 gehört zur Endabnahme, P2 umfasst nachgelagerte Optimierungen. Statuswerte sind OFFEN, IN ARBEIT, IMPLEMENTIERT, GETESTET, VERÖFFENTLICHT, VERIFIZIERT, BLOCKIERT und FREIGABE ERFORDERLICH.

## 1 · Konsolidierung und Designsystem

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Repository, Branches, technische Doku und Actions prüfen | VERIFIZIERT | Aktive PRs und Vorgänger abgeglichen. PR #16 gemergt; IONOS-Lauf 45964224406 erfolgreich. Folge-Commit `a6291be` betraf nur generierte Ausgabe. Startseite, Kontakt, Portfolio, Journal und Motion-CSS der Vorschau liefern HTTP 200; CSS-Hash entspricht dem Quell-Asset. |
| P1 | Interaktiven Styleguide veröffentlichen | VERIFIZIERT | [PR #17](https://github.com/kemcap/creaid-media/pull/17), [CI](https://github.com/kemcap/creaid-media/actions/runs/45965390333), [IONOS](https://github.com/kemcap/creaid-media/actions/runs/45967729180), [GitHub Pages](https://github.com/kemcap/creaid-media/actions/runs/45967729277). [IONOS-Styleguide](https://vorschau.creaid-media.de/assets/demos/creaid-style-guide.html) liefert HTTP 200, erwartete Robots-Header und bytegenau die kanonische HTML-Datei. Menü, Reveal und Formularsimulation bei 320, 390, 768 und 1440 px getestet. |
| P1 | Styleguide, AGENTS.md und Implementierung synchronisieren | IN ARBEIT | Guide und geteiltes CSS sind bytegleich. Prüfumfang umfasst The Plus, The Living Dot, Focus Pulse Compact, Circular Reveal, Bounce V6, Mobile Soft Stagger, Formularstatus, Kontaktleiste, Hero und Ticker. AGENTS.md referenziert noch Blog-Optimizer V2.1. Projektgrundlage ist V2.2. |

## 2 · Portfolio und Kontakt

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | 16 Arbeitsproben, Verlinkung, Filter, Bilddialog und responsive Medien | GETESTET | Alle Kartenbilder dekodiert, 32 lokale WebP-Assets und 2 Startseitenmotive geprüft. Fünf Filter, Pfeiltasten, Escape und Fokusrückgabe bei vier Breiten bestanden. Visuelle Einzelprüfung der Ausschnitte und finale Bestätigung der Nutzungsrechte offen. |
| P0 | Formulareingaben, Versandanimation, Fehler, Ladezustand und Bestätigung | GETESTET | Browserprüfungen mit simulierten Turnstile- und API-Antworten bestanden. Der öffentliche Vorschauendpunkt beantwortet GET mit 405, JSON und `nosniff`. |
| P0 | Spam-Schutz, private Konfiguration und E-Mail-Zustellung | IN ARBEIT | Turnstile, Honeypot, Rate-Limit und SMTP sind implementiert. SMTP-Annahme und Weiterleitung bis ins Geschäftspostfach getrennt prüfen. Live-Versand erfordert einen ausdrücklich freigegebenen, gekennzeichneten Test. |
| P0 | Doppelsendungen und CRM-Duplikate | IN ARBEIT | Mehrfachklick während des Versands und HubSpot-Konfliktbehandlung für vorhandene E-Mail-Adressen sind implementiert. Serververhalten bei erneuter Anfrage nach unklarer SMTP-Antwort offen. |
| P0 | HubSpot, Feldzuordnung und Datenschutz | BLOCKIERT | Quelladapter für E-Mail, Vorname, Nachname und optional Firma/Telefon vorhanden. Status im vorgesehenen Konto, geschützte Token-Konfiguration, Datenschutzhinweis und freigegebener End-to-End-Test fehlen. Produktive Kontaktkonfiguration separat vorbereiten. |

## 3 · Performance

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | Vorhandene Engine, Fingerprinting und Kandidatenvergleich | IN ARBEIT | Fingerprint-Test und isolierte Paketierung für 122 Routen mit 189 versionierten Ressourcen bestanden. PR #6 enthält eine erweiterte Engine, PR #11 eine ältere Cache-Automatisierung. Beide mit dem aktiven Uploadweg abgleichen. |
| P1 | CSS/JS, Abhängigkeiten, Bilder, Lazy Loading und Fonts | IN ARBEIT | Build misst 308.091 Byte CSS und 85.194 Byte JS über die geprüften Quell-Assets. WebP und lokal geladene Fonts vorhanden. AVIF, Ladeprioritäten und Reduktion des übertragenen Umfangs messbasiert prüfen. |
| P1 | IONOS-Cache, Invalidierung, HTTP-Header und Komprimierung | IN ARBEIT | Vorschau-HTML und unversioniertes Motion-Asset liefern `no-store`, gzip und ETag. Den freigegebenen Workflow für die Aktivierung erst nach Vergleich verwenden. Live-Header für HTML und versionierte Assets anschließend getrennt prüfen. |
| P1 | Lighthouse/PageSpeed, LCP, CLS, INP, TTFB und Ressourcenverbrauch | IN ARBEIT | Laborvergleich lokal vorbereiten, öffentliche Messung separat. Interaktionswerte nur mit passendem Test oder Felddaten berichten. |
| P0 | Schutz der Vorschau vor Indexierung | VERIFIZIERT | HTML-Meta und HTTP-Header stichprobenweise live bestätigt, vollständiger Meta-Abgleich für 122 lokale Routen bestanden. Nach Cache-Änderungen erneut kontrollieren. |

## 4 · Journal

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | Redaktion, Lesbarkeit, Fakten, Überschriften, TOC und Verlinkungen | IN ARBEIT | 62 Journal-Karten im Bestand. [V2.1-Nachprüfung](JOURNAL-V21-NACHPRUEFUNG-2026-11-26.md) dokumentiert bereits umgesetzte Korrekturen. V2.2-Prüfung und redaktionelle Einzelabnahme folgen. |
| P1 | Freigabe der Living-Dot-Illustrationen | FREIGABE ERFORDERLICH | Nach Freigabe Guide und Blog-Optimizer abgleichen. Titelbilder, mindestens drei Zusatzbilder und drei kontextgerechte Editorial-Elemente je Artikel abschließend prüfen. Dateinamen, Formate und Alt-Texte bestandsbezogen prüfen. |

## 5 · SEO und Sichtbarkeit

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Historische und aktuelle Sitemaps, Canonicals, Links und 301 | GETESTET | Alle 87 Projekt-Sitemap- und 94 aktuell im WordPress-Sitemap-Index geführten URLs haben nach Normalisierung eine Zielroute oder einen direkten Alias. Lokaler HTTP-Test für 122 Canonicals, 286 direkte Weiterleitungen einschließlich Query-String, 6 Assets und 3 Negativfälle bestanden. Live-Abgleich aller Routen und Weiterleitungen offen. |
| P0 | Produktionssitemap und Indexierungsumfang | IN ARBEIT | Vorhandener Entwurf enthält 54 gültige Canonical-Routen, lässt aber 48 aktuell in den WordPress-Sitemaps geführte Ziele aus. Abgleich von Seiten, Beiträgen, Archiven, Rechtstexten und Vorschauentwürfen vor Produktionsfreigabe. |
| P1 | Suchintention, Keyword-Scoring und Kannibalisierung | IN ARBEIT | Workbook mit 374 importierten und 42 eigenen Begriffen vorliegend. Ubersuggest meldet fehlende Kontoverknüpfung. Search-Console-Abfragen nach Zielseite fehlen. Ohne diese Daten sind Überschneidungen redaktionelle Hypothesen. |
| P1 | Titel, Beschreibungen, H1–H6, Schema, Social und Bild-SEO | IN ARBEIT | 122 Quell-Metadatensätze und 94 syntaktisch gültige Schema-Payloads. Inhaltliche Schema-Eignung, erreichbare Social-Bilder und Seitenintentionen einzeln prüfen. |
| P0 | Analytics, Consent und Search-Console-Vorbereitung | IN ARBEIT | Neun automatisierte Consent-Szenarien einschließlich Produktionsdomain-Bedingung und Widerruf bestanden. Produktionskonfiguration, Datenschutztext und spätere Einreichung der Sitemap gehören zur Freigabe. |

## 6 · Qualitätssicherung

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Build, Technik und Browser | IN ARBEIT | `npm run verify` ohne Befund, 122 Seiten und 6.797 interne Links. [PR-CI](https://github.com/kemcap/creaid-media/actions/runs/45965390333) mit Chromium, Firefox und WebKit erfolgreich. Der lokale zusätzliche WebKit-Lauf benötigt fehlende Systembibliotheken. Microsoft Edge und physische Geräte sind separat zu prüfen. |
| P1 | Responsive Matrix, Hoch-/Querformat und Bedienung | IN ARBEIT | Navigation, Untermenüs, CTAs, Kontakt, Formulare, Scrollanimation, Bilddialog, Journalfilter, Fehlerseiten und Consent über bestehende Browserprüfungen abdecken. Sehr kleine und große Viewports, Zoom und Systemschrift getrennt prüfen. |
| P0 | Barrierefreiheit | IN ARBEIT | H1-Struktur, Reduced Motion, Tastatur und Fokusrückgabe in Teilbereichen getestet. Vollständiger Audit für Tab-Reihenfolge, Focus, Kontrast, Semantik, ARIA, Alt-Texte und Textvergrößerung offen. |
| P0 | HTTPS, Sicherheitsheader, Validierung, Datenschutz und Recht | IN ARBEIT | Vorschau-HTTPS und Indexierungsschutz erreichbar. Öffentliche Assets und Response-Header prüfen. Impressum, Datenschutz, Anbieter, Datenübermittlung und Tracking zur menschlichen Abnahme in [RELAUNCH-FREIGABE.md](RELAUNCH-FREIGABE.md) dokumentiert. |

## 7 · Produktionsvorbereitung

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Backup und Rollback | OFFEN | WordPress-Datenbank, Uploads, Plugins/Themes, Konfiguration, Redirects, Webroot, Wiederherstellung und verantwortliche Person verifizieren. Das Projekt-ZIP dient als Referenz für öffentliche Inhalte und Medien. |
| P0 | Isolierter Produktionsbuild und Hosting | OFFEN | Auf sicheren Zielpfad, Produktions-Canonicals, freigegebene XML-Sitemap, Redirects, getrennte Kontakt-/CRM-Konfiguration, Consent und Vorschauausschlüsse prüfen. |
| P0 | Endabnahme und Freigabebericht | OFFEN | Nach Abschluss der P0-Befunde den belegten Stand, verbleibende Entscheidungen, Backup-Referenz und Rollback-Kriterien dokumentieren. |

## 8 · Liveschaltung

**FREIGABE ERFORDERLICH.** Nach ausdrücklicher Freigabe Backup prüfen, Build veröffentlichen, genehmigte URLs indexierbar machen, Sitemap einreichen, Weiterleitungen live testen, Kontakt/CRM und Consent prüfen. Deploy-, Mail- und 404-Protokolle, Performance und Suchsichtbarkeit beobachten. Bei kritischem Fehler nach verifizierter Rollback-Anleitung zurücksetzen.

## Nächster Arbeitsschritt

Vorschau-Zustellung anhand vorhandener Nachweise prüfen, sämtliche veröffentlichten URLs und Weiterleitungen verifizieren und die unabhängige Qualitätsprüfung fortsetzen. Dabei den dokumentierten Sitemap-Abgleich und die Cache-Kandidatenmessung zur Vorbereitung der Freigabe weiterführen.
