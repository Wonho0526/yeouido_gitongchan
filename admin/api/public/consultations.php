<?php

// Public endpoint — the "1:1 상담신청" form on the static homepage posts here.
// No auth/session/CSRF: this is an anonymous public form, same-origin, so no CORS needed either.

require __DIR__ . '/../../includes/db.php';
require __DIR__ . '/../../includes/helpers.php';
require __DIR__ . '/../../includes/kakao.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Hidden features must not keep accepting anonymous writes into the database.
if (!feature_enabled('consultations')) {
    respond(404, ['error' => ['message' => '찾을 수 없습니다.']]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => ['message' => '허용되지 않는 요청입니다.']]);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Honeypot: bots tend to fill every field, including this hidden one.
// Pretend success so they don't learn to skip it, but don't write anything.
if (!empty($input['website'])) {
    respond(201, ['data' => ['success' => true]]);
}

$name = trim((string) ($input['name'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$content = trim((string) ($input['content'] ?? ''));
$date = trim((string) ($input['date'] ?? ''));

if (mb_strlen($name) < 1 || mb_strlen($name) > 50) {
    respond(400, ['error' => ['message' => '이름을 입력해주세요.']]);
}
if ($phone === '' || mb_strlen($phone) > 20 || !preg_match('/^[0-9\-]+$/', $phone)) {
    respond(400, ['error' => ['message' => '연락처를 정확히 입력해주세요.']]);
}
if (mb_strlen($content) < 1 || mb_strlen($content) > 2000) {
    respond(400, ['error' => ['message' => '상담내용을 입력해주세요.']]);
}

// Only the hourly slots the form actually offers (09:00–18:00) are accepted,
// regardless of what a direct API call might try to send.
$allowedTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
if (!preg_match('/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):00$/', $date, $m) || !in_array($m[2], $allowedTimes, true)) {
    respond(400, ['error' => ['message' => '상담 희망 일시를 정확히 선택해주세요.']]);
}
$datePart = $m[1];
$today = date('Y-m-d');
if ($datePart < $today) {
    respond(400, ['error' => ['message' => '지난 날짜는 선택할 수 없습니다.']]);
}

$stmt = db()->prepare(
    "INSERT INTO consultations (name, phone, content, date, status) VALUES (:name, :phone, :content, :date, '상담전')"
);
$stmt->execute([
    'name' => $name,
    'phone' => $phone,
    'content' => $content,
    'date' => $date,
]);

// Best-effort — Kakao being down/unconnected must never fail the visitor's submission.
if (feature_enabled('kakao')) {
    kakao_send_to_me("[상담신청] {$name}님 ({$phone})\n희망일시: {$date}\n{$content}");
}

respond(201, ['data' => ['success' => true]]);
