<?php
declare(strict_types=1);
require __DIR__.'/hubspot.php';
use function CreAid\Contact\recordHubSpotContact;

$config = require __DIR__.'/config.example.php';
// CRM is intentionally preview-only until separately approved for production.
$config['allowed_origins'] = ['https://vorschau.creaid-media.de'];
$config['hubspot_token'] = 'test-private-app-token';
$data = [
    'name' => 'Deniz Yılmaz', 'email' => 'deniz@example.invalid',
    'company' => 'Beispiel', 'phone' => '',
    'service' => 'Webdesign & Entwicklung', 'message' => 'Nur per E-Mail',
];
$payloads = [];
$post = static function(string $token, array $properties) use (&$payloads): int {
    if ($token !== 'test-private-app-token') throw new RuntimeException('Unexpected test token');
    $payloads[] = $properties;
    return count($payloads) === 1 ? 201 : 409;
};
function same(mixed $actual, mixed $expected): void {
    if ($actual !== $expected) throw new RuntimeException('Unexpected HubSpot behavior');
}

same(recordHubSpotContact($data, $config, $post), 'disabled');
$config['hubspot_enabled'] = true;
same(recordHubSpotContact($data, $config, $post), 'configuration_error');
$config['turnstile_required'] = true;
same(recordHubSpotContact($data, array_replace($config, ['hubspot_token' => "bad\r\nvalue"]), $post), 'configuration_error');
same(recordHubSpotContact($data, array_replace($config, ['allowed_origins' => ['https://creaid-media.de']]), $post), 'configuration_error');
same(recordHubSpotContact($data, array_replace($config, ['allowed_origins' => ['https://vorschau.creaid-media.de', 'https://creaid-media.de']]), $post), 'configuration_error');
same($payloads, []);
same(recordHubSpotContact($data, $config, $post), 'created');
same(recordHubSpotContact($data, $config, $post), 'existing');
$expected = ['email' => $data['email'], 'firstname' => 'Deniz', 'lastname' => 'Yılmaz', 'company' => 'Beispiel'];
same($payloads, [$expected, $expected]);
foreach ([400 => 'invalid_properties', 401 => 'authorization_error', 403 => 'authorization_error', 429 => 'rate_limited', 503 => 'unavailable', 0 => 'unavailable'] as $status => $result) {
    same(recordHubSpotContact($data, $config, static fn() => $status), $result);
}
same(recordHubSpotContact($data, $config, static function() {throw new RuntimeException('Network failure');}), 'unavailable');
echo "PASS: disabled mode, map, create, duplicate, HTTP failures and configuration guards without contacting the CRM.\n";
