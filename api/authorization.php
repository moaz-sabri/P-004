<?php
/** Role and permission policy for the API. */

declare(strict_types=1);

const STUDIO_ROLE_PERMISSIONS = [
    'admin' => ['*'],
    'manager' => [
        'projects.view', 'projects.manage',
        'items.view', 'items.manage',
        'clients.view', 'clients.manage',
        'sync.use', 'audit.view',
    ],
    'editor' => [
        'projects.view', 'projects.manage',
        'items.view', 'items.manage',
        'clients.view', 'clients.manage',
        'sync.use', 'audit.view',
    ],
    'viewer' => [
        'projects.view', 'items.view', 'clients.view', 'sync.use',
    ],
    'user' => [
        'projects.view', 'projects.manage',
        'items.view', 'items.manage',
        'clients.view', 'clients.manage',
        'sync.use',
    ],
];

function has_permission(array $user, string $permission): bool {
    $role = (string)($user['role'] ?? 'user');
    $permissions = STUDIO_ROLE_PERMISSIONS[$role] ?? [];
    return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
}

function require_permission(array $user, string $permission): void {
    if (!has_permission($user, $permission)) {
        json_response(['success' => false, 'error' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
    }
}

function require_role(array $user, array $roles): void {
    if (!in_array((string)($user['role'] ?? ''), $roles, true)) {
        json_response(['success' => false, 'error' => 'دور المستخدم لا يسمح بهذا الإجراء.'], 403);
    }
}
