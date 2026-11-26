<?php
declare(strict_types=1);
namespace CreAid\Contact;

function hubSpotContactProperties(array $data): array {
    $names = preg_split('/[\p{Z}\s]+/u', $data['name'], 2);
    $properties = ['email' => $data['email'], 'firstname' => $names[0]];
    foreach (['lastname' => $names[1] ?? '', 'company' => $data['company'], 'phone' => $data['phone']] as $key => $value) {
        if ($value !== '') $properties[$key] = $value;
    }
    return $properties;
}

function postHubSpotContact(string $token, array $properties): int {
    $request = curl_init('https://api.hubapi.com/crm/v3/objects/contacts');
    try {
        curl_setopt_array($request, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$token, 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['properties' => $properties], JSON_THROW_ON_ERROR),
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_TIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_WRITEFUNCTION => static fn($handle, string $chunk): int => strlen($chunk),
        ]);
        return curl_exec($request) === false ? 0 : (int) curl_getinfo($request, CURLINFO_RESPONSE_CODE);
    } finally {
        curl_close($request);
    }
}

function recordHubSpotContact(array $data, array $config, callable $post): string {
    if (($config['hubspot_enabled'] ?? false) !== true) return 'disabled';
    $token = $config['hubspot_token'] ?? '';
    if (($config['turnstile_required'] ?? false) !== true ||
        ($config['turnstile_hostname'] ?? '') !== 'vorschau.creaid-media.de' ||
        ($config['allowed_origins'] ?? []) !== ['https://vorschau.creaid-media.de'] ||
        !is_string($token) || !preg_match('/^[A-Za-z0-9._-]+$/D', $token)) {
        return 'configuration_error';
    }
    try {
        $status = $post($token, hubSpotContactProperties($data));
    } catch (\Throwable) {
        return 'unavailable';
    }
    return match ($status) {
        201 => 'created',
        409 => 'existing',
        400, 422 => 'invalid_properties',
        401, 403 => 'authorization_error',
        429 => 'rate_limited',
        default => 'unavailable',
    };
}
