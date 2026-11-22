# UI/UX nach der Eleventy-Migration

## Empfohlene Reihenfolge

1. **Baseline sichern:** V9 unverändert archivieren; V10 als neues Arbeitsprojekt.
2. **Migration verifizieren:** `npm install`/`npm run build` auf einem Rechner mit npm-Zugriff ausführen; gerenderte Seiten vergleichen.
3. **UI/UX gezielt verbessern:** Navigationshierarchie und Mobile-Menüs, Sticky-Verhalten, visuelle Kontraste und Überschriften, Lesbarkeit in 320–390px, Scroll- und 90/10-Haltephasen.
4. **Design konsolidieren:** vier historisch gewachsene Layoutfamilien behutsam auf zentrale Komponenten/Design-Tokens zurückführen; Ubuntu bleibt Hauptfont, Georgia Akzent.
5. **Content-/SEO-Architektur:** vier Pillar-Hauptbereiche, eindeutige Suchintentionen, 38 Blogartikel in Cluster einordnen, Ankertexte und Linkmatrix, Duplicate-Intent prüfen.
6. **Vorbereitung Live:** Datenschutzhinweise juristisch prüfen, Formular-Backend installieren, OG-Bilder/SEO, Canonical + 301-Migration, Cookie-Dienste, Sitemaps/Robots und Performance kontrollieren.

### Bekannte Punkte aus V9

- Einige Agentur-Footer liefen mobil seitlich über die Anzeige: in V10 behoben.
- Schrift wird über Google Fonts nachgeladen, Offline-Cache und Datenschutz noch nicht fertig.
- Ein Beitrag ist eine redaktionelle Neufassung, kein übernommener Originaltext.
- Alle Seiten enthalten noch `noindex` und manche noch prototypische Titel.
- Mehrere Kategorien im V9-Journal sind redaktionell unpassend (z. B. Onlineshop-Themen teils unter Branding). Nicht stillschweigend in dieser Architekturphase geändert.
- Rechtliche Seiten und Consent-Verwaltung sind Entwürfe.

**Der Architekturwechsel soll nicht gleichzeitig mit einem vollständigen Redesign erfolgen**: sonst lassen sich Darstellungsfehler und Templating-Fehler später schlechter auseinanderhalten.
