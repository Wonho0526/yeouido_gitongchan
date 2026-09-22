<?php

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $configPath = __DIR__ . '/../config.php';
    if (!is_file($configPath)) {
        http_response_code(500);
        exit('config.php가 없습니다. config.php.example을 복사해 DB 접속 정보를 채워주세요.');
    }
    $config = require $configPath;
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $db = app_config()['db'];

    $dsn = sprintf(
        'mysql:host=%s;%sdbname=%s;charset=%s',
        $db['host'],
        isset($db['port']) ? 'port=' . (int) $db['port'] . ';' : '',
        $db['name'],
        $db['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
