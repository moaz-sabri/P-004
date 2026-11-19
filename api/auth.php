<?php
/**
 * Studio Planner - Authentication API
 * Endpoints: /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout, /api/auth/claim_local_data
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/authorization.php';

$pdo = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if (!$action && isset($_SERVER['PATH_INFO'])) {
    $action = trim($_SERVER['PATH_INFO'], '/');
}

switch ($action) {
    case 'login':
        require_request_method('POST');
        require_json_request();
        enforce_rate_limit('auth-login', 10, 300);
        $input = get_json_input();
        $username = trim($input['username'] ?? '');
        $password = (string)($input['password'] ?? '');

        if (!validate_username($username) || !$password) {
            json_response(['success' => false, 'error' => 'اسم المستخدم وكلمة المرور مطلوبان.'], 400);
        }

        $stmt = $pdo->prepare('SELECT id, username, name, email, password_hash, role FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            json_response(['success' => false, 'error' => 'اسم المستخدم أو كلمة المرور غير صحيحة.'], 401);
        }

        $token = generate_token($user);
        set_auth_cookie($token);

        // Fetch user settings
        $stmtSettings = $pdo->prepare('SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?');
        $stmtSettings->execute([$user['id']]);
        $settingsRows = $stmtSettings->fetchAll();
        $settings = [];
        foreach ($settingsRows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        json_response([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح.',
            'token'   => $token,
            'user'    => [
                'id'       => (int)$user['id'],
                'username' => $user['username'],
                'name'     => $user['name'] ?: $user['username'],
                'email'    => $user['email'] ?? '',
                'role'     => $user['role']
            ],
            'settings' => $settings
        ]);
        break;

    case 'register':
        require_request_method('POST');
        require_json_request();
        enforce_rate_limit('auth-register', 5, 3600);
        $input = get_json_input();
        $username = trim($input['username'] ?? '');
        $password = (string)($input['password'] ?? '');
        $name     = trim($input['name'] ?? $username);
        $email    = trim($input['email'] ?? '');

        if (!validate_username($username)) {
            json_response(['success' => false, 'error' => 'اسم المستخدم يجب أن يتكون من 3 إلى 50 حرفاً أو رقماً.'], 400);
        }
        if (!$password || strlen($password) < 10 || strlen($password) > 200) {
            json_response(['success' => false, 'error' => 'كلمة المرور يجب أن تكون بين 10 و200 حرف.'], 400);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['success' => false, 'error' => 'صيغة البريد الإلكتروني غير صحيحة.'], 400);
        }

        // Check if username exists
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            json_response(['success' => false, 'error' => 'اسم المستخدم مسجل مسبقاً.'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmtInsert = $pdo->prepare('INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, "user")');
        $stmtInsert->execute([$username, $name, $email, $hash]);
        $newUserId = (int)$pdo->lastInsertId();

        // Seed default categories for this user
        $defaultCategories = [
            ['task', 'مهام ومراجعات', '#1f6355', 'tag-task', 'check-square'],
            ['visit', 'زيارات ومعاينات', '#b46d1b', 'tag-visit', 'map-pin'],
            ['session', 'جلسات واجتماعات', '#3b5998', 'tag-session', 'users'],
            ['delivery', 'تسليمات هامة', '#9e2a2b', 'tag-delivery', 'flag']
        ];
        $stmtCat = $pdo->prepare('INSERT INTO categories (id, user_id, label, color, colorClass, icon) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($defaultCategories as $cat) {
            $stmtCat->execute([$cat[0], $newUserId, $cat[1], $cat[2], $cat[3], $cat[4]]);
        }

        $stmtSet = $pdo->prepare('INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, "weekStartDay", "saturday")');
        $stmtSet->execute([$newUserId]);

        $user = [
            'id'       => $newUserId,
            'username' => $username,
            'name'     => $name,
            'email'    => $email,
            'role'     => 'user'
        ];
        $token = generate_token($user);
        set_auth_cookie($token);

        json_response([
            'success' => true,
            'message' => 'تم إنشاء الحساب بنجاح.',
            'token'   => $token,
            'user'    => $user,
            'settings' => ['weekStartDay' => 'saturday', 'theme' => 'auto']
        ], 201);
        break;

    case 'claim_local_data':
        // Claim & Associate offline data to the registered user
        require_request_method('POST');
        require_json_request(5 * 1024 * 1024);
        require_csrf();
        $user = require_auth($pdo);
        $userId = (int)$user['id'];
        $input = get_json_input();
        $nowMs = (int)(microtime(true) * 1000);
        $claimedCount = 0;

        // 1. Projects
        $projects = is_array($input['projects'] ?? null) ? $input['projects'] : [];
        $stmtProj = $pdo->prepare('
            INSERT INTO projects (id, user_id, name, client, cid, phase, due, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                user_id = VALUES(user_id),
                name = VALUES(name),
                client = VALUES(client),
                cid = VALUES(cid),
                phase = VALUES(phase),
                due = VALUES(due),
                is_deleted = 0
        ');
        foreach ($projects as $p) {
            if (empty($p['id']) || empty($p['name'])) continue;
            $stmtProj->execute([
                $p['id'],
                $userId,
                $p['name'],
                $p['client'] ?? '',
                $p['cid'] ?? '',
                (int)($p['phase'] ?? 0),
                $p['due'] ?? ''
            ]);
            log_change($pdo, $userId, 'project', $p['id'], 'create', 'offline', $p, $nowMs, 'applied');
            $claimedCount++;
        }

        // 2. Items
        $items = is_array($input['items'] ?? null) ? $input['items'] : [];
        $stmtItem = $pdo->prepare('
            INSERT INTO items (id, user_id, title, kind, date, time, pid, cid, who, phone, done, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                user_id = VALUES(user_id),
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
        foreach ($items as $it) {
            if (empty($it['id']) || empty($it['title'])) continue;
            $stmtItem->execute([
                $it['id'],
                $userId,
                $it['title'],
                $it['kind'] ?? 'task',
                $it['date'] ?? '',
                $it['time'] ?? '',
                $it['pid'] ?? '',
                $it['cid'] ?? '',
                $it['who'] ?? '',
                $it['phone'] ?? '',
                !empty($it['done']) ? 1 : 0
            ]);
            log_change($pdo, $userId, 'item', $it['id'], 'create', 'offline', $it, $nowMs, 'applied');
            $claimedCount++;
        }

        // 3. Clients
        $clients = is_array($input['clients'] ?? null) ? $input['clients'] : [];
        $stmtClient = $pdo->prepare('
            INSERT INTO clients (id, user_id, name, phone, email, company, notes, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE 
                user_id = VALUES(user_id),
                name = VALUES(name),
                phone = VALUES(phone),
                email = VALUES(email),
                company = VALUES(company),
                notes = VALUES(notes),
                is_deleted = 0
        ');
        foreach ($clients as $cl) {
            if (empty($cl['id']) || empty($cl['name'])) continue;
            $notesJson = isset($cl['notes']) ? json_encode($cl['notes'], JSON_UNESCAPED_UNICODE) : null;
            $stmtClient->execute([
                $cl['id'],
                $userId,
                $cl['name'],
                $cl['phone'] ?? '',
                $cl['email'] ?? '',
                $cl['company'] ?? '',
                $notesJson
            ]);
            log_change($pdo, $userId, 'client', $cl['id'], 'create', 'offline', $cl, $nowMs, 'applied');
            $claimedCount++;
        }

        json_response([
            'success'       => true,
            'message'       => 'تم ربط ونسب البيانات المحلية بحسابك المسجل بنجاح.',
            'claimed_count' => $claimedCount
        ]);
        break;

    case 'me':
        $user = require_auth($pdo);
        $stmtSettings = $pdo->prepare('SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?');
        $stmtSettings->execute([$user['id']]);
        $settingsRows = $stmtSettings->fetchAll();
        $settings = [];
        foreach ($settingsRows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        json_response([
            'success' => true,
            'user'    => $user,
            'settings' => $settings
        ]);
        break;

    case 'update_role':
        require_request_method('POST');
        require_json_request();
        require_csrf();
        $admin = require_auth($pdo);
        require_role($admin, ['admin']);
        $input = get_json_input();
        $targetUserId = (int)($input['user_id'] ?? 0);
        $newRole = (string)($input['role'] ?? '');
        $allowedRoles = ['admin', 'manager', 'editor', 'viewer', 'user'];

        if ($targetUserId <= 0 || !in_array($newRole, $allowedRoles, true)) {
            json_response(['success' => false, 'error' => 'بيانات الدور غير صالحة.'], 400);
        }
        if ($targetUserId === (int)$admin['id'] && $newRole !== 'admin') {
            json_response(['success' => false, 'error' => 'لا يمكن للمدير خفض دوره من حسابه الحالي.'], 400);
        }

        $stmtTarget = $pdo->prepare('SELECT id, username, name, email, role FROM users WHERE id = ? LIMIT 1');
        $stmtTarget->execute([$targetUserId]);
        $target = $stmtTarget->fetch();
        if (!$target) {
            json_response(['success' => false, 'error' => 'المستخدم غير موجود.'], 404);
        }

        $stmtUpdate = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
        $stmtUpdate->execute([$newRole, $targetUserId]);
        $target['role'] = $newRole;
        json_response(['success' => true, 'user' => $target]);
        break;

    case 'list_users':
        require_request_method('GET');
        $admin = require_auth($pdo);
        require_role($admin, ['admin']);
        $stmtUsers = $pdo->query('SELECT id, username, name, email, role, created_at FROM users ORDER BY id ASC');
        json_response(['success' => true, 'users' => $stmtUsers->fetchAll()]);
        break;

    case 'logout':
        clear_auth_cookie();
        json_response([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح.'
        ]);
        break;

    default:
        json_response(['success' => false, 'error' => 'إجراء غير معروف.'], 404);
        break;
}
