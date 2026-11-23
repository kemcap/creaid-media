# Phase 6 – Semantische Überschriften
Die 98 Seiten werden im Eleventy-Build anhand des individuellen Plans in src/_data/headingPlan.json bearbeitet. Der Plan trennt Werbeclaims (gestaltete div-Elemente) von sichtbaren H1/H2. CSS-Selektoren für ursprüngliche große Überschriften werden beim Build mit gleicher Spezifität auf die Claim-Klassen erweitert; Animationen adressieren diese Klassen. Anker-IDs bleiben am semantischen Heading, Artikel-TOC-Texte werden bei Änderungen synchronisiert.

## Recherchegrundlage
Projektdateien: Keyword Recherche Werbeagentur.txt (Business Score = Suchvolumen × CPC × Intent × Fit / SEO Difficulty²) und SEO Keyword Scoring Workbook.xlsx (Top_50_Initial, Imported_374, Custom_42). Im vorhandenen Workbook: WordPress Website erstellen lassen Score 46,68, Website erstellen lassen 46,38, Webdesign für Ärzte 38,70, Immobilienmakler 22,46, Handwerker 15,09, Corporate Design erstellen lassen 14,46. Historische Recherche, keine aktuellen Ranking-/Volumengarantie. Stadt-Keywords ohne belegte Standorte nicht als Hauptüberschriften verwenden. Die Landingpages zielen auf Projektanfragen; Arztpraxis-, Handwerker- und Agentur-Ratgeber auf Informations-/Vergleichsintention. Technische Altleistungen bleiben als Beratungs-/Projektplanung formuliert. Kategoriearchive sind thematische Übersichten, keine konkurrierenden Verkaufsseiten. Kein Keyword-Stuffing und keine unsichtbaren SEO-Texte.

## Freigabe
Bestehende URL-Routen und Noindex-Sicherung bleiben unverändert. Keine Veröffentlichung auf WordPress.
