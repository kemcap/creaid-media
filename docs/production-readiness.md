# CreAid-Media – Performance und Launch-Vorbereitung

Ausgangsstand: 2bae30bd95265e9c4b6438bb9fd1845d496fd221 (bestandene Browser-Matrix: 402 Renderings, keine gemeldeten Fehler oder relevanten visuellen Abweichungen).

## Performance-Audit
- `npm run test:performance` misst zehn kanonische Seiten in Chromium mit leerem Cache, zwei Wiederholungen je Profil, normaler Bewegung, mobilem Profil (4x CPU, 1,6 Mbit/s, 150 ms) und Desktop-Profil (10 Mbit/s, 40 ms).
- Berichtet werden LCP, CLS (Session Window), TTFB, Ladezeit, Requests, übertragene Bytes, größte Ressourcen und ein Long-Task-Blocking-Indikator. Kein realer INP, kein Lighthouse-Score, keine Felddaten. Zwei Wiederholungen sind ein Screening, keine statistisch robuste Langzeitmessung.
- Ergebnis in qa-results/performance.json, zusammengefasst im CI-Log. Unveränderte Referenz für spätere Optimierungen: obiger Merge. Nur nach Messdaten und Regressionstest optimieren; keine Designänderungen ohne Begründung.
- Quellcode-Fund: audit-navigation.js kehrt bei #cm-global-header sofort zurück, wird aber weiterhin global angefordert. Für späteren gezielten Patch vormerken. service-crosshair.js arbeitet nur bei main > .page-top oder main > .sp-hero; selektive Einbindung ebenfalls prüfen. Keine pauschale CSS-/JS-Zusammenlegung. Blog-Leitartikel und Hero-Medien bezüglich Ladeprioritäten prüfen; nicht alle Bilder pauschal lazy laden. Die bestehende Oberfläche bleibt unverändert.

## Launch-Vorbereitung
`npm run prepare:launch` erstellt unter qa-results/launch-candidate einen Routing-Manifest- und Sitemap-Kandidaten aus den kanonischen URLs und Aliasregeln. Diese Dateien bleiben außerhalb dist. Keine Veröffentlichung, kein Wechsel von noindex, kein DNS-/Hosting-Eingriff. Sitemap-Kandidat schließt Impressum, Datenschutz und Cookie-Einstellungen als redaktionellen Vorschlag aus; vor Freigabe entscheiden.

| Punkt | Status / Voraussetzung |
|---|---|
| Statischer Build, Routing, Browser | Abgenommen am Ausgangsstand; Tests bei Änderungen wiederholen |
| Hosting | Zielhost, DocumentRoot, Apache/Nginx bzw. statischer Host, PHP-/SMTP-Verfügbarkeit bestätigen |
| Server-Routing | 98 kanonische Routen auf flat HTML abbilden; 236 direkte 301 samt Query-String; keine Redirect-Ketten |
| TLS und Domain | DNS, Zertifikat, HTTPS und www/non-www konsistent prüfen; keine Änderung ohne Freigabe |
| Caching / Kompression | Brotli/Gzip für HTML/CSS/JS/SVG; kurze HTML-Revalidierung; langlebige Cache-Regeln nur bei versionierten Asset-URLs |
| Kontakt | Derzeit mailto-Entwurf; produktiven Versand, Empfänger, Spam-Schutz, Rate Limit, Datenschutz, Erfolg-/Fehlerzustand getrennt abnehmen |
| Rechtliches | Offizielle Firma/Rechtsform, Inhaber, Anschrift, Registrierung, Telefonnummer und Datenschutzverarbeitung bestätigen; Entwürfe sind kein Rechtsgutachten |
| Indexierung | HTML robots und HTTP X-Robots-Tag erst nach expliziter Produktionsfreigabe ändern; Sitemap veröffentlichen, Search Console, Canonicals, 301 und echte URL kontrollieren |
| Rollback | Bestehenden WordPress-Stand, DNS, Hosting-Konfiguration und Daten sichern; Rückkehrpfad vor Umstellung testen |

Weder Vorschau-Server noch ein erfolgreicher CI-Job belegen die Produktionskonfiguration. Kein automatischer Deployment-Schritt.

## Gezielte Optimierung 01 – Mauslicht
Die frühere Startseiten-Implementierung rief requestAnimationFrame dauerhaft auf, auch bei stillstehender Maus und vor der ersten Mausbewegung. Der neue Code plant Frames nur nach Zeigerbewegungen ein, hält dieselbe Interpolationsrate (.12), beendet die Schleife nach Konvergenz auf 0,1 px und setzt den Effekt bei geänderten Eingabe-/Bewegungspräferenzen oder ausgeblendetem Dokument zurück. Touch löst das Mauslicht nicht aus. Der deterministische Regressionstest führt den tatsächlichen Block aus und prüft Idle, Zusammenfassen der Eingaben, Konvergenz und Reduced Motion. Die reale Browserprüfung vergleicht jetzt gegen den abgenommenen Merge 2bae30bd. Cold-cache-Vergleich: 80 Messungen (40 je Stand). Die tatsächliche CPU- und Ladezeitverbesserung muss anhand der Messdaten beurteilt werden.
