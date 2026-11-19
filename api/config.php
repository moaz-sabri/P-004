<?php
/**
 * Studio Planner - Backend API Configuration & Helpers
 * PHP 8.4+ / MySQL PDO (Self-Healing, Multi-Environment & Auto-Migrating)
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Set JSON and Security Headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 0');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// CORS is opt-in. Same-origin deployments do not need it at all.
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = array_filter(array_map('trim', explode(',', get_env_var('ALLOWED_ORIGINS', ''))));
if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$requestOrigin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($requestMethod === 'OPTIONS') {
    if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true) && isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// Load Environment Configuration from .env if present
function get_env_var(string $key, string $default = ''): string {
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    static $envFileVars = null;
    if ($envFileVars === null) {
        $envFileVars = [];
        $envPath = __DIR__ . '/../.env';
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $envFileVars[trim($parts[0])] = trim($parts[1], " \t\n\r\0\x0B\"'");
                }
            }
        }
    }
    return $envFileVars[$key] ?? $default;
}

function is_production(): bool {
    return strtolower(get_env_var('APP_ENV', 'development')) === 'production';
}

function assert_production_secrets(): void {
    if (!is_production()) return;
    $weakValues = [
        'studio_secure_pass_2026',
        'studio_root_pass_2026',
        'studio_secret_key_change_in_production_894872918237',
        'replace-with-a-long-random-password',
        'replace-with-a-different-long-random-password',
        'replace-with-at-least-32-random-characters',
    ];
    foreach (['DB_PASSWORD', 'DB_ROOT_PASSWORD', 'AUTH_SECRET'] as $key) {
        $value = get_env_var($key, '');
        if ($value === '' || in_array($value, $weakValues, true) || ($key === 'AUTH_SECRET' && strlen($value) < 32)) {
            json_response(['success' => false, 'error' => 'إعدادات الأسرار غير صالحة لبيئة الإنتاج.'], 500);
        }
    }
}

// Ensure database schema exists
function auto_migrate_schema(PDO $pdo, string $dbName): void {
    static $migrated = false;
    if ($migrated) return;

    $initSqlPath = __DIR__ . '/../docker/mysql/init.sql';
    if (file_exists($initSqlPath)) {
        $sql = file_get_contents($initSqlPath);
        if ($sql) {
            try {
                $pdo->exec("USE `{$dbName}`;");
                $pdo->exec($sql);
                // Backward-compatible migration for databases created before operation IDs.
                try {
                    $pdo->exec('ALTER TABLE change_log ADD COLUMN operation_id VARCHAR(64) NULL');
                } catch (Throwable) {
                    // Column already exists.
                }
                try {
                    $pdo->exec('ALTER TABLE change_log ADD UNIQUE KEY uq_log_operation (user_id, operation_id)');
                } catch (Throwable) {
                    // Index already exists, or the database is still being initialized.
                }
                try {
                    $pdo->exec('ALTER TABLE categories DROP PRIMARY KEY, ADD PRIMARY KEY (id, user_id)');
                } catch (Throwable) {
                    // The composite key already exists, or the table is still being initialized.
                }
            } catch (Throwable $e) {
                // Ignore if already created
            }
        }
    }
    $migrated = true;
}

// Smart Database Connection Factory
function get_db_connection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    assert_production_secrets();
    $rawHost = get_env_var('DB_HOST', 'db');
    $port    = get_env_var('DB_PORT', '3306');
    $dbName  = get_env_var('DB_NAME', 'studio_planner');
    $user    = get_env_var('DB_USER', 'studio_user');
    $pass    = get_env_var('DB_PASSWORD', '');
    $rootPass= get_env_var('DB_ROOT_PASSWORD', '');

    // Smart Host Resolution:
    // If DB_HOST is 'db' but cannot be resolved (meaning we are running on host outside Docker network),
    // fallback to '127.0.0.1' or 'localhost'.
    $host = $rawHost;
    if ($rawHost === 'db') {
        $resolved = @gethostbyname('db');
        if ($resolved === 'db') {
            $host = '127.0.0.1';
        }
    }

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 3,
    ];

    // Connection attempts list:
    // 1. Configured user & password on resolved host
    // 2. Root user with DB_ROOT_PASSWORD on resolved host
    // 3. Root user with empty password (common in local XAMPP/WAMP) on resolved host
    // 4. Try 127.0.0.1 if original was different
    $credentials = [
        ['host' => $host, 'user' => $user, 'pass' => $pass],
        ['host' => $host, 'user' => 'root', 'pass' => $rootPass],
        ['host' => $host, 'user' => 'root', 'pass' => ''],
    ];

    if ($host !== '127.0.0.1' && $host !== 'localhost') {
        $credentials[] = ['host' => '127.0.0.1', 'user' => $user, 'pass' => $pass];
        $credentials[] = ['host' => '127.0.0.1', 'user' => 'root', 'pass' => $rootPass];
        $credentials[] = ['host' => '127.0.0.1', 'user' => 'root', 'pass' => ''];
    }

    $lastError = null;

    foreach ($credentials as $cred) {
        $currHost = $cred['host'];
        $currUser = $cred['user'];
        $currPass = $cred['pass'];

        try {
            // First try connecting directly to the database
            $dsn = "mysql:host={$currHost};port={$port};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $currUser, $currPass, $options);
            auto_migrate_schema($pdo, $dbName);
            return $pdo;
        } catch (PDOException $e) {
            $lastError = $e;

            // If database doesn't exist (error 1049), connect without dbname and create it
            if ($e->getCode() === 1049 || str_contains($e->getMessage(), 'Unknown database')) {
                try {
                    $serverDsn = "mysql:host={$currHost};port={$port};charset=utf8mb4";
                    $serverPdo = new PDO($serverDsn, $currUser, $currPass, $options);
                    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $pdo = new PDO($dsn, $currUser, $currPass, $options);
                    auto_migrate_schema($pdo, $dbName);
                    return $pdo;
                } catch (Throwable) {
                    continue;
                }
            }
        }
    }

    $technicalError = $lastError ? $lastError->getMessage() : 'unknown database connection error';
    error_log('[Studio Planner] Database connection failed: ' . $technicalError);
    $publicError = is_production()
        ? 'تعذر الاتصال بالخدمة حالياً. يرجى المحاولة لاحقاً.'
        : 'فشل الاتصال بقاعدة بيانات MySQL. تأكد من تشغيل خادم MySQL أو حاويات Docker.';
    json_response(['success' => false, 'error' => $publicError], 500);
    exit;
}

// JSON Output Helper
function json_response(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Get Request JSON Body
function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Lightweight per-IP rate limiter for authentication endpoints.
 * It intentionally uses the local temp directory so it works without an
 * additional database table in the first deployment. Replace with Redis or
 * a shared store when running multiple PHP replicas.
 */
function enforce_rate_limit(string $bucket, int $limit = 10, int $windowSeconds = 300): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $bucket . '|' . $ip);
    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'studio-rate-' . $key . '.json';
    $now = time();
    $state = ['started_at' => $now, 'count' => 0];

    if (is_file($file)) {
        $decoded = json_decode((string)@file_get_contents($file), true);
        if (is_array($decoded) && isset($decoded['started_at'], $decoded['count'])) {
            $state = $decoded;
        }
    }

    if (($now - (int)$state['started_at']) >= $windowSeconds) {
        $state = ['started_at' => $now, 'count' => 0];
    }

    $state['count'] = (int)$state['count'] + 1;
    @file_put_contents($file, json_encode($state), LOCK_EX);

    if ($state['count'] > $limit) {
        header('Retry-After: ' . max(1, $windowSeconds - ($now - (int)$state['started_at'])));
        json_response(['success' => false, 'error' => 'تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً.'], 429);
    }
}

function validate_username(string $username): bool {
    return (bool)preg_match('/^[\p{L}\p{N}_.-]{3,50}$/u', $username);
}

// Secure Token Generator (HMAC-SHA256)
function generate_token(array $user): string {
    assert_production_secrets();
    $secret = get_env_var('AUTH_SECRET', 'development-only-secret');
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payloadData = [
        'sub'      => $user['id'],
        'username' => $user['username'],
        'name'     => $user['name'] ?? '',
        'role'     => $user['role'] ?? 'user',
        'iat'      => time(),
        'exp'      => time() + (86400 * 30),
    ];
    $payload = base64_encode(json_encode($payloadData));
    $signature = hash_hmac('sha256', "{$header}.{$payload}", $secret, true);
    $sigBase64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return "{$header}.{$payload}.{$sigBase64}";
}

function set_auth_cookie(string $token): void {
    setcookie('studio_auth', $token, [
        'expires' => time() + (86400 * 30),
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $csrf = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
    setcookie('studio_csrf', $csrf, [
        'expires' => time() + (86400 * 30), 'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => false, 'samesite' => 'Lax',
    ]);
}

function clear_auth_cookie(): void {
    setcookie('studio_auth', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    setcookie('studio_csrf', '', ['expires' => time() - 3600, 'path' => '/', 'samesite' => 'Lax']);
}

// Validate Token and Extract User
function verify_token(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;

    assert_production_secrets();
    $secret = get_env_var('AUTH_SECRET', 'development-only-secret');
    $expectedSig = hash_hmac('sha256', "{$header}.{$payload}", $secret, true);
    $expectedSigBase64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSig));

    if (!hash_equals($expectedSigBase64, $sig)) {
        return null;
    }

    $payloadJson = base64_decode($payload);
    $data = json_decode($payloadJson, true);
    if (!$data || !isset($data['sub']) || ($data['exp'] ?? 0) < time()) {
        return null;
    }
    return $data;
}

// Get Current Authenticated User
function get_auth_user(PDO $pdo): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    $token = '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
    } elseif (!empty($_COOKIE['studio_auth'])) {
        $token = (string)$_COOKIE['studio_auth'];
    }

    if ($token !== '') {
        $tokenData = verify_token($token);
        if ($tokenData && isset($tokenData['sub'])) {
            $stmt = $pdo->prepare('SELECT id, username, name, email, role FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$tokenData['sub']]);
            $user = $stmt->fetch();
            if ($user) return $user;
        }
    }

    return null;
}

// Require Auth Guard
function require_auth(PDO $pdo): array {
    $user = get_auth_user($pdo);
    if (!$user) {
        json_response([
            'success' => false,
            'auth_required' => true,
            'error'   => 'يجب تسجيل الدخول أولاً للعمل أونلاين والمزامنة السحابية. العمل بدون حساب متاح فقط في الوضع المحلي (أوفلاين).'
        ], 401);
    }
    return $user;
}

// Audit Log Helper
function log_change(
    PDO $pdo,
    int $userId,
    string $entityType,
    string $entityId,
    string $action,
    string $source,
    ?array $payload,
    int $clientTimestamp,
    string $status = 'applied',
    ?array $conflictDetails = null,
    ?string $operationId = null
): int {
    $stmt = $pdo->prepare('
        INSERT INTO change_log 
        (user_id, entity_type, entity_id, action, source, payload, client_timestamp, status, conflict_details, operation_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId,
        $entityType,
        $entityId,
        $action,
        $source === 'offline' ? 'offline' : 'online',
        $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
        $clientTimestamp,
        $status,
        $conflictDetails ? json_encode($conflictDetails, JSON_UNESCAPED_UNICODE) : null,
        $operationId
    ]);
    return (int)$pdo->lastInsertId();
}
