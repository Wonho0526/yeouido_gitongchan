<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$sites = db()->query(
    'SELECT s.id, s.site_id, s.site_name, s.is_active, s.created_at,
            GROUP_CONCAT(d.domain ORDER BY d.domain SEPARATOR ", ") AS domains
     FROM sites s
     LEFT JOIN site_domains d ON d.site_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at ASC'
)->fetchAll();

layout_header('사이트 관리', $admin);
?>
<p class="hint">
  방문통계를 수집할 병원 홈페이지를 등록합니다. 각 사이트의 tracker.js는
  <code>&lt;script src="<?= h(admin_url('tracker.js')) ?>" data-site-id="SITE_ID"&gt;&lt;/script&gt;</code>
  형태로 설치하며, 아래 등록된 허용 도메인에서 온 요청만 데이터가 저장됩니다.
</p>
<div class="toolbar">
  <a href="<?= h(admin_url('sites/new.php')) ?>" class="btn btn--primary">새 사이트 등록</a>
</div>

<div class="table-scroll">
<table>
  <thead>
    <tr>
      <th>사이트명</th>
      <th>Site ID</th>
      <th>허용 도메인</th>
      <th>상태</th>
      <th style="width:120px;">관리</th>
    </tr>
  </thead>
  <tbody>
    <?php if (!$sites): ?>
      <tr><td colspan="5">등록된 사이트가 없습니다.</td></tr>
    <?php endif; ?>
    <?php foreach ($sites as $site): ?>
      <tr>
        <td><?= h($site['site_name']) ?></td>
        <td><code><?= h($site['site_id']) ?></code></td>
        <td><?= h($site['domains'] ?: '-') ?></td>
        <td>
          <span class="badge <?= $site['is_active'] ? 'badge--on' : 'badge--off' ?>">
            <?= $site['is_active'] ? '활성' : '비활성' ?>
          </span>
        </td>
        <td>
          <a href="<?= h(admin_url('sites/edit.php?id=' . $site['id'])) ?>" class="btn btn--small">수정</a>
        </td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
</div>
<?php
layout_footer();
