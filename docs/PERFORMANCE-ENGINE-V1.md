# CreAid Performance Engine V1.0 – isolierter Prototyp
## Ausführen
1. npm ci
2. npm run build
3. node scripts/performance/test-prepare-candidate.mjs
4. node scripts/performance/prepare-candidate.mjs dist performance-candidate

Der neue Ausgabeordner enthält eine Kopie der Website, SHA-256-versionierte Ressourcen, eine JSON-Datei mit Größen und Gzip/Brotli-Schätzungen sowie separate Apache-Cache-Regelvorschläge. Der Quellbuild und das IONOS-Deployment bleiben unverändert. Die Original-Assets werden für relative und dynamische Abhängigkeiten beibehalten. Nur statische, direkt referenzierte Root-Asset-URLs in ausgewählten HTML-Tags werden ersetzt. Die Vorschau bleibt no-store; kein Cache-Profil wird automatisch auf den Webserver angewendet.

## Abnahme und nächste technische Schritte
- Erst nach erfolgreichem Quality Gate auf einem isolierten Testziel einsetzen.
- IONOS-Header, Gzip/Brotli, Cache-Verhalten, ETags und 304-Antworten real prüfen.
- CSS-/JS-Abhängigkeiten, Font-Preloads, seitenspezifisches CSS, Minifizierung und responsive Bilder separat optimieren; visuelle Regression vor Rollout.
- Lighthouse-Kalt-/Warmlauf in identischer Konfiguration; CLS und LCP mit dem Work-Audit und PageSpeed vergleichen. Keine Score-Garantie.
- Fingerprinting erst nach letzter Transformation des jeweiligen Deployment-Ziels; GitHub Pages-Pfadumschreibung würde gehashte CSS-/JS-Dateien sonst verändern.
- Produktionsprofil nur für ausdrücklich freigegebene, nicht vertrauliche Produktionsausgabe; Entwürfe, Kontakt-API, rechtliche Prüfung und noindex bleiben separate Release-Gates.
