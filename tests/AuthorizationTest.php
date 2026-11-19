<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/authorization.php';

function assert_permission(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

assert_permission(has_permission(['role' => 'admin'], 'anything'), 'admin has all permissions');
assert_permission(has_permission(['role' => 'editor'], 'projects.manage'), 'editor can manage projects');
assert_permission(!has_permission(['role' => 'viewer'], 'projects.manage'), 'viewer cannot manage projects');
assert_permission(!has_permission(['role' => 'unknown'], 'projects.view'), 'unknown role has no permissions');

fwrite(STDOUT, "Authorization tests passed.\n");
