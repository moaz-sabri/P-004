<?php
/**
 * Studio Planner - Offline-First Sync Engine & Conflict Detection
 * Endpoint: /api/sync
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/services/SyncService.php';
require_once __DIR__ . '/authorization.php';

$pdo = get_db_connection();
$user = require_auth($pdo);
require_permission($user, 'sync.use');
$userId = (int)$user['id'];

require_request_method('POST');
require_json_request(5 * 1024 * 1024);
require_csrf();

$input = get_json_input();
$lastSyncTimestamp = (int)($input['last_sync_timestamp'] ?? 0);
$changes = is_array($input['changes'] ?? null) ? $input['changes'] : [];
SyncService::validateBatch($changes);

// Sort client changes by client_timestamp ascending
usort($changes, function ($a, $b) {
    return ($a['client_timestamp'] ?? 0) <=> ($b['client_timestamp'] ?? 0);
});

$appliedCount = 0;
$conflicts = [];
$nowMs = (int)(microtime(true) * 1000);

// Process each incoming change
foreach ($changes as $change) {
    $entityType = $change['entity_type'] ?? '';
    $entityId   = (string)($change['entity_id'] ?? '');
    $action     = $change['action'] ?? '';
    $operationId = (string)($change['operation_id'] ?? '');
    $source     = ($change['source'] ?? '') === 'offline' ? 'offline' : 'online';
    $payload    = is_array($change['payload'] ?? null) ? $change['payload'] : [];
    $clientTs   = (int)($change['client_timestamp'] ?? $nowMs);

    $table = SyncService::tableForEntity($entityType);
    if (!$table || !$entityId || !$action) {
        continue;
    }

    // Idempotency: a retried network request must not apply the same operation twice.
    if ($operationId !== '') {
        $stmtDuplicate = $pdo->prepare('SELECT id FROM change_log WHERE user_id = ? AND operation_id = ? LIMIT 1');
        $stmtDuplicate->execute([$userId, $operationId]);
        if ($stmtDuplicate->fetch()) {
            continue;
        }
    }

    // Special case for settings
    if ($entityType === 'setting') {
        $key = $entityId;
        $val = is_string($payload['value'] ?? null) ? $payload['value'] : json_encode($payload['value'] ?? '');
        $stmt = $pdo->prepare('
            INSERT INTO user_settings (user_id, setting_key, setting_value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ');
        $stmt->execute([$userId, $key, $val]);
        log_change($pdo, $userId, 'setting', $key, 'update', $source, ['value' => $val], $clientTs, 'applied');
        $appliedCount++;
        continue;
    }

    // Check existing entity in database
    $stmtFind = $pdo->prepare("SELECT *, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms FROM `{$table}` WHERE user_id = ? AND id = ? LIMIT 1");
    $stmtFind->execute([$userId, $entityId]);
    $existing = $stmtFind->fetch();

    $isConflict = false;
    $conflictType = '';
    $conflictMsg = '';
    $serverPayload = null;

    // --- CONFLICT & ILLOGICAL CHECKS ---
    if ($action === 'update') {
        if (!$existing || !empty($existing['is_deleted'])) {
            // Illogical: Modified offline, but deleted or not found on server
            $isConflict = true;
            $conflictType = 'update_on_deleted';
            $conflictMsg = 'تم تعديل هذا العنصر أوفلاين بينما تم حذفه من الخادم.';
            $serverPayload = ['is_deleted' => 1];
        } else {
            // Both updated: check timestamps
            $serverTs = (int)$existing['updated_at_ms'];
            if ($serverTs > $lastSyncTimestamp && $serverTs > $clientTs) {
                // Server has a newer update than the client's offline change!
                // Apply LWW: Server update wins automatically, but log as conflict/notice if payloads differ significantly
                $serverPayload = $existing;
            }
        }
    } elseif ($action === 'delete') {
        if ($existing && empty($existing['is_deleted'])) {
            $serverTs = (int)$existing['updated_at_ms'];
            if ($serverTs > $lastSyncTimestamp) {
                // Illogical: Deleted offline, but modified on server concurrently!
                $isConflict = true;
                $conflictType = 'delete_on_modified';
                $conflictMsg = 'تم حذف هذا العنصر أوفلاين ولكن تم إجراء تعديلات جديدة عليه على الخادم.';
                $serverPayload = $existing;
            }
        }
    }

    if ($isConflict) {
        $conflictDetails = [
            'conflict_type'   => $conflictType,
            'message'         => $conflictMsg,
            'client_payload'  => $payload,
            'server_payload'  => $serverPayload,
            'client_timestamp'=> $clientTs,
            'server_timestamp'=> $nowMs
        ];
        $logId = log_change(
            $pdo, $userId, $entityType, $entityId, $action, $source,
            $payload, $clientTs, 'conflict', $conflictDetails, $operationId ?: null
        );

        $conflicts[] = array_merge([
            'conflict_id' => $logId,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'action'      => $action
        ], $conflictDetails);
        continue;
    }

    // --- APPLY CHANGE (LWW & Normal Processing) ---
    if ($entityType === 'project') {
        if ($action === 'create' || $action === 'update') {
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
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('UPDATE projects SET is_deleted = 1 WHERE user_id = ? AND id = ?');
            $stmt->execute([$userId, $entityId]);
        }
    } elseif ($entityType === 'item') {
        if ($action === 'create' || $action === 'update') {
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
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('UPDATE items SET is_deleted = 1 WHERE user_id = ? AND id = ?');
            $stmt->execute([$userId, $entityId]);
        }
    } elseif ($entityType === 'client') {
        if ($action === 'create' || $action === 'update') {
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
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('UPDATE clients SET is_deleted = 1 WHERE user_id = ? AND id = ?');
            $stmt->execute([$userId, $entityId]);
        }
    } elseif ($entityType === 'category') {
        if ($action === 'create' || $action === 'update') {
            $stmt = $pdo->prepare('
                INSERT INTO categories (id, user_id, label, color, colorClass, icon, is_deleted)
                VALUES (?, ?, ?, ?, ?, ?, 0)
                ON DUPLICATE KEY UPDATE 
                    label = VALUES(label),
                    color = VALUES(color),
                    colorClass = VALUES(colorClass),
                    icon = VALUES(icon),
                    is_deleted = 0
            ');
            $stmt->execute([
                $entityId,
                $userId,
                $payload['label'] ?? '',
                $payload['color'] ?? '',
                $payload['colorClass'] ?? '',
                $payload['icon'] ?? ''
            ]);
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('UPDATE categories SET is_deleted = 1 WHERE user_id = ? AND id = ?');
            $stmt->execute([$userId, $entityId]);
        }
    }

    log_change($pdo, $userId, $entityType, $entityId, $action, $source, $payload, $clientTs, 'applied', null, $operationId ?: null);
    $appliedCount++;
}

// Fetch all changes from server that occurred since lastSyncTimestamp
$sinceSql = $lastSyncTimestamp > 0 ? 'AND updated_at > FROM_UNIXTIME(? / 1000)' : '';
$sinceParams = $lastSyncTimestamp > 0 ? [$userId, $lastSyncTimestamp] : [$userId];

// 1. Projects
$stmt = $pdo->prepare("SELECT id, name, client, cid, phase, due, is_deleted, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms FROM projects WHERE user_id = ? {$sinceSql}");
$stmt->execute($sinceParams);
$serverProjects = $stmt->fetchAll();

// 2. Items
$stmt = $pdo->prepare("SELECT id, title, kind, date, time, pid, cid, who, phone, done, is_deleted, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms FROM items WHERE user_id = ? {$sinceSql}");
$stmt->execute($sinceParams);
$serverItems = $stmt->fetchAll();
foreach ($serverItems as &$item) {
    $item['done'] = (bool)$item['done'];
}

// 3. Clients
$stmt = $pdo->prepare("SELECT id, name, phone, email, company, notes, is_deleted, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms FROM clients WHERE user_id = ? {$sinceSql}");
$stmt->execute($sinceParams);
$serverClients = $stmt->fetchAll();
foreach ($serverClients as &$client) {
    $client['notes'] = $client['notes'] ? json_decode($client['notes'], true) : [];
}

// 4. Categories
$stmt = $pdo->prepare("SELECT id, label, color, colorClass, icon, is_deleted, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms FROM categories WHERE user_id = ? {$sinceSql}");
$stmt->execute($sinceParams);
$serverCategories = $stmt->fetchAll();

// 5. Settings
$stmt = $pdo->prepare("SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?");
$stmt->execute([$userId]);
$settingsRows = $stmt->fetchAll();
$serverSettings = [];
foreach ($settingsRows as $row) {
    $serverSettings[$row['setting_key']] = $row['setting_value'];
}

// Also fetch any existing unresolved conflicts from change_log
$stmtConflicts = $pdo->prepare("
    SELECT id AS conflict_id, entity_type, entity_id, action, conflict_details, client_timestamp, UNIX_TIMESTAMP(server_timestamp)*1000 AS server_timestamp_ms
    FROM change_log 
    WHERE user_id = ? AND status = 'conflict'
    ORDER BY id DESC LIMIT 50
");
$stmtConflicts->execute([$userId]);
$existingConflictRows = $stmtConflicts->fetchAll();
$allConflicts = $conflicts;
$existingIds = array_column($conflicts, 'conflict_id');
foreach ($existingConflictRows as $row) {
    if (!in_array($row['conflict_id'], $existingIds)) {
        $details = $row['conflict_details'] ? json_decode($row['conflict_details'], true) : [];
        $allConflicts[] = array_merge([
            'conflict_id'     => (int)$row['conflict_id'],
            'entity_type'     => $row['entity_type'],
            'entity_id'       => $row['entity_id'],
            'action'          => $row['action'],
            'client_timestamp'=> (int)$row['client_timestamp']
        ], $details);
    }
}

json_response([
    'success'          => true,
    'server_timestamp' => $nowMs,
    'applied_count'    => $appliedCount,
    'conflicts'        => $allConflicts,
    'server_changes'   => [
        'projects'   => $serverProjects,
        'items'      => $serverItems,
        'clients'    => $serverClients,
        'categories' => $serverCategories,
        'settings'   => $serverSettings
    ]
]);
