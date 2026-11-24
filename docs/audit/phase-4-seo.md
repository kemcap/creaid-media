# Phase 4 — Suchintention und Onpage-SEO (erster Durchgang)
Stand: 25.11.2026 (Ausgangsläufe UTC 24.11.). Branch audit/editorial-ux-2026-11; kein Deploy.
Quellen: SEO Keyword Scoring Workbook.xlsx (historische Daten, Top_50_Initial ist abweichender Snapshot), Keyword Recherche Werbeagentur.txt (Business Score = SV * CPC * Intent * Fit / SD²), aktueller Ubersuggest match_keywords (Deutschland 2276, de; CPC in USD, nicht direkt mit historischem EUR-CPC vergleichen), pages.json, routes.json, headingPlan.json, editorialLinks.json, vorherige Audits. Keine GSC-Messdaten, keine vollständige neue SERP-Analyse, kein Nachweis bestehender Kannibalisierung. Die Tool-Intent-Labels sind Hinweise, nicht endgültige Zuordnungen.
## Aktualisierte Keyword-Stichprobe
| Keyword | SV | SD | CPC USD | Tool-Intent | Ziel |
|---|---:|---:|---:|---|---|
| werbeagentur | 12100 | 11 | 6.24 | Commercial | / |
| website erstellen lassen | 2900 | 31 | 18.06 | Commercial | /webdesign |
| webdesign für handwerker | 480 | 9 | 9.37 | Informational | /webdesign/webdesign-fuer-handwerker-mehr-anfragen-statt-nur-empfehlungen |
| webdesign für ärzte | 590 | 27 | 11.59 | Commercial | /webdesign/webdesign-fuer-aerzte |
| webdesign für immobilienmakler | 170 | 9 | 15.12 | Commercial | /webdesign-fuer-immobilienmakler-moderne-immobilien-websites |
| corporate design erstellen lassen | 90 | 20 | 10.42 | Transactional | /grafikdesign-2 |
| seo agentur | 3600 | 11 | 29.97 | Commercial | /seo-3 |
| onlineshop erstellen lassen | 320 | 21 | 22.85 | Transactional | /online-shop-entwicklung |
| ki automatisierung für unternehmen | 10 | 23 | 9.855 | nicht verfügbar | /ki-automatisierung |
"werbeagentur" ist eine breite, häufig lokal geprägte Anfrage; keine lokale Adresse in Deutschland behaupten. Die Agenturpositionierung bleibt auf /, die kaufnahe Website-Intention auf /webdesign. "webdesign für handwerker" vom Anbieter als informational klassifiziert: SERP prüfen, spezifische Handwerker-Angebotsseite und Ratgeber mit klar unterscheidbaren Funktionen erhalten. Hohe Volumina/kleine SD sind kein Rankingversprechen.
## Zuordnung
98 Routen als vorläufige Intent-Matrix, alle 39 Artikel mit geplantem kommerziellem Hub, 19 Archive als thematische Navigation. Die Matrix ist kein Beleg für fertig optimierte Artikel. Priorisierte Konfliktkandidaten: Handwerker (erste Website, Relaunch, Agenturauswahl, Dachdecker), KMU (Planung vs Agenturauswahl), Ärzte (Praxisinhalte vs Dienstleistung), Corporate Design (Briefing vs Dienstleistung), Onlineshop (Eigenbauvergleich vs Angebot), KI (Pilot vs Angebot), Local SEO (Strategie vs Grundlagencheck vs Google Maps). Keine URLs löschen, keine Redirects, keine Canonical-Änderungen ohne tatsächliche Evidenz.
## Implementiert
10 Meta-Titel/-Beschreibungs-Paare auf vorhandenen Seiten geändert, Hero-Text und direkte Links im staged Homepage-Entwurf überarbeitet. 14 neue, überprüfbare interne Link-Zuordnungen in editorialLinks.json; bestehende Links bleiben. Prüfen, ob die jeweiligen Templates diese Zuordnungen ausgeben; Service-Links ggf. in den jeweiligen Kontext übernehmen. Keine neue Keyword-Dichte-Regel. Vorhandene noindex, Canonicals und strukturierte Daten unverändert. Alter /#kontakt-Anker im Homepage-Entwurf wiederhergestellt, Medienimport nach Qualitätsgate erneut.
## Offen
SERP- und Suchintention-Validierung, echte GSC-Daten, Seitenvergleich von Artikelvolltexten und fachliche Überarbeitung je Artikel, Überschneidungsentscheidungen, Bild- und Rechteprüfung, sinnvolle Alt-Texte (leere dekorative Alt-Texte nicht pauschal als Fehler werten), Schema/Launch-Prüfung. Blog-Optimizer V1.7 (verweist auf V1.6) beschreibt unveröffentlichte WP-Entwürfe und separate Bild-/Publikationsgates; keine neuen Entwürfe abgerufen, keine Artikel vollautomatisch umgeschrieben oder veröffentlicht. Bestehende 98 URLs bleiben unverändert. Neue Messwerte nach vollständigem Build/Browserlauf erfassen; kein SEO-Score durch Entfernung des Vorschau-noindex künstlich verbessern.
