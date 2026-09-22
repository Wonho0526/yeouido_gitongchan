<?php

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/layout.php';

if (current_admin()) {
    redirect('index.php');
}

$error = null;

if (is_post()) {
    verify_csrf_or_403();
    $username = post('username');
    $password = $_POST['password'] ?? '';
    $staySignedIn = isset($_POST['stay_signed_in']);

    if ($username === '' || $password === '') {
        $error = '아이디와 비밀번호를 입력해주세요.';
    } else {
        $error = attempt_login($username, $password, $staySignedIn);
        if ($error === null) {
            $redirectTo = query_param('redirect');
            redirect($redirectTo !== '' ? $redirectTo : admin_url('index.php'));
        }
    }
}

layout_header('로그인', null);
?>
<div class="login-page">
  <div class="login-box">
    <h1><?= h(ADMIN_BRAND) ?></h1>
    <?php if ($error): ?>
      <p class="form-error"><?= h($error) ?></p>
    <?php endif; ?>
    <form method="post" action="<?= h(admin_url('login.php')) ?><?= isset($_GET['redirect']) ? '?redirect=' . h($_GET['redirect']) : '' ?>">
      <?= csrf_field() ?>
      <div class="form-row">
        <label for="username">아이디</label>
        <input type="text" id="username" name="username" autocomplete="username" required autofocus>
      </div>
      <div class="form-row">
        <label for="password">비밀번호</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <div class="form-row checkbox-row">
        <input type="checkbox" id="stay_signed_in" name="stay_signed_in">
        <label for="stay_signed_in" style="margin:0;font-weight:400;">로그인 상태 유지 (14일)</label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn--primary" style="width:100%;">로그인</button>
      </div>
    </form>
  </div>
</div>
<?php
layout_footer();
