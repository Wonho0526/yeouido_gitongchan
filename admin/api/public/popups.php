<?php

// Public endpoint — no auth/session needed (same-origin as the static homepage,
// so no CORS handling is needed either; see assets/popup.js).

require __DIR__ . '/../../includes/db.php';
require __DIR__ . '/../../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');

$stmt = db()->prepare(
    'SELECT id, title, pc_image_path, mobile_image_path, link_url, link_target
     FROM popups
     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
     ORDER BY display_order ASC, id ASC'
);
$stmt->execute();
$popups = $stmt->fetchAll();

$data = array_map(function (array $popup): array {
    $pcUrl = admin_url(ltrim($popup['pc_image_path'], '/'));
    $mobileUrl = $popup['mobile_image_path']
        ? admin_url(ltrim($popup['mobile_image_path'], '/'))
        : $pcUrl;

    return [
        'id' => (int) $popup['id'],
        'title' => $popup['title'],
        'pcImageUrl' => $pcUrl,
        'mobileImageUrl' => $mobileUrl,
        'linkUrl' => $popup['link_url'],
        'linkTarget' => $popup['link_target'],
    ];
}, $popups);

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
