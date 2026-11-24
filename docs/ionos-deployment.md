# IONOS deployment preflight

The first manual workflow only verifies server identity against the published IONOS Webhosting SHA256 host-key fingerprints and tests read-only SFTP authentication and directory listing. It requires repository secrets SFTP_HOST, SFTP_PORT, SFTP_USERNAME and SFTP_PASSWORD. No password is printed. No remote mutation, upload, domain switch or indexation change is performed.

Run Actions > IONOS - SFTP-Verbindung prüfen > Run workflow > main. A green run confirms connectivity, not permission to overwrite the current site. Confirm the dedicated account's assigned directory in IONOS before the first upload. The intended separate staging directory is creaid-v11; do not assume the SFTP login root is the webspace root. If server host keys change, independently verify the official IONOS fingerprint list before updating the pinned values.

Next: configure a deployment target restricted to the dedicated directory, use only the tested static dist files, keep the preview noindex and do not delete remote files. Confirm hosting routing and test via a staging domain before switching the production domain.
