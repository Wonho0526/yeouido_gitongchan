<?php

// MASTER-only. GET /api/statistics/sites.php
// Site list for the dashboard's "전체 / 병원 A / 병원 B ..." selector.

require __DIR__ . '/../../includes/bootstrap.php';

require_role_api('MASTER');

$rows = db()->query('SELECT id, site_id, site_name FROM sites WHERE is_active = 1 ORDER BY site_name ASC')->fetchAll();

$data = array_map(fn(array $r): array => [
    'id' => (int) $r['id'],
    'siteId' => $r['site_id'],
    'siteName' => $r['site_name'],
], $rows);

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
