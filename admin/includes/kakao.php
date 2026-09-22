<?php

// KakaoTalk "나에게 보내기" (memo API) notifications — sends everyone who has connected
// their Kakao account a message whenever a public consultation request comes in.
// Multiple staff can each connect their own account (see kakao/index.php); every send
// loops over all of them.
// Deliberately self-contained (own kakao_is_https()/kakao_admin_base() instead of reusing
// helpers.php's) because this file is also required from the public API endpoint, which
// doesn't load bootstrap.php/helpers.php.

const KAKAO_TOKEN_FILE = __DIR__ . '/../storage/kakao_token.json';

function kakao_config(): ?array
{
    static $config = false;
    if ($config !== false) {
        return $config;
    }
    $configPath = __DIR__ . '/../config.php';
    if (!is_file($configPath)) {
        $config = null;
        return null;
    }
    $kakao = (require $configPath)['kakao'] ?? null;
    $config = !empty($kakao['rest_api_key']) ? $kakao : null;
    return $config;
}

function kakao_is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

/** Same logic as helpers.php's admin_base(), duplicated to keep this file load-order independent. */
function kakao_admin_base(): string
{
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/admin/index.php');
    $pos = strpos($script, '/admin/');
    return $pos !== false ? substr($script, 0, $pos + strlen('/admin')) : '/admin';
}

function kakao_admin_origin(): string
{
    $scheme = kakao_is_https() ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host . kakao_admin_base() . '/';
}

function kakao_redirect_uri_absolute(): string
{
    return kakao_admin_origin() . 'kakao/callback.php';
}

function kakao_authorize_url(): ?string
{
    $config = kakao_config();
    if (!$config) {
        return null;
    }
    return 'https://kauth.kakao.com/oauth/authorize?' . http_build_query([
        'client_id' => $config['rest_api_key'],
        'redirect_uri' => kakao_redirect_uri_absolute(),
        'response_type' => 'code',
        'scope' => 'talk_message',
    ]);
}

/** Connected accounts, keyed by their (immutable) Kakao user id: [id => ['nickname', 'access_token', 'refresh_token', 'expires_at', 'connected_at']]. */
function kakao_load_connections(): array
{
    if (!is_file(KAKAO_TOKEN_FILE)) {
        return [];
    }
    $data = json_decode((string) file_get_contents(KAKAO_TOKEN_FILE), true);
    return is_array($data) ? $data : [];
}

function kakao_save_connections(array $connections): void
{
    $dir = dirname(KAKAO_TOKEN_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(KAKAO_TOKEN_FILE, json_encode($connections, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function kakao_remove_connection(string $kakaoId): void
{
    $connections = kakao_load_connections();
    unset($connections[$kakaoId]);
    kakao_save_connections($connections);
}

function kakao_is_connected(): bool
{
    return kakao_load_connections() !== [];
}

/** POSTs form-encoded fields to a Kakao endpoint. Returns the decoded JSON body, or null on transport failure. */
function kakao_http_post(string $url, array $fields, array $headers = []): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/x-www-form-urlencoded;charset=utf-8'], $headers),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
    ]);
    $body = curl_exec($ch);
    if ($body === false) {
        error_log('Kakao API 요청 실패: ' . curl_error($ch));
        curl_close($ch);
        return null;
    }
    curl_close($ch);
    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : null;
}

function kakao_http_get(string $url, array $headers = []): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    if ($body === false) {
        return null;
    }
    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : null;
}

/** Returns null on success, or a human-readable error message (from Kakao's response, if any) on failure. */
function kakao_exchange_code(string $code): ?string
{
    $config = kakao_config();
    if (!$config) {
        return 'config.php에 kakao.rest_api_key가 설정되어 있지 않습니다.';
    }
    $fields = [
        'grant_type' => 'authorization_code',
        'client_id' => $config['rest_api_key'],
        'redirect_uri' => kakao_redirect_uri_absolute(),
        'code' => $code,
    ];
    if (!empty($config['client_secret'])) {
        $fields['client_secret'] = $config['client_secret'];
    }
    $result = kakao_http_post('https://kauth.kakao.com/oauth/token', $fields);
    if (!$result || empty($result['access_token']) || empty($result['refresh_token'])) {
        $detail = $result ? json_encode($result, JSON_UNESCAPED_UNICODE) : '(카카오 서버로부터 응답을 받지 못함)';
        error_log('Kakao 토큰 발급 실패: ' . $detail);
        return $detail;
    }

    $profile = kakao_http_get(
        'https://kapi.kakao.com/v2/user/me?' . http_build_query(['property_keys' => '["kakao_account.profile"]']),
        ['Authorization: Bearer ' . $result['access_token']]
    );
    $kakaoId = $profile['id'] ?? null;
    if (!$kakaoId) {
        return '카카오 계정 정보를 확인하지 못했습니다: ' . json_encode($profile, JSON_UNESCAPED_UNICODE);
    }
    $kakaoId = (string) $kakaoId;

    $connections = kakao_load_connections();
    $connections[$kakaoId] = [
        'nickname' => $profile['kakao_account']['profile']['nickname'] ?? '(이름 없음)',
        'access_token' => $result['access_token'],
        'refresh_token' => $result['refresh_token'],
        'expires_at' => time() + (int) ($result['expires_in'] ?? 21599),
        'connected_at' => $connections[$kakaoId]['connected_at'] ?? time(),
    ];
    kakao_save_connections($connections);
    return null;
}

/**
 * Refreshes one connection's access token if it's expired/near-expiry, persisting the change.
 * Mutates $connections in place. Returns the (possibly refreshed) connection record, or null if
 * the connection doesn't exist or refreshing failed.
 */
function kakao_ensure_connection_token(string $kakaoId, array &$connections): ?array
{
    $conn = $connections[$kakaoId] ?? null;
    if (!$conn) {
        return null;
    }
    if (($conn['expires_at'] ?? 0) > time() + 60) {
        return $conn;
    }

    $config = kakao_config();
    if (!$config) {
        return null;
    }
    $fields = [
        'grant_type' => 'refresh_token',
        'client_id' => $config['rest_api_key'],
        'refresh_token' => $conn['refresh_token'],
    ];
    if (!empty($config['client_secret'])) {
        $fields['client_secret'] = $config['client_secret'];
    }
    $result = kakao_http_post('https://kauth.kakao.com/oauth/token', $fields);
    if (!$result || empty($result['access_token'])) {
        error_log("Kakao 토큰 갱신 실패($kakaoId): " . json_encode($result));
        return null;
    }

    $conn['access_token'] = $result['access_token'];
    $conn['expires_at'] = time() + (int) ($result['expires_in'] ?? 21599);
    if (!empty($result['refresh_token'])) {
        $conn['refresh_token'] = $result['refresh_token'];
    }
    $connections[$kakaoId] = $conn;
    kakao_save_connections($connections);

    return $conn;
}

/**
 * Sends a KakaoTalk "나에게 보내기" memo to every connected account.
 * Never throws — callers (notably the public consultation form) must not fail because Kakao is down.
 * Returns true if the message reached at least one connected account.
 */
function kakao_send_to_me(string $text): bool
{
    $connections = kakao_load_connections();
    if (!$connections) {
        return false;
    }

    $link = kakao_admin_origin() . 'consultations/index.php';
    $templateObject = [
        'object_type' => 'text',
        'text' => $text,
        'link' => [
            'web_url' => $link,
            'mobile_web_url' => $link,
        ],
        'button_title' => '관리자 페이지에서 확인',
    ];
    $payload = ['template_object' => json_encode($templateObject, JSON_UNESCAPED_UNICODE)];

    $anySuccess = false;
    foreach (array_keys($connections) as $kakaoId) {
        try {
            $conn = kakao_ensure_connection_token((string) $kakaoId, $connections);
            if (!$conn) {
                continue;
            }
            $result = kakao_http_post(
                'https://kapi.kakao.com/v2/api/talk/memo/default/send',
                $payload,
                ['Authorization: Bearer ' . $conn['access_token']]
            );
            if (isset($result['result_code']) && (int) $result['result_code'] === 0) {
                $anySuccess = true;
            } else {
                error_log("Kakao 메시지 발송 실패($kakaoId): " . json_encode($result));
            }
        } catch (Throwable $e) {
            error_log('Kakao 발송 예외: ' . $e->getMessage());
        }
    }
    return $anySuccess;
}
