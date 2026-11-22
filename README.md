# CreAid-Media V10.1 – Eleventy-Projektkopie

Stand 22.11.2026. Das Projekt enthält 59 HTML-Seiten, davon 38 Journalartikel, sowie die fertig gebaute lokale Vorschau. Alle Seiten tragen den Indexierungsschutz der Vorschau.

## Lokale Vorschau öffnen

**Windows (einfach):** Die Datei `CreAid-Vorschau-starten.cmd` im entpackten Projektordner doppelklicken. Der Browser öffnet `http://127.0.0.1:8080/`. Node.js muss installiert sein; `npm install` ist für die fertige Vorschau nicht notwendig.

**Wichtig:** `dist/index.html` bitte **nicht** direkt per Doppelklick öffnen. CSS, Bilder, Schriften und Skripte nutzen absolute `/assets/`-URLs und benötigen eine Vorschau über `http://127.0.0.1:8080/`.

**Terminal-Variante:**

1. ZIP entpacken und in einem Terminal den Ordner `CreAid-Media-V10-Audit` öffnen.
2. Mit Node.js ab Version 20 `npm run preview` ausführen.
3. Im Browser `http://127.0.0.1:8080/` öffnen.

Das vorhandene `dist/` reicht für die Vorschau. Der mitgelieferte Vorschau-Server löst die Website-Pfade auf und setzt einen lokalen Indexierungsschutz.

## Quellprojekt bearbeiten und bauen

```sh
npm ci
npm run build
npm run dev
```

`npm run dev` startet Eleventy mit Live Reload für lokale Quelländerungen. `npm run preview` dient der Gegenprobe des fertig gebauten `dist/`. Den Vorschau-Port kann man mit `CREAID_PREVIEW_PORT` ändern. Der Routing-Test läuft gegen einen bereits gestarteten lokalen Server:

```sh
node scripts/check-routes.mjs http://127.0.0.1:8080
```

## Projektaufbau

- `src/pages/` enthält die 21 Seitenvorlagen, `src/posts/` die 38 Artikel.
- `src/_data/pages.json` enthält Titel, Beschreibungen, Canonicals und Social-Metadaten.
- `src/_data/postsIndex.json`, `pillars.json` und `editorialLinks.json` pflegen Journal, Leistungsübersichten und redaktionelle Links.
- `src/_data/routes.json` enthält die bevorzugten Adressen. Das Projekt leitet die Standardvarianten automatisch ab. Zusätzliche Aliasregeln stehen in `aliases.json`. Vorschau, Routing-Test und generierte Apache-Regeln verwenden dieselben Daten. Änderungen an Pfaden erfordern auch einen Abgleich von HTML-Verweisen, Metadaten und Sitemap-Kandidat.
- `public/assets/` enthält Gestaltung, Skripte und Bildmaterial. Der Build ergänzt die lokal geladenen Schriften und GSAP/ScrollTrigger aus der Lockdatei. Die Ubuntu-Lizenz und die GSAP-Hinweise liegen im Build.
- `docs/` enthält Auditbericht, Matrizen, den Sitemap-Kandidaten und Testprotokolle.
- `docs/V10-Ausgangsstand/` enthält die Migrationsnotizen und Testprotokolle aus dem beigefügten V10.

## Status vor einer Veröffentlichungsentscheidung

21 bestehende Seiten und 20 Kategoriearchive brauchen einen eigenen Inhalts- bzw. Migrationsentscheid. Die Rechtsseiten und der redaktionelle Ersatzartikel benötigen Freigabe. Das Kontaktformular öffnet einen lokalen E-Mail-Entwurf. Die dokumentierten Regeln sind für Apache 2.4 getestet. Hosting, serverseitige Zustellung und Google-Felddaten bleiben offene Produktionsaufgaben. Siehe Auditbericht und URL-Matrix.
