<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$errors = [];
$values = ['username' => '', 'name' => '', 'role' => 'ADMIN'];

if (is_post()) {
    verify_csrf_or_403();

    $values['username'] = post('username');
    $values['name'] = post('name');
    $values['role'] = post('role') === 'MASTER' ? 'MASTER' : 'ADMIN';
    $password = $_POST['password'] ?? '';

    if ($err = validate_username($values['username'])) {
        $errors[] = $err;
    }
    if ($err = validate_name($values['name'])) {
        $errors[] = $err;
    }
    if ($err = validate_password($password)) {
        $errors[] = $err;
    }

    if (!$errors) {
        try {
            $stmt = db()->prepare(
                'INSERT INTO admins (username, password_hash, name, role) VALUES (:username, :hash, :name, :role)'
            );
            $stmt->execute([
                'username' => $values['username'],
                'hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
                'name' => $values['name'],
                'role' => $values['role'],
            ]);
            flash_set('success', '계정이 생성되었습니다.');
            redirect(admin_url('accounts/index.php'));
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                $errors[] = '이미 사용 중인 아이디입니다.';
            } else {
                throw $e;
            }
        }
    }
}

layout_header('새 계정', $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="username">아이디</label>
    <input type="text" id="username" name="username" value="<?= h($values['username']) ?>" required>
    <p class="hint">소문자로 시작하는 영문 소문자/숫자/밑줄 3~20자. 생성 후 변경할 수 없습니다.</p>
  </div>
  <div class="form-row">
    <label for="password">비밀번호</label>
    <input type="password" id="password" name="password" required>
    <p class="hint">8자 이상, 영문과 숫자 포함</p>
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
    <button type="submit" class="btn btn--primary">생성</button>
    <a href="<?= h(admin_url('accounts/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
layout_footer();
