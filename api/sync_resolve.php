<?php
/**
 * Studio Planner - Conflict Resolution Handler
 * Endpoint: /api/sync/resolve
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/authorization.php';

$pdo = get_db_connection();
$user = require_auth($pdo);
require_permission($user, 'sync.use');
$userId = (int)$user['id'];

require_request_method('POST');
require_json_request();
require_csrf();

$input = get_json_input();
$conflictId = (int)($input['conflict_id'] ?? 0);
$resolution = $input['resolution'] ?? ''; // 'keep_local', 'keep_server', 'keep_both'
$entityType = $input['entity_type'] ?? '';
$entityId   = (string)($input['entity_id'] ?? '');
$payload    = is_array($input['payload'] ?? null) ? $input['payload'] : [];

if (!$conflictId || !in_array($resolution, ['keep_local', 'keep_server', 'keep_both'], true)) {
    json_response(['success' => false, 'error' => 'بيانات حسم التعارض غير صالحة.'], 400);
}

$nowMs = (int)(microtime(true) * 1000);

// Verify conflict belongs to user
$stmtConf = $pdo->prepare('SELECT * FROM change_log WHERE id = ? AND user_id = ? AND status = "conflict" LIMIT 1');
$stmtConf->execute([$conflictId, $userId]);
$conflictRecord = $stmtConf->fetch();

if (!$conflictRecord) {
    json_response(['success' => false, 'error' => 'سجل التعارض غير موجود أو تم حسمه مسبقاً.'], 404);
}

// 1. Keep Local: Force apply local payload
if ($resolution === 'keep_local') {
    if ($entityType === 'item') {
        $stmt = $pdo->prepare('
            INSERT INTO items (id, user_id, title, kind, date, time, pid, cid, who, phone, done, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                title = VALUES(title),
                kind = VALUES(kind),
                date = VALUES(date),
                time = VALUES(time),
                pid = VALUES(pid),
                cid = VALUES(cid),
                who = VALUES(who),
                phone = VALUES(phone),
                done = VALUES(done),
                is_deleted = 0
        ');
        $stmt->execute([
            $entityId,
            $userId,
            $payload['title'] ?? '',
            $payload['kind'] ?? 'task',
            $payload['date'] ?? '',
            $payload['time'] ?? '',
            $payload['pid'] ?? '',
            $payload['cid'] ?? '',
            $payload['who'] ?? '',
            $payload['phone'] ?? '',
            !empty($payload['done']) ? 1 : 0
        ]);
    } elseif ($entityType === 'project') {
        $stmt = $pdo->prepare('
            INSERT INTO projects (id, user_id, name, client, cid, phase, due, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                client = VALUES(client),
                cid = VALUES(cid),
                phase = VALUES(phase),
                due = VALUES(due),
                is_deleted = 0
        ');
        $stmt->execute([
            $entityId,
            $userId,
            $payload['name'] ?? '',
            $payload['client'] ?? '',
            $payload['cid'] ?? '',
            (int)($payload['phase'] ?? 0),
            $payload['due'] ?? ''
        ]);
    } elseif ($entityType === 'client') {
        $notesJson = isset($payload['notes']) ? json_encode($payload['notes'], JSON_UNESCAPED_UNICODE) : null;
        $stmt = $pdo->prepare('
            INSERT INTO clients (id, user_id, name, phone, email, company, notes, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                phone = VALUES(phone),
                email = VALUES(email),
                company = VALUES(company),
                notes = VALUES(notes),
                is_deleted = 0
        ');
        $stmt->execute([
            $entityId,
            $userId,
            $payload['name'] ?? '',
            $payload['phone'] ?? '',
            $payload['email'] ?? '',
            $payload['company'] ?? '',
            $notesJson
        ]);
    }
}
// 2. Keep Both: Create copy with new ID
elseif ($resolution === 'keep_both') {
    $newId = substr(bin2hex(random_bytes(8)), 0, 8);
    if ($entityType === 'item') {
        $stmt = $pdo->prepare('
            INSERT INTO items (id, user_id, title, kind, date, time, pid, cid, who, phone, done, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ');
        $stmt->execute([
            $newId,
            $userId,
            ($payload['title'] ?? '') . ' (نسخة مستعادة)',
            $payload['kind'] ?? 'task',
            $payload['date'] ?? '',
            $payload['time'] ?? '',
            $payload['pid'] ?? '',
            $payload['cid'] ?? '',
            $payload['who'] ?? '',
            $payload['phone'] ?? '',
            !empty($payload['done']) ? 1 : 0
        ]);
    } elseif ($entityType === 'project') {
        $stmt = $pdo->prepare('
            INSERT INTO projects (id, user_id, name, client, cid, phase, due, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ');
        $stmt->execute([
            $newId,
            $userId,
            ($payload['name'] ?? '') . ' (نسخة مستعادة)',
            $payload['client'] ?? '',
            $payload['cid'] ?? '',
            (int)($payload['phase'] ?? 0),
            $payload['due'] ?? ''
        ]);
    }
}
// 3. Keep Server: Nothing to re-insert, the server version remains in effect.

// Mark conflict as resolved in change_log
$stmtResolve = $pdo->prepare('
    UPDATE change_log 
    SET status = "resolved",
        conflict_details = JSON_SET(COALESCE(conflict_details, "{}"), "$.resolved_at", ?, "$.resolution", ?)
    WHERE id = ? AND user_id = ?
');
$stmtResolve->execute([$nowMs, $resolution, $conflictId, $userId]);

json_response([
    'success' => true,
    'message' => 'تم حسم التعارض بنجاح.',
    'resolution' => $resolution,
    'conflict_id' => $conflictId
]);
