<?php
/** Domain rules shared by sync endpoints. */

declare(strict_types=1);

final class SyncService
{
    private const ENTITY_TABLES = [
        'project' => 'projects',
        'item' => 'items',
        'client' => 'clients',
        'category' => 'categories',
        'setting' => 'user_settings',
    ];

    private const ACTIONS = ['create', 'update', 'delete'];

    public static function tableForEntity(string $entityType): ?string
    {
        return self::ENTITY_TABLES[$entityType] ?? null;
    }

    public static function isValidAction(string $action): bool
    {
        return in_array($action, self::ACTIONS, true);
    }

    public static function validateBatch(array $changes, int $maxChanges = 500): void
    {
        if (count($changes) > $maxChanges) {
            json_response(['success' => false, 'error' => 'عدد عمليات المزامنة أكبر من المسموح.'], 413);
        }

        foreach ($changes as $index => $change) {
            if (!is_array($change)) {
                json_response(['success' => false, 'error' => "عملية المزامنة رقم {$index} غير صالحة."], 400);
            }

            $entityType = (string)($change['entity_type'] ?? '');
            $entityId = (string)($change['entity_id'] ?? '');
            $action = (string)($change['action'] ?? '');
            $operationId = (string)($change['operation_id'] ?? '');

            if (self::tableForEntity($entityType) === null || $entityType === 'setting') {
                if ($entityType !== 'setting') {
                    json_response(['success' => false, 'error' => "نوع الكيان في العملية رقم {$index} غير صالح."], 400);
                }
            }
            if ($entityId === '' || strlen($entityId) > 64 || !self::isValidAction($action)) {
                json_response(['success' => false, 'error' => "بيانات العملية رقم {$index} غير صالحة."], 400);
            }
            if ($operationId !== '' && !preg_match('/^[A-Za-z0-9_-]{8,64}$/', $operationId)) {
                json_response(['success' => false, 'error' => "معرّف العملية رقم {$index} غير صالح."], 400);
            }
        }
    }
}
