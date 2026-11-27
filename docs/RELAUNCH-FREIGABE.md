# CreAid-Media · Produktionsfreigabe

## Isolierter Build zur technischen Endabnahme

Nach `npm ci` erzeugt `node scripts/prepare-production-review.mjs ../creaid-release-review` die prüfbare Ausgabe in einem neuen Verzeichnis. `site/` enthält den vorgesehenen Seitenumfang und die passenden Apache-Weiterleitungen. Entwurfsartikel, die Beispiel-Projektstudie und die Vorschau-Demos sind aus der Ausgabe ausgeschlossen. Die Sitemap liegt neben `site/` und der gesamte Build bleibt durch Robots-Meta und Header vor Indexierung geschützt. Die Veröffentlichung benötigt einen eigenen, genehmigten Schritt.

## Backup und Wiederherstellung

1. Den aktuellen IONOS-Webroot und die zugehörige WordPress-Datenbank identifizieren. Die Domain-Zuordnung und DNS-/HTTPS-Konfiguration dokumentieren. Backup-Ziel und Wiederherstellungsberechtigung festhalten.
2. SQL-Export und vollständige Kopie des WordPress-Webroots einschließlich Medien, Plugins, Themes, `.htaccess` und privater Konfiguration erstellen. Backup außerhalb des Webroots geschützt speichern. Zum Datensatz gehören Zeitstempel, Dateigröße, Prüfsummen und Datenbankbezug.
3. Beides in einem separaten, vor Indexierung und Zugriff geschützten Testziel wiederherstellen. Startseite, Anmeldung, Medien, Legacy-URLs und Datenbankzugriff abnehmen. Das vorhandene statische CreAid-Archiv dient als Medien- und URL-Referenz.
4. Den Eleventy-Build in einem separaten Zielverzeichnis vorbereiten. Alten WordPress-Webroot, Datenbank und Domain-Mapping bis zum Ende des Rollback-Fensters erhalten. Die bisherige Sitemap, Weiterleitungen, Kontaktfunktion und HTTP-Status vor dem Wechsel erfassen.
5. Bei externer Nichterreichbarkeit, defekten geschäftskritischen Routen, nicht bestätigter Kontaktzustellung oder falschem Indexierungsschutz die Hauptdomain auf den zuvor verifizierten WordPress-Webroot zurückschalten. Danach Startseite, Sitemap, mehrere Leistungs- und Journal-URLs und die Kontaktfunktion erneut prüfen.

Ein verifizierter Backup-Satz, freigegebene Domain- und Formularparameter sowie die fachliche und rechtliche Endabnahme sind vor dem Wechsel zu protokollieren.

## Rechtliche Punkte zur Bestätigung

- Impressum, Datenschutz und Kontakt verwenden den gemeinsamen Unternehmensdatensatz. Abgleichen, welche Register-, Aufsichts-, Steuer- und redaktionellen Angaben für das türkische Einzelunternehmen und seine Angebote in Deutschland erforderlich sind. [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
- Für IONOS, SMTP, Cloudflare Turnstile und gegebenenfalls HubSpot tatsächliche Empfänger, Aufbewahrung, Verträge zur Auftragsverarbeitung und etwaige Drittlandtransfers bestätigen. Die Verarbeitung für Projektanfragen und die getrennte Verarbeitung für Marketing jeweils nach ihrem Zweck prüfen. [DSGVO, insbesondere Art. 6, 13, 28 und 44 ff.](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [HubSpot-Datenschutzzusatz](https://legal.hubspot.com/dpa)
- Den final eingesetzten Consent-Stand mit dem Datenschutztext und der technischen Bestandsaufnahme abgleichen. In der Vorschau Einwilligung, Ablehnung und Widerruf einschließlich der Netzwerkzugriffe prüfen. Erst danach die vorgesehene Analytics-Konfiguration für die Hauptdomain separat abnehmen. [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- Vor dem Produktionsstart Nutzungsrechte und Benennung der 16 veröffentlichten Arbeitsproben je Motiv bestätigen.

## HubSpot-Kontaktanlage in der Vorschau

Der vorbereitete PHP-Adapter arbeitet nach erfolgreicher Turnstile-Prüfung und SMTP-Annahme. Er sendet E-Mail, Namen und die optional ausgefüllten Felder Firma und Telefon. Der Name wird am ersten Leerraum in Vor- und Restnamen geteilt. Nachricht und Leistung verbleiben im Geschäftspostfach. HubSpot überprüft die Eindeutigkeit anhand der E-Mail. Vorhandene Kontakte werden bei einem Konflikt nicht überschrieben. Bei Fehlern bleibt die bereits angenommene E-Mail gültig. Das Serverprotokoll enthält nur den technischen Fehlerstatus.

Zur Aktivierung gehören der API-Zugang für das vorgesehene HubSpot-Konto, eine geschützte Serverkonfiguration mit Schreibrecht für Kontakte, der aktualisierte Datenschutzhinweis sowie ein freigegebener Vorschau-End-to-End-Test. Die Konfiguration ist standardmäßig deaktiviert. Der vorhandene SMTP-Zustellweg bleibt der maßgebliche Rückmeldekanal.
