<?php

// Inline image upload for the 건강정보 editor. The editor posts one file and gets back the
// stored path, which it drops into the body as an <img src>. Logged-in admins only, and
// the file goes through the same magic-byte check as cover images.
//
// The path returned here is also what sanitize_html.php will accept later: anything the
// editor sends with a different shape is stripped from the body on save.

require __DIR__ . '/../includes/bootstrap.php';

require_login();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function upload_fail(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_post()) {
    upload_fail(405, 'POST로만 요청할 수 있습니다.');
}
if (($_POST['csrf_token'] ?? '') === '' || !hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'])) {
    upload_fail(403, '세션이 만료되었습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
}
if (!isset($_FILES['image'])) {
    // A file larger than post_max_size arrives with $_FILES empty, so say something useful.
    upload_fail(400, '이미지를 찾을 수 없습니다. 5MB 이하 파일인지 확인해주세요.');
}

try {
    $path = save_uploaded_image($_FILES['image'], 'community', 'inline');
} catch (RuntimeException $e) {
    upload_fail(400, $e->getMessage());
}

if ($path === null) {
    upload_fail(400, '이미지를 선택해주세요.');
}

echo json_encode(['path' => $path], JSON_UNESCAPED_UNICODE);
