# CON-01 – Kontaktversand: technischer Freigabeplan
Der bestehende mailto-Weg bleibt bis zur Freigabe funktional und transparent. Kein produktiver Versand, kein CRM-Eintrag, keine Zugangsdaten.

Empfohlener Weg für das bestehende IONOS-Webhosting: nach Prüfung des Tarifs ein gleichursprünglicher HTTPS-Endpunkt (PHP, falls verfügbar) mit serverseitiger Validierung und tatsächlicher Zustellbestätigung. Alternativ freigegebener Formulardienst. HubSpot nur serverseitig mit minimalen Berechtigungen und ausdrücklicher Freigabe, keine Schlüssel im Frontend.

Annahmevertrag: POST, begrenzte Request-Größe, erlaubte Felder name/email/company/phone/service/message; serverseitig Pflichtfelder, Längen, E-Mail und Servicewert validieren; Honeypot und Rate-Limit, Origin-Prüfung, keine sensiblen Daten in Logs. Kein vom Benutzer gesetzter Mail-Header. Erfolg erst nach serverseitiger Annahme. Fehlerzustände mit verständlicher Rückmeldung, Eingaben erhalten, alternative E-Mail und Telefon sichtbar. Doppelsendungen verhindern.

Isolierte Abnahme: lokale Testempfänger bzw. Mail-Catcher, gültige/ungültige Daten, Netzwerkfehler, Timeouts, Spam, Mehrfachklick, mobile Bedienung, Tastatur und Screenreader. Erst nach Bestätigung von Hosting, Zustelladresse, Datenschutz und Integrationsentscheidung implementieren und aktivieren.
