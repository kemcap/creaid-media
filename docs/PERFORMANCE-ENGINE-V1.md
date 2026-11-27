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

## Vergleich des IONOS-Vorschauprofils am 27.11.2026

Ausgangsstand `9025597`. Das Vorschau-Paket umfasst 122 Routen und 189 versionierte Ressourcen. Im isolierten Apache-Mobiltest mit drei Lighthouse-Kaltläufen je Profil wurden folgende Medianwerte gemessen.

| Startseite | Standardvorschau | Cache-Kandidat |
| --- | ---: | ---: |
| Lighthouse Performance | 96 | 97 |
| LCP | 2,41 s | 2,26 s |
| CLS | 0,004 | 0,004 |
| TBT | 0 ms | 0 ms |
| TTFB, lokaler Apache | 2,48 ms | 2,07 ms |
| Übertragung | 281 kB | 257 kB |

Beim erneuten Navigieren im selben Chromium-Kontext über Startseite, Webdesign, Journal und Referenzen sank die Summe der übertragenen Daten von rund 1.788 kB auf 48 kB. Die vier Vergleichsbilder bei 390 × 844 px waren pixelgleich. Apache-Integrationstests für gzip/Brotli, ETag/304, `no-store` für HTML und Fehler sowie private, immutable Cache-Header für versionierte Vorschau-Assets bestanden.

Die Werte stammen aus dem Labor. PageSpeed Online antwortete für die IONOS-Vorschau mit HTTP 429. Reale INP- und andere Felddaten liegen für diesen Vergleich nicht vor. Für die Live-Aktivierung ist im bestehenden IONOS-Vorschauworkflow der Eingabewert `enabled` vorgesehen. Danach HTML-Noindex, `no-store` und die versionierten Assets auf IONOS prüfen. Der Workflow-Eingabewert `disabled` setzt das vorherige Vorschau-Cacheprofil zurück.
