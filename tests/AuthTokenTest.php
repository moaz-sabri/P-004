<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/config.php';

function assert_token(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$user = [
    'id' => 42,
    'username' => 'tester',
    'name' => 'Test User',
    'role' => 'user',
];

$token = generate_token($user);
assert_token(verify_token($token)['sub'] === 42, 'valid token is accepted');

$parts = explode('.', $token);
$parts[1] = rtrim(strtr(base64_encode(json_encode([
    'sub' => 999,
    'username' => 'attacker',
    'iat' => time(),
    'exp' => time() + 3600,
])), '+/', '-_'), '=');
$tampered = implode('.', $parts);
assert_token(verify_token($tampered) === null, 'tampered token is rejected');

$expiredPayload = rtrim(strtr(base64_encode(json_encode([
    'sub' => 42,
    'username' => 'tester',
    'iat' => time() - 7200,
    'exp' => time() - 3600,
])), '+/', '-_'), '=');
$secret = get_env_var('AUTH_SECRET', 'development-only-secret');
$header = $parts[0];
$signature = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$header}.{$expiredPayload}", $secret, true)), '+/', '-_'), '=');
assert_token(verify_token("{$header}.{$expiredPayload}.{$signature}") === null, 'expired token is rejected');

fwrite(STDOUT, "Auth token tests passed.\n");
