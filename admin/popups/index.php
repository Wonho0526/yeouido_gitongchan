<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

$q = query_param('q');
$activeFilter = query_param('active', 'all');

$where = [];
$params = [];
if ($q !== '') {
    $where[] = 'title LIKE :q';
    $params['q'] = '%' . $q . '%';
}
if ($activeFilter === 'active') {
    $where[] = 'is_active = 1';
} elseif ($activeFilter === 'inactive') {
    $where[] = 'is_active = 0';
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = db()->prepare("SELECT * FROM popups $whereSql ORDER BY display_order ASC, id ASC");
$stmt->execute($params);
$popups = $stmt->fetchAll();

$queryString = http_build_query(['q' => $q, 'active' => $activeFilter]);

layout_header('팝업 관리', $admin);
?>
<div class="toolbar">
  <form method="get">
    <input type="text" name="q" placeholder="제목 검색" value="<?= h($q) ?>">
    <select name="active">
      <option value="all" <?= $activeFilter === 'all' ? 'selected' : '' ?>>전체</option>
      <option value="active" <?= $activeFilter === 'active' ? 'selected' : '' ?>>활성</option>
      <option value="inactive" <?= $activeFilter === 'inactive' ? 'selected' : '' ?>>비활성</option>
    </select>
    <button type="submit" class="btn">검색</button>
  </form>
  <a href="<?= h(admin_url('popups/new.php')) ?>" class="btn btn--primary">새 팝업</a>
</div>

<div class="table-scroll">
<table>
  <thead>
    <tr>
      <th style="width:70px;">순서</th>
      <th>제목</th>
      <th>기간</th>
      <th>상태</th>
      <th style="width:220px;">관리</th>
    </tr>
  </thead>
  <tbody>
    <?php if (!$popups): ?>
      <tr><td colspan="5">등록된 팝업이 없습니다.</td></tr>
    <?php endif; ?>
    <?php foreach ($popups as $i => $popup): ?>
      <tr>
        <td>
          <form method="post" action="<?= h(admin_url('popups/move.php')) ?>" style="display:inline;">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $popup['id'] ?>">
            <input type="hidden" name="return" value="<?= h($queryString) ?>">
            <button type="submit" name="dir" value="up" class="btn btn--small" <?= $i === 0 ? 'disabled' : '' ?>>▲</button>
            <button type="submit" name="dir" value="down" class="btn btn--small" <?= $i === count($popups) - 1 ? 'disabled' : '' ?>>▼</button>
          </form>
        </td>
        <td><?= h($popup['title']) ?></td>
        <td><?= h(substr($popup['start_date'], 0, 10)) ?> ~ <?= h(substr($popup['end_date'], 0, 10)) ?></td>
        <td>
          <span class="badge <?= $popup['is_active'] ? 'badge--on' : 'badge--off' ?>">
            <?= $popup['is_active'] ? '활성' : '비활성' ?>
          </span>
        </td>
        <td>
          <a href="<?= h(admin_url('popups/edit.php?id=' . $popup['id'])) ?>" class="btn btn--small">수정</a>
          <form method="post" action="<?= h(admin_url('popups/toggle-active.php')) ?>" style="display:inline;">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $popup['id'] ?>">
            <input type="hidden" name="return" value="<?= h($queryString) ?>">
            <button type="submit" class="btn btn--small"><?= $popup['is_active'] ? '비활성화' : '활성화' ?></button>
          </form>
          <form method="post" action="<?= h(admin_url('popups/delete.php')) ?>" style="display:inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $popup['id'] ?>">
            <input type="hidden" name="return" value="<?= h($queryString) ?>">
            <button type="submit" class="btn btn--small btn--danger">삭제</button>
          </form>
        </td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
</div>
<?php
layout_footer();
