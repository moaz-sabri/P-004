<?php
/**
 * Studio Planner - Central API Router
 */

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$uri = preg_replace('#^/api/#', '', $uri);
$uri = trim($uri, '/');

// Route matching
if ($uri === 'sync' || $uri === 'sync.php') {
    require __DIR__ . '/sync.php';
    exit;
}

if ($uri === 'sync/resolve' || $uri === 'sync_resolve.php') {
    require __DIR__ . '/sync_resolve.php';
    exit;
}

if (str_starts_with($uri, 'auth')) {
    $action = preg_replace('#^auth/?#', '', $uri);
    $_GET['action'] = $action ?: ($_GET['action'] ?? '');
    require __DIR__ . '/auth.php';
    exit;
}

if ($uri === 'changelog' || $uri === 'change_log' || $uri === 'change_log.php') {
    require __DIR__ . '/change_log.php';
    exit;
}

// Health check endpoint
if ($uri === 'health' || $uri === '') {
    require_once __DIR__ . '/config.php';
    try {
        $pdo = get_db_connection();
        json_response([
            'status' => 'healthy',
            'app'    => 'Studio Planner API',
            'php'    => PHP_VERSION,
            'time'   => date('c')
        ]);
    } catch (Exception $e) {
        error_log('[Studio Planner] Health check failed: ' . $e->getMessage());
        json_response([
            'status' => 'degraded',
            'error'  => is_production() ? 'الخدمة غير متاحة حالياً.' : 'تعذر الاتصال بقاعدة البيانات.'
        ], 500);
    }
    exit;
}

require_once __DIR__ . '/config.php';
json_response(['success' => false, 'error' => 'Endpoint not found'], 404);
