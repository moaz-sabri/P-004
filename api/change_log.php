<?php
/**
 * Studio Planner - Change Log API
 * Endpoint: /api/change_log
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/authorization.php';

require_request_method('GET');

$pdo = get_db_connection();
$user = require_auth($pdo);
require_permission($user, 'audit.view');
$userId = (int)$user['id'];

$source     = $_GET['source'] ?? '';
$entityType = $_GET['entity_type'] ?? '';
$status     = $_GET['status'] ?? '';
$limit      = min(100, max(1, (int)($_GET['limit'] ?? 50)));
$offset     = max(0, (int)($_GET['offset'] ?? 0));

$sql = 'SELECT id, entity_type, entity_id, action, source, payload, client_timestamp, server_timestamp, status, conflict_details 
        FROM change_log 
        WHERE user_id = ?';
$params = [$userId];

if ($source && in_array($source, ['online', 'offline'], true)) {
    $sql .= ' AND source = ?';
    $params[] = $source;
}

if ($entityType) {
    $sql .= ' AND entity_type = ?';
    $params[] = $entityType;
}

if ($status && in_array($status, ['applied', 'conflict', 'resolved'], true)) {
    $sql .= ' AND status = ?';
    $params[] = $status;
}

$sql .= ' ORDER BY id DESC LIMIT ? OFFSET ?';
$params[] = $limit;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$logs = $stmt->fetchAll();

foreach ($logs as &$log) {
    $log['payload'] = $log['payload'] ? json_decode($log['payload'], true) : null;
    $log['conflict_details'] = $log['conflict_details'] ? json_decode($log['conflict_details'], true) : null;
}

// Get counts
$stmtCount = $pdo->prepare('
    SELECT 
        COUNT(*) AS total_count,
        SUM(CASE WHEN source = "online" THEN 1 ELSE 0 END) AS online_count,
        SUM(CASE WHEN source = "offline" THEN 1 ELSE 0 END) AS offline_count,
        SUM(CASE WHEN status = "conflict" THEN 1 ELSE 0 END) AS conflict_count
    FROM change_log 
    WHERE user_id = ?
');
$stmtCount->execute([$userId]);
$metrics = $stmtCount->fetch();

json_response([
    'success' => true,
    'logs'    => $logs,
    'metrics' => [
        'total'    => (int)($metrics['total_count'] ?? 0),
        'online'   => (int)($metrics['online_count'] ?? 0),
        'offline'  => (int)($metrics['offline_count'] ?? 0),
        'conflict' => (int)($metrics['conflict_count'] ?? 0),
    ]
]);
