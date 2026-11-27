# CreAid-Media · Fertigstellung der Website

Stand 27.11.2026 (Europe/Istanbul) · Vorschau zuletzt im [IONOS-Lauf für PR #18](https://github.com/kemcap/creaid-media/actions/runs/45970092634) veröffentlicht · weiterer Kandidat [PR #19](https://github.com/kemcap/creaid-media/pull/19)

**Freigabestatus:** Vorschau veröffentlicht. Produktionsreife wird geprüft. Änderungen an `creaid-media.de` erfordern die ausdrückliche Produktionsfreigabe. Die Vorschau bleibt auf `noindex,nofollow,noarchive`.

Priorität P0 blockiert den Launch, P1 gehört zur Endabnahme, P2 umfasst nachgelagerte Optimierungen. Statuswerte sind OFFEN, IN ARBEIT, IMPLEMENTIERT, GETESTET, VERÖFFENTLICHT, VERIFIZIERT, BLOCKIERT und FREIGABE ERFORDERLICH.

## 1 · Konsolidierung und Designsystem

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Repository, Branches, technische Doku und Actions prüfen | VERIFIZIERT | Aktive PRs und Vorgänger abgeglichen. PR #16 gemergt; IONOS-Lauf 45964224406 erfolgreich. Folge-Commit `a6291be` betraf nur generierte Ausgabe. Startseite, Kontakt, Portfolio, Journal und Motion-CSS der Vorschau liefern HTTP 200; CSS-Hash entspricht dem Quell-Asset. |
| P1 | Interaktiven Styleguide veröffentlichen | VERIFIZIERT | [PR #17](https://github.com/kemcap/creaid-media/pull/17), [CI](https://github.com/kemcap/creaid-media/actions/runs/45965390333), [IONOS](https://github.com/kemcap/creaid-media/actions/runs/45967729180), [GitHub Pages](https://github.com/kemcap/creaid-media/actions/runs/45967729277). [IONOS-Styleguide](https://vorschau.creaid-media.de/assets/demos/creaid-style-guide.html) liefert HTTP 200, erwartete Robots-Header und bytegenau die kanonische HTML-Datei. Menü, Reveal und Formularsimulation bei 320, 390, 768 und 1440 px getestet. |
| P1 | Styleguide, AGENTS.md und Implementierung synchronisieren | IN ARBEIT | Guide und geteiltes CSS sind bytegleich. Prüfumfang umfasst The Plus, The Living Dot, Focus Pulse Compact, Circular Reveal, Bounce V6, Mobile Soft Stagger, Formularstatus, Kontaktleiste, Hero und Ticker. PR #19 bringt den Verweis auf Blog-Optimizer V2.2, den veröffentlichten Styleguide und den Tracker in AGENTS.md. |

## 2 · Portfolio und Kontakt

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | 16 Arbeitsproben, Verlinkung, Filter, Bilddialog und responsive Medien | GETESTET | Alle Kartenbilder dekodiert, 32 lokale WebP-Assets und 2 Startseitenmotive geprüft. Fünf Filter, Pfeiltasten, Escape und Fokusrückgabe bei vier Breiten bestanden. Alle 16 Motive zusätzlich als Einzelvorschauen visuell geprüft. Finale Bestätigung der Nutzungsrechte offen. |
| P0 | Formulareingaben, Versandanimation, Fehler, Ladezustand und Bestätigung | GETESTET | Browserprüfungen mit simulierten Turnstile- und API-Antworten bestanden. Der öffentliche Vorschauendpunkt beantwortet GET mit 405, JSON und `nosniff`. |
| P0 | Spam-Schutz, private Konfiguration und E-Mail-Zustellung | IN ARBEIT | Turnstile, Honeypot, Rate-Limit und SMTP sind implementiert. Ein historischer, freigegebener [Live-Test](https://github.com/kemcap/creaid-media/actions/runs/45865265674) bestätigt die SMTP-Annahme. Die [Zustellungsdiagnose](https://github.com/kemcap/creaid-media/actions/runs/45865968866) fand keine zugehörige Bounce-Nachricht. Der tatsächliche Eingang im Geschäftspostfach und ein neuer End-to-End-Test mit freigegebener Testanfrage stehen aus. |
| P0 | Doppelsendungen und CRM-Duplikate | IN ARBEIT | [PR #18](https://github.com/kemcap/creaid-media/pull/18) gemergt. PHP- und Browser-Mocks belegen den Schutz gegen parallele Anfragen, erneuten Versand bestätigter Nachrichten und doppelte Conversions. Die private IONOS-Datei wird erst mit dem vorgesehenen Schritt in PR #19 aktualisiert. |
| P0 | HubSpot, Feldzuordnung und Datenschutz | BLOCKIERT | Quelladapter für E-Mail, Vorname, Nachname und optional Firma/Telefon vorhanden. Das verbundene HubSpot-Portal meldet ein ausstehendes Onboarding. Serverkonfiguration, Datenschutzhinweis und freigegebener End-to-End-Test fehlen. Produktive Kontaktkonfiguration separat vorbereiten. |

## 3 · Performance

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | Vorhandene Engine, Fingerprinting und Kandidatenvergleich | IN ARBEIT | Fingerprint-Test und isolierte Paketierung für 122 Routen mit 189 versionierten Ressourcen bestanden. PR #6 erweitert den Prototyp. PR #11 betrifft einen älteren Cache-Ablauf. Der isolierte Vergleich verwendet den aktuellen IONOS-Workflow und dessen bestehenden Cache-Kandidaten. |
| P1 | CSS/JS, Abhängigkeiten, Bilder, Lazy Loading und Fonts | IN ARBEIT | Build misst 308.091 Byte CSS und 85.194 Byte JS über die geprüften Quell-Assets. WebP und lokal geladene Fonts vorhanden. AVIF, Ladeprioritäten und Reduktion des übertragenen Umfangs messbasiert prüfen. |
| P1 | IONOS-Cache, Invalidierung, HTTP-Header und Komprimierung | IN ARBEIT | Vorschau-HTML und unversioniertes Motion-Asset liefern `no-store`, gzip und ETag. Apache-Tests mit privatem, immutable Cache für versionierte Assets, Noindex, ETag/304 und Fehlerantworten bestanden. PR #19 bereitet Aktivierung und getrennte Live-Prüfung vor. |
| P1 | Lighthouse/PageSpeed, LCP, CLS, INP, TTFB und Ressourcenverbrauch | IN ARBEIT | [Performance-Protokoll](PERFORMANCE-ENGINE-V1.md): drei Lighthouse-Kaltläufe je Profil, Median 96 → 97 und LCP 2,41 → 2,26 s. Wiederholte Navigation über vier Routen 1.788 → 48 kB, Vergleichsbilder pixelgleich. PageSpeed Online meldet HTTP 429. Reale INP-Werte fehlen. |
| P0 | Schutz der Vorschau vor Indexierung | VERIFIZIERT | HTML-Meta und HTTP-Header stichprobenweise live bestätigt, vollständiger Meta-Abgleich für 122 lokale Routen bestanden. Nach Cache-Änderungen erneut kontrollieren. |

## 4 · Journal

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P1 | Redaktion, Lesbarkeit, Fakten, Überschriften, TOC und Verlinkungen | IN ARBEIT | 62 Journal-Karten im Bestand. [V2.1-Nachprüfung](JOURNAL-V21-NACHPRUEFUNG-2026-11-26.md) dokumentiert bereits umgesetzte Korrekturen. Technischer Einzelabgleich: alle 62 Beiträge mit TOC, kein defekter TOC-Anker, bestehende Inline-Bilder mit Alt-Text. 56 Beiträge haben weniger als drei Inline-Bilder. Vollständiges sprachliches und fachliches Lektorat sowie Editorial-Einzelabnahme stehen aus. |
| P1 | Freigabe der Living-Dot-Illustrationen | FREIGABE ERFORDERLICH | Nach Freigabe Guide und Blog-Optimizer abgleichen. Titelbilder, mindestens drei Zusatzbilder und drei kontextgerechte Editorial-Elemente je Artikel abschließend prüfen. Dateinamen, Formate und Alt-Texte bestandsbezogen prüfen. |

## 5 · SEO und Sichtbarkeit

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Historische und aktuelle Sitemaps, Canonicals, Links und 301 | VERIFIZIERT | Alle 87 Projekt-Sitemap- und 94 aktuell im WordPress-Sitemap-Index geführten URLs haben nach Normalisierung eine Zielroute oder einen direkten Alias. Lokaler HTTP-Test für 122 Canonicals, 286 direkte Weiterleitungen einschließlich Query-String, 6 Assets und 3 Negativfälle bestanden. Live-HTTP-Abgleich auf IONOS für alle 122 Canonical-Routen und 286 Weiterleitungen bestanden. Acht vorübergehende Zeitüberschreitungen wurden erfolgreich erneut geprüft. |
| P0 | Produktionssitemap und Indexierungsumfang | GETESTET | [PR #19](https://github.com/kemcap/creaid-media/pull/19) erweitert den Entwurf von 54 auf 99 Ziele. 91 bestehende WordPress-Ziele und acht bereits vorgesehene neue Seiten. Drei Rechts- und Consent-Seiten stehen zur Einzelabnahme aus. 19 WordPress-Entwürfe und die Beispielstudie sind ausgenommen. |
| P1 | Suchintention, Keyword-Scoring und Kannibalisierung | IN ARBEIT | Workbook mit 374 importierten und 42 eigenen Begriffen vorliegend. Ubersuggest Deutschland/Desktop, 28.10.–27.11.: 92 überwachte Begriffe, davon „creaid“ auf Position 4 mit `/creaid-blog` als Ziel. Die übrigen 91 außerhalb der erfassten Top 100. Search-Console-Abfragen nach Zielseite fehlen. Keine belegte Kannibalisierung. |
| P1 | Titel, Beschreibungen, H1–H6, Schema, Social und Bild-SEO | IN ARBEIT | 122 Quell-Metadatensätze und 94 syntaktisch gültige Schema-Payloads. Alle referenzierten Social- und Bild-Assets des isolierten Produktionsumfangs lokal vorhanden. Die 94 Payloads verwenden BlogPosting, Service, CollectionPage und Organization. Beim Präsenzabgleich fehlen in fünf BlogPosting-Payloads Publikationsdaten und in vier zusätzlich Autorenangaben. WordPress bestätigt die vier Publikationsdaten der bestehenden Artikel und weist als Autorenbezeichnung den Administrationsaccount aus. Die redaktionelle Autorenangabe und das Datum des neuen KI-Ratgebers sind noch zu bestätigen. Das Keyword-Scoring priorisiert „website erstellen lassen“ für die Hauptleistung und „webdesign für handwerker“ für die Branchenseite. Redaktionelle Handwerker-Ratgeber werden an jeweils ihrer konkreten Suchfrage gemessen. |
| P0 | Analytics, Consent und Search-Console-Vorbereitung | IN ARBEIT | Neun automatisierte Consent-Szenarien einschließlich Produktionsdomain-Bedingung und Widerruf bestanden. Produktionskonfiguration, Datenschutztext und spätere Einreichung der Sitemap gehören zur Freigabe. |

## 6 · Qualitätssicherung

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Build, Technik und Browser | IN ARBEIT | `npm run verify` ohne Befund, 122 Seiten und 6.797 interne Links. [PR-CI](https://github.com/kemcap/creaid-media/actions/runs/45965390333) mit Chromium, Firefox und WebKit erfolgreich. Zusätzlicher lokaler Durchlauf mit Chromium, Firefox und WebKit nach Installation der Laufzeitbibliotheken erfolgreich: 596 Renderings einschließlich aller 122 Routen bei 320 px und 200 Prozent Schriftgröße, ohne gemeldete Funktions- oder Layoutfehler. Edge in der PR-Matrix ergänzt. Physische Geräte sind separat zu prüfen. |
| P1 | Responsive Matrix, Hoch-/Querformat und Bedienung | IN ARBEIT | Navigation, Untermenüs, CTAs, Kontakt, Formulare, Scrollanimation, Bilddialog, Journalfilter, Fehlerseiten und Consent über bestehende Browserprüfungen abdecken. Sehr kleine und große Viewports, Zoom und Systemschrift getrennt prüfen. |
| P0 | Barrierefreiheit | IN ARBEIT | H1-Struktur, Reduced Motion, Tastatur und Fokusrückgabe in Teilbereichen getestet. Automatischer WCAG-Audit (A/AA 2.0 und 2.1 bei 390 px) für alle 122 Routen ohne Befund. Seitlichen Überlauf bei vergrößerter Schrift auf 16 Routen behoben. Der erneute Test aller 122 Routen bei 320 px und 200 Prozent ohne Überlaufbefund ist Teil der Browserprüfung. Manuelle Screenreader- und Tastaturabnahme bleibt offen. |
| P0 | HTTPS, Sicherheitsheader, Validierung, Datenschutz und Recht | IN ARBEIT | Vorschau-HTTPS und Indexierungsschutz erreichbar. PR #19 ergänzt `nosniff` und Referrer-Policy für den IONOS-Vorschau- und lokalen Produktionsprüfstand. Live-Header nach Deployment prüfen. Impressum, Datenschutz, Anbieter, Datenübermittlung und Tracking zur menschlichen Abnahme in [RELAUNCH-FREIGABE.md](RELAUNCH-FREIGABE.md) dokumentiert. |

## 7 · Produktionsvorbereitung

| Priorität | Aufgabe | Status | Stand und Nachweis |
| --- | --- | --- | --- |
| P0 | Backup und Rollback | BLOCKIERT | [Vorgehen für Backup und Wiederherstellung](RELAUNCH-FREIGABE.md) dokumentiert. Ein tatsächlicher WordPress-Datenbankexport, vollständiger Webroot und Wiederherstellungstest benötigen Zugriff auf die produktive IONOS-Instanz. Das Projekt-ZIP ist eine öffentliche Medienreferenz. |
| P0 | Isolierter Produktionsbuild und Hosting | GETESTET | Isolierter Prüfbuild aus PR #19 mit 102 Routen, 246 direkten Apache-Weiterleitungen und korrekten Canonicals getestet. 99 Ziele im separaten Sitemap-Entwurf. Fünf Negativtests für Entwürfe, Demos, Sitemap und API bestanden. Die Produktionsparameter für direkten Kontakt und HubSpot stehen aus. |
| P0 | Endabnahme und Freigabebericht | OFFEN | Nach Abschluss der P0-Befunde den belegten Stand, verbleibende Entscheidungen, Backup-Referenz und Rollback-Kriterien dokumentieren. |

## 8 · Liveschaltung

**FREIGABE ERFORDERLICH.** Nach ausdrücklicher Freigabe Backup prüfen, Build veröffentlichen, genehmigte URLs indexierbar machen, Sitemap einreichen, Weiterleitungen live testen, Kontakt/CRM und Consent prüfen. Deploy-, Mail- und 404-Protokolle, Performance und Suchsichtbarkeit beobachten. Bei kritischem Fehler nach verifizierter Rollback-Anleitung zurücksetzen.

## Nächster Arbeitsschritt

PR #19 und den zugehörigen IONOS-Lauf bis zum Abschluss überwachen. Anschließend den Cache, die Sicherheitsheader und die private PHP-Aktualisierung in der Vorschau verifizieren. Für die Produktionsfreigabe zuerst den Backup-Satz und die Zustellung ins vorgesehene Geschäftspostfach belegen.
