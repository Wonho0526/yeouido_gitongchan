<?php

function h(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

/** Base path of the admin app, e.g. "/admin" — used so links work regardless of subfolder depth. */
function admin_base(): string
{
    static $base = null;
    if ($base === null) {
        // SCRIPT_NAME e.g. /admin/popups/edit.php -> find the /admin prefix once, cached per request.
        $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/admin/index.php');
        $pos = strpos($script, '/admin/');
        $base = $pos !== false ? substr($script, 0, $pos + strlen('/admin')) : '/admin';
    }
    return $base;
}

function admin_url(string $path = ''): string
{
    return admin_base() . '/' . ltrim($path, '/');
}

function redirect(string $path): void
{
    $target = str_starts_with($path, 'http') || str_starts_with($path, '/')
        ? $path
        : admin_url($path);
    header('Location: ' . $target);
    exit;
}

function flash_set(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function flash_get(): ?array
{
    if (empty($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function post(string $key, string $default = ''): string
{
    return trim((string) ($_POST[$key] ?? $default));
}

function query_param(string $key, string $default = ''): string
{
    return trim((string) ($_GET[$key] ?? $default));
}

/** Site-relative paths or http(s) URLs only — FILTER_VALIDATE_URL alone admits "javascript://…". */
function is_safe_link_url(string $url): bool
{
    if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
        return true;
    }
    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    return in_array($scheme, ['http', 'https'], true) && filter_var($url, FILTER_VALIDATE_URL) !== false;
}

/** Features default to off, so a config.php written before a flag existed keeps it hidden. */
function feature_enabled(string $name): bool
{
    return (bool) (app_config()['features'][$name] ?? false);
}

/** Disabled features answer 404 rather than 403, so their existence isn't advertised. */
function require_feature(string $name): void
{
    if (!feature_enabled($name)) {
        http_response_code(404);
        exit('페이지를 찾을 수 없습니다.');
    }
}
