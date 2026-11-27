# CON-01 – Kontaktversand: technischer Freigabeplan

Die IONOS-Vorschau nutzt den gleichursprünglichen PHP-Endpunkt mit Turnstile und SMTP. Der bereits freigegebene Vorschauversand ist in [Lauf 45865265674](https://github.com/kemcap/creaid-media/actions/runs/45865265674) belegt. Zustellung ins Geschäftspostfach und produktiver Versand gehören zur Endabnahme.

Empfohlener Weg für das bestehende IONOS-Webhosting: nach Prüfung des Tarifs ein gleichursprünglicher HTTPS-Endpunkt (PHP, falls verfügbar) mit serverseitiger Validierung und tatsächlicher Zustellbestätigung. Alternativ freigegebener Formulardienst. HubSpot nur serverseitig mit minimalen Berechtigungen und ausdrücklicher Freigabe, keine Schlüssel im Frontend.

Annahmevertrag: POST, begrenzte Request-Größe, erlaubte Felder name/email/company/phone/service/message; serverseitig Pflichtfelder, Längen, E-Mail und Servicewert validieren; Honeypot und Rate-Limit, Origin-Prüfung, keine sensiblen Daten in Logs. Kein vom Benutzer gesetzter Mail-Header. Erfolg erst nach serverseitiger Annahme. Fehlerzustände mit verständlicher Rückmeldung, Eingaben erhalten, alternative E-Mail und Telefon sichtbar. Doppelsendungen verhindern.

Der Versandkandidat reserviert gleichlautende Anfragen mit einem serverseitigen HMAC im privaten Verzeichnis. Solange eine Anfrage läuft, meldet der Server ihren laufenden Status. Nach SMTP-Annahme bestätigt er Wiederholungen für zehn Minuten ohne weiteren Versand, CRM-Aufruf oder Conversion-Ereignis. Nach einem ausdrücklich gemeldeten SMTP-Fehler ist ein erneuter Versuch möglich. Eine verlorene SMTP-Antwort kann ohne Bestätigung des Mailproviders mehrdeutig bleiben. Die Statusdatei enthält HMAC, Zustand und Ablaufzeit. Abgelaufene Einträge werden beim nächsten Schreibvorgang entfernt.

Isolierte Abnahme: lokale Testempfänger bzw. Mail-Catcher, gültige/ungültige Daten, Netzwerkfehler, Timeouts, Spam, Mehrfachklick, mobile Bedienung, Tastatur und Screenreader. Erst nach Bestätigung von Hosting, Zustelladresse, Datenschutz und Integrationsentscheidung implementieren und aktivieren.
