# CreAid-Media · Produktionsfreigabe

## Rechtliche Punkte zur Bestätigung

- Impressum, Datenschutz und Kontakt verwenden den gemeinsamen Unternehmensdatensatz. Abgleichen, welche Register-, Aufsichts-, Steuer- und redaktionellen Angaben für das türkische Einzelunternehmen und seine Angebote in Deutschland erforderlich sind. [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
- Für IONOS, SMTP, Cloudflare Turnstile und gegebenenfalls HubSpot tatsächliche Empfänger, Aufbewahrung, Verträge zur Auftragsverarbeitung und etwaige Drittlandtransfers bestätigen. Die Verarbeitung für Projektanfragen und die getrennte Verarbeitung für Marketing jeweils nach ihrem Zweck prüfen. [DSGVO, insbesondere Art. 6, 13, 28 und 44 ff.](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [HubSpot-Datenschutzzusatz](https://legal.hubspot.com/dpa)
- Den final eingesetzten Consent-Stand mit dem Datenschutztext und der technischen Bestandsaufnahme abgleichen. In der Vorschau Einwilligung, Ablehnung und Widerruf einschließlich der Netzwerkzugriffe prüfen. Erst danach die vorgesehene Analytics-Konfiguration für die Hauptdomain separat abnehmen. [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- Vor dem Produktionsstart Nutzungsrechte und Benennung der 16 veröffentlichten Arbeitsproben je Motiv bestätigen.

## HubSpot-Kontaktanlage in der Vorschau

Der vorbereitete PHP-Adapter arbeitet nach erfolgreicher Turnstile-Prüfung und SMTP-Annahme. Er sendet E-Mail, Namen und die optional ausgefüllten Felder Firma und Telefon. Der Name wird am ersten Leerraum in Vor- und Restnamen geteilt. Nachricht und Leistung verbleiben im Geschäftspostfach. HubSpot überprüft die Eindeutigkeit anhand der E-Mail. Vorhandene Kontakte werden bei einem Konflikt nicht überschrieben. Bei Fehlern bleibt die bereits angenommene E-Mail gültig. Das Serverprotokoll enthält nur den technischen Fehlerstatus.

Zur Aktivierung gehören der API-Zugang für das vorgesehene HubSpot-Konto, eine geschützte Serverkonfiguration mit Schreibrecht für Kontakte, der aktualisierte Datenschutzhinweis sowie ein freigegebener Vorschau-End-to-End-Test. Die Konfiguration ist standardmäßig deaktiviert. Der vorhandene SMTP-Zustellweg bleibt der maßgebliche Rückmeldekanal.
