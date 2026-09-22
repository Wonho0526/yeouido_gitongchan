<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

const COMMUNITY_ADMIN_PER_PAGE = 20;

$q = query_param('q');
$status = query_param('status', 'all');
$page = max(1, (int) query_param('page', '1'));

$where = [];
$params = [];
if ($q !== '') {
    $where[] = 'title LIKE :q';
    $params['q'] = '%' . $q . '%';
}
if ($status === 'published') {
    $where[] = 'is_published = 1';
} elseif ($status === 'draft') {
    $where[] = 'is_published = 0';
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = db()->prepare("SELECT COUNT(*) FROM community_posts $whereSql");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();
$totalPages = max(1, (int) ceil($total / COMMUNITY_ADMIN_PER_PAGE));
$page = min($page, $totalPages);
$offset = ($page - 1) * COMMUNITY_ADMIN_PER_PAGE;

// LIMIT/OFFSET are integers computed above, so inlining them is safe (PDO can't bind them
// as strings when emulated prepares are off).
$stmt = db()->prepare(
    "SELECT id, title, is_pinned, is_published, view_count, published_at FROM community_posts $whereSql
     ORDER BY is_pinned DESC, published_at DESC, id DESC
     LIMIT " . COMMUNITY_ADMIN_PER_PAGE . " OFFSET $offset"
);
$stmt->execute($params);
$posts = $stmt->fetchAll();

$filterQuery = ['q' => $q, 'status' => $status];
$queryString = http_build_query($filterQuery + ['page' => $page]);
$today = date('Y-m-d');

layout_header('커뮤니티 관리', $admin);
?>
<p class="hint" style="margin:-8px 0 16px;">홈페이지 ‘기가 통하는 커뮤니티’에 노출되는 게시글입니다.</p>
<div class="toolbar">
  <form method="get">
    <input type="text" name="q" placeholder="제목 검색" value="<?= h($q) ?>">
    <select name="status">
      <option value="all" <?= $status === 'all' ? 'selected' : '' ?>>전체</option>
      <option value="published" <?= $status === 'published' ? 'selected' : '' ?>>공개</option>
      <option value="draft" <?= $status === 'draft' ? 'selected' : '' ?>>비공개</option>
    </select>
    <button type="submit" class="btn">검색</button>
  </form>
  <a href="<?= h(admin_url('community/new.php')) ?>" class="btn btn--primary">새 게시글</a>
</div>

<div class="table-scroll">
<table>
  <thead>
    <tr>
      <th>제목</th>
      <th style="width:110px;">게시일</th>
      <th style="width:70px;">조회</th>
      <th style="width:90px;">상태</th>
      <th style="width:220px;">관리</th>
    </tr>
  </thead>
  <tbody>
    <?php if (!$posts): ?>
      <tr><td colspan="5">등록된 게시글이 없습니다.</td></tr>
    <?php endif; ?>
    <?php foreach ($posts as $post): ?>
      <?php $publishDate = substr($post['published_at'], 0, 10); ?>
      <tr>
        <td>
          <?php if ($post['is_pinned']): ?><span class="badge badge--pending">공지</span><?php endif; ?>
          <?= h($post['title']) ?>
        </td>
        <td><?= h($publishDate) ?></td>
        <td><?= number_format((int) $post['view_count']) ?></td>
        <td>
          <?php if (!$post['is_published']): ?>
            <span class="badge badge--off">비공개</span>
          <?php elseif ($publishDate > $today): ?>
            <span class="badge badge--done">예약</span>
          <?php else: ?>
            <span class="badge badge--on">공개</span>
          <?php endif; ?>
        </td>
        <td>
          <a href="<?= h(admin_url('community/edit.php?id=' . $post['id'])) ?>" class="btn btn--small">수정</a>
          <form method="post" action="<?= h(admin_url('community/toggle-published.php')) ?>" style="display:inline;">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $post['id'] ?>">
            <input type="hidden" name="return" value="<?= h($queryString) ?>">
            <button type="submit" class="btn btn--small"><?= $post['is_published'] ? '비공개로' : '공개로' ?></button>
          </form>
          <form method="post" action="<?= h(admin_url('community/delete.php')) ?>" style="display:inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $post['id'] ?>">
            <input type="hidden" name="return" value="<?= h($queryString) ?>">
            <button type="submit" class="btn btn--small btn--danger">삭제</button>
          </form>
        </td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
</div>

<?php if ($totalPages > 1): ?>
<nav class="pagination" aria-label="페이지">
  <?php for ($p = 1; $p <= $totalPages; $p++): ?>
    <?php if ($p === $page): ?>
      <span class="pagination__current" aria-current="page"><?= $p ?></span>
    <?php else: ?>
      <a href="<?= h(admin_url('community/index.php?' . http_build_query($filterQuery + ['page' => $p]))) ?>"><?= $p ?></a>
    <?php endif; ?>
  <?php endfor; ?>
</nav>
<?php endif; ?>
<?php
layout_footer();
