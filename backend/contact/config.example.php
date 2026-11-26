<?php
declare(strict_types=1);
// Copy ONLY on the hosting server, outside all public document roots, as config.php.
return [
    'enabled' => false,
    'allowed_origins' => ['https://vorschau.creaid-media.de'],
    'smtp_host' => 'smtp.ionos.de',
    'smtp_port' => 465,
    'smtp_username' => 'formular@creaid-media.de',
    'smtp_password' => '',
    'recipient' => 'info@creaid-media.de',
    'rate_secret' => '', // locally generate 32 random bytes as hex; never commit
];
