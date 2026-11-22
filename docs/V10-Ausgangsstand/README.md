# CreAid-Media V10 – Eleventy-Migration (Quelle V9)

**Stand: 22.11.2026. Kein Live-Deployment.** Das V9-Projekt mit 59 HTML-Seiten
(einschließlich 38 Blogartikeln) wurde als **Eleventy-3-Quellprojekt** angelegt.
Die Designs wurden absichtlich nicht umgebaut: Ubuntu, Georgia und bestehende
Scroll-Animationen sollen beim Architekturwechsel unverändert bleiben.

## Schnellstart – Eleventy-Build

1. Node.js >= 20 bereitstellen.
2. Im Projektordner `npm install` ausführen.
3. `npm run dev` für die lokale Vorschau ausführen.
4. `npm run build` erstellt die veröffentlichbaren Dateien in `dist/`.

**Ausführungsumgebung dieser Erstellung:** `npm install` konnte mangels Zugriff
auf die npm-Registry (`EAI_AGAIN`) nicht ausgeführt werden. Ein tatsächlicher
Eleventy-Build ist deshalb **nicht als erfolgreich getestet** ausgewiesen.
Das beiliegende `dist/` wurde als überprüfbare statische Vorschau mit einem
Nunjucks-kompatiblen Offline-Renderer erzeugt. `dist/` ist kein Nachweis, dass
`npm run build` hier ausgeführt wurde.

## Verzeichnisstruktur

- `src/pages/*.njk` – 21 sonstige Seiten mit eigenen URL-Permalinks
- `src/posts/*.njk` – 38 vorhandene Artikel mit Original-HTML-Inhalten
- `src/_includes/layouts/base.njk` – zentrale Meta- und Dokumentvorlage
- `src/_includes/partials/header-*.njk` und `footer-*.njk` – pro Designfamilie je eine zentrale Navigation und ein Footer
- `src/_includes/partials/journal-card.njk` – einheitliche Blog-Karte
- `src/_data/pages.json` – Seitentitel, SEO-Beschreibungen, Canonicals, Head-Assets und Seitentypen
- `src/_data/postsIndex.json` – 38 Artikel für die automatisch erzeugte Blogübersicht
- `src/_data/site.json` – globale Corporate-Design- und Navigationsinformationen
- `public/assets/` – unveränderte statische CSS-, JS-, Bild-Dateien
- `drafts/NEUER-ARTIKEL.md` – Markdown-Starter (nicht veröffentlicht)
- `dist/` – bereits gerenderte, direkt nutzbare statische Vorschau

Die vier Layoutfamilien sind **bewusst separat**: Startseite, Hauptleistungen,
Agentur/Spezialleistungen/Rechtliches, Journal. Ein späteres UI-/UX-Redesign
kann sie schrittweise zusammenführen, ohne die Inhalte zu duplizieren.

## Vor Veröffentlichung

- Rechtliche Seiten sind weiterhin **prüfpflichtige Entwürfe**.
- Alle Seiten behalten zunächst das bisherige `noindex`.
- Redirects/Canonicals, URLs ohne `.html`, Form-Backend, externen Live-Links,
  Artikelkategorien und interne Verlinkung müssen im SEO-Audit überprüft werden.
- Ein redaktionell neu verfasster Artikel aus V9 bleibt als **Entwurf** zu prüfen.
- Font-Dateien sind nicht lokal eingebunden; Google-Fonts-Verwendung prüfen.

**Wichtig:** Die nächste Phase ist gezielte UX-/UI-Korrektur in den gemeinsamen
Templates und Styles. Keine Änderungen an Hosting oder GitHub.
