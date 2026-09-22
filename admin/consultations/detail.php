<?php

require __DIR__ . '/../includes/bootstrap.php';
require_feature('consultations');
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

$id = (int) query_param('id');
$stmt = db()->prepare('SELECT * FROM consultations WHERE id = :id');
$stmt->execute(['id' => $id]);
$consultation = $stmt->fetch();
if (!$consultation) {
    http_response_code(404);
    exit('상담 신청을 찾을 수 없습니다.');
}

$errors = [];

if (is_post()) {
    verify_csrf_or_403();

    $status = in_array(post('status'), ['예약완료', '상담완료'], true) ? post('status') : '상담전';
    $memo = $_POST['memo'] ?? '';
    if (mb_strlen($memo) > 2000) {
        $errors[] = '메모는 2000자 이하로 입력해주세요.';
    }

    if (!$errors) {
        db()->prepare('UPDATE consultations SET status = :status, memo = :memo WHERE id = :id')->execute([
            'status' => $status,
            'memo' => $memo !== '' ? $memo : null,
            'id' => $id,
        ]);
        flash_set('success', '저장되었습니다.');
        redirect(admin_url('consultations/detail.php?id=' . $id));
    }
}

$stmt = db()->prepare('SELECT * FROM consultations WHERE id = :id');
$stmt->execute(['id' => $id]);
$consultation = $stmt->fetch();

layout_header('상담 신청 상세', $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<table style="max-width:560px;margin-bottom:20px;">
  <tbody>
    <tr><th style="width:100px;">이름</th><td><?= h($consultation['name']) ?></td></tr>
    <tr><th>연락처</th><td><?= h($consultation['phone']) ?></td></tr>
    <tr><th>신청일시</th><td><?= h($consultation['date']) ?></td></tr>
    <tr><th>상담 내용</th><td style="white-space:pre-wrap;"><?= h($consultation['content']) ?></td></tr>
  </tbody>
</table>

<form id="consultation-form" method="post" style="max-width:560px;">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="status">상태</label>
    <select id="status" name="status">
      <option value="상담전" <?= $consultation['status'] === '상담전' ? 'selected' : '' ?>>상담전</option>
      <option value="상담완료" <?= $consultation['status'] === '상담완료' ? 'selected' : '' ?>>상담완료</option>
      <option value="예약완료" <?= $consultation['status'] === '예약완료' ? 'selected' : '' ?>>예약완료</option>
    </select>
  </div>
  <div class="form-row">
    <label for="memo">메모</label>
    <textarea id="memo" name="memo" rows="5" maxlength="2000"><?= h($consultation['memo']) ?></textarea>
  </div>
</form>
<div class="form-actions" style="max-width:560px;">
  <button type="submit" form="consultation-form" class="btn btn--primary">저장</button>
  <a href="<?= h(admin_url('consultations/index.php')) ?>" class="btn">목록으로</a>
  <form method="post" action="<?= h(admin_url('consultations/delete.php')) ?>" style="display:inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) $consultation['id'] ?>">
    <button type="submit" class="btn btn--danger">삭제</button>
  </form>
</div>
<?php
layout_footer();
