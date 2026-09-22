<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$q = query_param('q');
$sortParam = query_param('sort', 'createdAt');
$dir = query_param('dir', 'desc') === 'asc' ? 'ASC' : 'DESC';
$page = max(1, (int) query_param('page', '1'));
$pageSize = min(50, max(1, (int) query_param('pageSize', '10')));

$sortColumns = [
    'name' => 'name',
    'username' => 'username',
    'role' => 'role',
    'createdAt' => 'created_at',
    'lastLoginAt' => 'last_login_at',
];
$sortColumn = $sortColumns[$sortParam] ?? 'created_at';

$where = '';
$params = [];
if ($q !== '') {
    $where = 'WHERE name LIKE :q OR username LIKE :q';
    $params['q'] = '%' . $q . '%';
}

$countStmt = db()->prepare("SELECT COUNT(*) FROM admins $where");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$offset = ($page - 1) * $pageSize;
$listStmt = db()->prepare("SELECT * FROM admins $where ORDER BY $sortColumn $dir LIMIT :limit OFFSET :offset");
foreach ($params as $key => $value) {
    $listStmt->bindValue(':' . $key, $value);
}
$listStmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
$listStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$listStmt->execute();
$accounts = $listStmt->fetchAll();

$totalPages = max(1, (int) ceil($total / $pageSize));

function sort_link(string $key, string $label, string $currentSort, string $currentDirLower, string $q): string
{
    $nextDir = ($currentSort === $key && $currentDirLower === 'asc') ? 'desc' : 'asc';
    $qs = http_build_query(['sort' => $key, 'dir' => $nextDir, 'q' => $q]);
    return '<a href="' . h(admin_url('accounts/index.php?' . $qs)) . '">' . h($label) . ($currentSort === $key ? ($currentDirLower === 'asc' ? ' ▲' : ' ▼') : '') . '</a>';
}

layout_header('계정 관리', $admin);
?>
<div class="toolbar">
  <form method="get">
    <input type="hidden" name="sort" value="<?= h($sortParam) ?>">
    <input type="hidden" name="dir" value="<?= h(strtolower($dir)) ?>">
    <input type="text" name="q" placeholder="이름/아이디 검색" value="<?= h($q) ?>">
    <button type="submit" class="btn">검색</button>
  </form>
  <a href="<?= h(admin_url('accounts/new.php')) ?>" class="btn btn--primary">새 계정</a>
</div>

<div class="table-scroll">
<table>
  <thead>
    <tr>
      <th><?= sort_link('name', '이름', $sortParam, strtolower($dir), $q) ?></th>
      <th><?= sort_link('username', '아이디', $sortParam, strtolower($dir), $q) ?></th>
      <th><?= sort_link('role', '권한', $sortParam, strtolower($dir), $q) ?></th>
      <th>상태</th>
      <th><?= sort_link('lastLoginAt', '최근 로그인', $sortParam, strtolower($dir), $q) ?></th>
      <th style="width:260px;">관리</th>
    </tr>
  </thead>
  <tbody>
    <?php if (!$accounts): ?>
      <tr><td colspan="6">계정이 없습니다.</td></tr>
    <?php endif; ?>
    <?php foreach ($accounts as $account): ?>
      <tr>
        <td><?= h($account['name']) ?></td>
        <td><?= h($account['username']) ?></td>
        <td><?= h($account['role']) ?></td>
        <td>
          <span class="badge <?= $account['is_active'] ? 'badge--on' : 'badge--off' ?>">
            <?= $account['is_active'] ? '활성' : '비활성' ?>
          </span>
        </td>
        <td><?= $account['last_login_at'] ? h($account['last_login_at']) : '-' ?></td>
        <td>
          <a href="<?= h(admin_url('accounts/edit.php?id=' . $account['id'])) ?>" class="btn btn--small">수정</a>
          <form method="post" action="<?= h(admin_url('accounts/reset-password.php')) ?>" style="display:inline;" onsubmit="return confirm('비밀번호를 초기화하시겠습니까?');">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $account['id'] ?>">
            <button type="submit" class="btn btn--small">비밀번호 초기화</button>
          </form>
          <form method="post" action="<?= h(admin_url('accounts/toggle-active.php')) ?>" style="display:inline;">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $account['id'] ?>">
            <button type="submit" class="btn btn--small"><?= $account['is_active'] ? '비활성화' : '활성화' ?></button>
          </form>
          <form method="post" action="<?= h(admin_url('accounts/delete.php')) ?>" style="display:inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $account['id'] ?>">
            <button type="submit" class="btn btn--small btn--danger" <?= (int) $account['id'] === (int) $admin['id'] ? 'disabled' : '' ?>>삭제</button>
          </form>
        </td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
</div>

<?php if ($totalPages > 1): ?>
<div class="toolbar">
  <?php for ($p = 1; $p <= $totalPages; $p++): ?>
    <a class="btn btn--small" href="<?= h(admin_url('accounts/index.php?' . http_build_query(['sort' => $sortParam, 'dir' => strtolower($dir), 'q' => $q, 'page' => $p]))) ?>" <?= $p === $page ? 'style="font-weight:700;"' : '' ?>><?= $p ?></a>
  <?php endfor; ?>
</div>
<?php endif; ?>
<?php
layout_footer();
