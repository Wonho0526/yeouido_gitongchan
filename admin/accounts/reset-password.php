<?php

require __DIR__ . '/../includes/bootstrap.php';

require_role('MASTER');

if (!is_post()) {
    redirect(admin_url('accounts/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$stmt = db()->prepare('SELECT id FROM admins WHERE id = :id');
$stmt->execute(['id' => $id]);

if ($stmt->fetch()) {
    $tempPassword = generate_temp_password();
    db()->prepare('UPDATE admins SET password_hash = :hash WHERE id = :id')->execute([
        'hash' => password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]),
        'id' => $id,
    ]);
    flash_set('success', "임시 비밀번호가 발급되었습니다: {$tempPassword} — 이 화면을 벗어나면 다시 확인할 수 없으니 지금 전달해주세요.");
}

redirect(admin_url('accounts/index.php'));
