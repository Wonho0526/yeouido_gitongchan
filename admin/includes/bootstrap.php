<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Seoul');

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

$__isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

session_name('ygtc_admin_session');
session_set_cookie_params([
    'lifetime' => 0, // browser-session cookie by default; extended explicitly on "stay signed in" login
    'path' => '/',
    'httponly' => true,
    'secure' => $__isHttps,
    // 'Strict' drops the session cookie on the top-level redirect back from Kakao's OAuth
    // consent screen (a cross-site navigation), bouncing the admin back to the login page
    // mid-flow. 'Lax' still blocks cross-site POST/embeds, just allows top-level GET returns.
    'samesite' => 'Lax',
]);
session_start();

require __DIR__ . '/csrf.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/upload.php';
