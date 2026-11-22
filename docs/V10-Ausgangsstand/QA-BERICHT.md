# CreAid-Media V10 – Migrations-QA

**Ausgangsstand:** V9 mit 59 HTML-Dateien (38 Blogartikel).

## Inhalts- und Strukturgleichheit

- 59/59 HTML-Dateien vorhanden, Dateinamen erhalten.
- 59/59 H1-Texte mit V9 identisch.
- 59/59 SEO-Titel und Meta-Beschreibungen mit V9 identisch.
- 59/59 Hauptinhalte textlich mit V9 identisch (inklusive 38 Artikel).
- 0 fehlende lokale Linkziele.
- 0 fehlende lokale Assets.
- Pro Artikel bleibt die bisherige Entwurfskennzeichnung erhalten, insbesondere bei `webdesign-agentur-fuer-kleine-unternehmen`.
- Bestehende `noindex`-Werte unverändert.
- Blogübersicht rendert 38 Karten aus `postsIndex.json`.

## Browser-Gegenprobe

- 27 Durchläufe (9 repräsentative Seiten × 3 Größen: 1440×900, 375×667, 320×568).
- 0 JavaScript-Seitenfehler im geprüften Umfang.
- 0 horizontale Überläufe in V10 an den geprüften Ansichten.
- Pixelvergleich Original vs. V10: auf den bildschirmhohen Testansichten **bis auf kleine bewusste Navigationskorrekturen deckungsgleich**.
- Ursache eines V9-Fehlers (Footer-Navigation ragt mobil über den Bildschirm) in `agency-pages.css` behoben.

Die Browser-Gegenprobe verwendete inline eingebettete lokale Styles, Skripte und Bilder und reduzierte Bewegung. Damit ist der Vergleich innerhalb der Testumgebung möglich, aber es wurde **kein realer HTTP-Test mit extern geladenem Google-Font oder GSAP CDN** vorgenommen.

## Was NICHT verifiziert wurde

**Eleventy-CLI-Build nicht ausgeführt**, da die externe npm-Registry in dieser Umgebung mit `EAI_AGAIN` nicht erreichbar ist. Das beiliegende `dist/` ist eine vollständig gerenderte statische Vorschau aus denselben Nunjucks-kompatiblen Templates mit einem Offline-Renderer. Auf dem Entwicklungsrechner einmal `npm install && npm run build` durchführen, bevor die Migration als produktionsbereit gilt.

Weitere Arbeiten: Rechtsfreigabe, CMS-/Form-Backend, UI/UX-Endreview, Server-Redirects, Canonical und Sitemap, Pillar-Content und interne Verlinkung, fachlicher Artikelcheck. Keine Live-Veröffentlichung erfolgt.
