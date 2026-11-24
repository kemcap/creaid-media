# IONOS – geschützte Vorschau

Dedicated SFTP account: acc1853677531. Owner confirmed assigned directory /creaid-v11 on 2026-11-24. First read-only connection test passed (run 45452369419). The first upload requires an empty login directory; future uploads require the matching deployment marker. Host keys are pinned to the same published IONOS fingerprints used by the successful preflight. No deletion of unrelated remote files, no domain switch.

Run Actions → IONOS - Website hochladen (Vorschau) → Run workflow (main). Each run builds from source, verifies structure and routing, generates Apache rules from the same canonical route map, and uploads only static pages/assets. Source files, repository secrets and internal documentation are not uploaded. The initial generated 333 RewriteCond/RewriteRule mappings were compared with the previously committed .htaccess before creation. HTML noindex is enforced and X-Robots-Tag added when mod_headers is available. Noindex is not access control.

Automatic deployments on main content changes remain disabled until repository variable IONOS_AUTO_DEPLOY is explicitly set to true. First verify the staging domain and its routing. For production, separately approve legal pages, contact transport, indexation and hosting. Do not remove preview protection or switch the main domain in this workflow. Existing target files are replaced atomically per file; the whole website is not switched atomically. If the server does not support atomic overwrite, subsequent updates fail safely. Stale files are not deleted automatically.

The GitHub Actions workflow must actually succeed before an upload is claimed. The public preview still requires an IONOS domain/subdomain mapped to /creaid-v11 and a live HTTP check.
