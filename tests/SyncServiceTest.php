<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/services/SyncService.php';

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

check(SyncService::tableForEntity('project') === 'projects', 'project maps to projects');
check(SyncService::tableForEntity('item') === 'items', 'item maps to items');
check(SyncService::tableForEntity('client') === 'clients', 'client maps to clients');
check(SyncService::tableForEntity('unknown') === null, 'unknown entity is rejected');
check(SyncService::isValidAction('create'), 'create is valid');
check(SyncService::isValidAction('update'), 'update is valid');
check(SyncService::isValidAction('delete'), 'delete is valid');
check(!SyncService::isValidAction('drop'), 'unsupported action is rejected');

SyncService::validateBatch([
    [
        'entity_type' => 'project',
        'entity_id' => 'p-1',
        'action' => 'create',
        'operation_id' => 'operation-1',
    ],
]);

fwrite(STDOUT, "PHP SyncService tests passed.\n");
