<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$id = (int) query_param('id');
$stmt = db()->prepare('SELECT * FROM admins WHERE id = :id');
$stmt->execute(['id' => $id]);
$account = $stmt->fetch();
if (!$account) {
    http_response_code(404);
    exit('계정을 찾을 수 없습니다.');
}

$errors = [];
$values = ['name' => $account['name'], 'role' => $account['role']];

if (is_post()) {
    verify_csrf_or_403();

    $values['name'] = post('name');
    $values['role'] = post('role') === 'MASTER' ? 'MASTER' : 'ADMIN';

    if ($err = validate_name($values['name'])) {
        $errors[] = $err;
    }

    if (!$errors && $account['role'] === 'MASTER' && $values['role'] !== 'MASTER') {
        if ($err = ensure_not_last_active_master($id, 'role_change')) {
            $errors[] = $err;
        }
    }

    if (!$errors) {
        db()->prepare('UPDATE admins SET name = :name, role = :role WHERE id = :id')
            ->execute(['name' => $values['name'], 'role' => $values['role'], 'id' => $id]);
        flash_set('success', '계정이 수정되었습니다.');
        redirect(admin_url('accounts/index.php'));
    }
}

layout_header('계정 수정', $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post">
  <?= csrf_field() ?>
  <div class="form-row">
    <label>아이디</label>
    <input type="text" value="<?= h($account['username']) ?>" disabled>
  </div>
  <div class="form-row">
    <label for="name">이름</label>
    <input type="text" id="name" name="name" value="<?= h($values['name']) ?>" required>
  </div>
  <div class="form-row">
    <label for="role">권한</label>
    <select id="role" name="role">
      <option value="ADMIN" <?= $values['role'] === 'ADMIN' ? 'selected' : '' ?>>ADMIN</option>
      <option value="MASTER" <?= $values['role'] === 'MASTER' ? 'selected' : '' ?>>MASTER</option>
    </select>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary">저장</button>
    <a href="<?= h(admin_url('accounts/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
layout_footer();
