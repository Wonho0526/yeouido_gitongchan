<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

$errors = [];

if (is_post()) {
    verify_csrf_or_403();

    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmNewPassword = $_POST['confirm_new_password'] ?? '';

    $stmt = db()->prepare('SELECT password_hash FROM admins WHERE id = :id');
    $stmt->execute(['id' => $admin['id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
        $errors[] = '현재 비밀번호가 올바르지 않습니다.';
    }
    if ($err = validate_password($newPassword)) {
        $errors[] = $err;
    }
    if ($newPassword !== $confirmNewPassword) {
        $errors[] = '새 비밀번호가 일치하지 않습니다.';
    }
    if (!$errors && $currentPassword === $newPassword) {
        $errors[] = '새 비밀번호는 현재 비밀번호와 달라야 합니다.';
    }

    if (!$errors) {
        db()->prepare('UPDATE admins SET password_hash = :hash WHERE id = :id')->execute([
            'hash' => password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]),
            'id' => $admin['id'],
        ]);
        flash_set('success', '비밀번호가 변경되었습니다.');
        redirect(admin_url('my-info/index.php'));
    }
}

layout_header('내 정보', $admin);
?>
<table style="max-width:480px;margin-bottom:24px;">
  <tbody>
    <tr><th style="width:120px;">이름</th><td><?= h($admin['name']) ?></td></tr>
    <tr><th>아이디</th><td><?= h($admin['username']) ?></td></tr>
    <tr><th>권한</th><td><?= h($admin['role']) ?></td></tr>
    <tr><th>가입일</th><td><?= h($admin['created_at']) ?></td></tr>
  </tbody>
</table>

<h2 style="font-size:16px;">비밀번호 변경</h2>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post" style="max-width:360px;">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="current_password">현재 비밀번호</label>
    <input type="password" id="current_password" name="current_password" required>
  </div>
  <div class="form-row">
    <label for="new_password">새 비밀번호</label>
    <input type="password" id="new_password" name="new_password" required>
    <p class="hint">8자 이상, 영문과 숫자 포함</p>
  </div>
  <div class="form-row">
    <label for="confirm_new_password">새 비밀번호 확인</label>
    <input type="password" id="confirm_new_password" name="confirm_new_password" required>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary">변경</button>
  </div>
</form>
<?php
layout_footer();
