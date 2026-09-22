<?php

const SESSION_IDLE_SECONDS = 2 * 60 * 60;       // 2h when "stay signed in" is off
const SESSION_EXTENDED_SECONDS = 14 * 24 * 60 * 60; // 14d when "stay signed in" is on

function client_ip(): string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded !== '') {
        return trim(explode(',', $forwarded)[0]);
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return $_SERVER['HTTP_X_REAL_IP'];
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function record_login_log(?int $adminId, string $attemptedUsername, bool $success, ?string $failureReason): void
{
    $stmt = db()->prepare(
        'INSERT INTO login_logs (admin_id, attempted_username, ip_address, user_agent, success, failure_reason)
         VALUES (:admin_id, :username, :ip, :ua, :success, :reason)'
    );
    $stmt->execute([
        'admin_id' => $adminId,
        'username' => $attemptedUsername,
        'ip' => client_ip(),
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'success' => $success ? 1 : 0,
        'reason' => $failureReason,
    ]);
}

/**
 * Attempts login. Returns null on success, or a generic Korean error string on failure.
 * Deliberately returns the SAME message for "no such user", "inactive", and "wrong password"
 * so a failed login can't be used to enumerate valid usernames.
 */
function attempt_login(string $username, string $password, bool $staySignedIn): ?string
{
    $genericError = '아이디 또는 비밀번호가 올바르지 않습니다.';

    $stmt = db()->prepare('SELECT * FROM admins WHERE username = :username');
    $stmt->execute(['username' => $username]);
    $admin = $stmt->fetch();

    if (!$admin) {
        record_login_log(null, $username, false, 'NOT_FOUND');
        return $genericError;
    }
    if (!$admin['is_active']) {
        record_login_log($admin['id'], $username, false, 'ACCOUNT_INACTIVE');
        return $genericError;
    }
    if (!password_verify($password, $admin['password_hash'])) {
        record_login_log($admin['id'], $username, false, 'INVALID_PASSWORD');
        return $genericError;
    }

    record_login_log($admin['id'], $username, true, null);
    db()->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $admin['id']]);

    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int) $admin['id'];

    $lifetime = $staySignedIn ? SESSION_EXTENDED_SECONDS : SESSION_IDLE_SECONDS;
    $_SESSION['expires_at'] = time() + $lifetime;

    if ($staySignedIn) {
        setcookie(session_name(), session_id(), [
            'expires' => time() + $lifetime,
            'path' => '/',
            'httponly' => true,
            'secure' => is_https(),
            'samesite' => 'Lax',
        ]);
    }

    return null;
}

function logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

/**
 * Re-checks the admin against the DB on every call (not just trusting the session)
 * so a deactivated account is locked out immediately, not just after its session naturally expires.
 */
function current_admin(): ?array
{
    static $cached = false;
    if ($cached !== false) {
        return $cached ?: null;
    }

    if (empty($_SESSION['admin_id'])) {
        $cached = null;
        return null;
    }
    if (!empty($_SESSION['expires_at']) && time() > $_SESSION['expires_at']) {
        logout();
        $cached = null;
        return null;
    }

    $stmt = db()->prepare('SELECT id, username, name, role, is_active, created_at, last_login_at FROM admins WHERE id = :id');
    $stmt->execute(['id' => $_SESSION['admin_id']]);
    $admin = $stmt->fetch();

    if (!$admin || !$admin['is_active']) {
        logout();
        $cached = null;
        return null;
    }

    $cached = $admin;
    return $admin;
}

function require_login(): array
{
    $admin = current_admin();
    if (!$admin) {
        $redirect = urlencode($_SERVER['REQUEST_URI'] ?? admin_url());
        redirect(admin_url('login.php?redirect=' . $redirect));
    }
    return $admin;
}

function require_role(string ...$roles): array
{
    $admin = require_login();
    if (!in_array($admin['role'], $roles, true)) {
        http_response_code(403);
        exit('이 페이지에 접근할 권한이 없습니다.');
    }
    return $admin;
}

function validate_username(string $username): ?string
{
    if (!preg_match('/^[a-z][a-z0-9_]*$/', $username) || strlen($username) < 3 || strlen($username) > 20) {
        return '아이디는 소문자로 시작하는 영문 소문자/숫자/밑줄 3~20자여야 합니다.';
    }
    return null;
}

function validate_password(string $password): ?string
{
    if (strlen($password) < 8 || !preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
        return '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.';
    }
    return null;
}

function validate_name(string $name): ?string
{
    if (mb_strlen($name) < 1 || mb_strlen($name) > 50) {
        return '이름은 1~50자여야 합니다.';
    }
    return null;
}

function generate_temp_password(): string
{
    $letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    $digits = '23456789';
    $all = $letters . $digits;

    $password = $letters[random_int(0, strlen($letters) - 1)] . $digits[random_int(0, strlen($digits) - 1)];
    for ($i = 0; $i < 8; $i++) {
        $password .= $all[random_int(0, strlen($all) - 1)];
    }
    return str_shuffle($password);
}

/**
 * Returns an error message if the given change (role change away from MASTER,
 * deactivation, or delete) would leave zero active MASTER accounts.
 */
function ensure_not_last_active_master(int $targetAdminId, string $action): ?string
{
    $stmt = db()->prepare(
        "SELECT COUNT(*) FROM admins WHERE role = 'MASTER' AND is_active = 1 AND id != :id"
    );
    $stmt->execute(['id' => $targetAdminId]);
    $remainingActiveMasters = (int) $stmt->fetchColumn();

    if ($remainingActiveMasters === 0) {
        return match ($action) {
            'delete' => '마지막 활성 MASTER 계정은 삭제할 수 없습니다.',
            'deactivate' => '마지막 활성 MASTER 계정은 비활성화할 수 없습니다.',
            default => '마지막 활성 MASTER 계정의 권한은 변경할 수 없습니다.',
        };
    }
    return null;
}
