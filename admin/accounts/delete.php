<?php

require __DIR__ . '/../includes/bootstrap.php';

require_role('MASTER');

if (!is_post()) {
    redirect(admin_url('accounts/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$stmt = db()->prepare('SELECT * FROM admins WHERE id = :id');
$stmt->execute(['id' => $id]);
$account = $stmt->fetch();

if ($account) {
    if ($account['role'] === 'MASTER') {
        $error = ensure_not_last_active_master($id, 'delete');
        if ($error) {
            flash_set('error', $error);
            redirect(admin_url('accounts/index.php'));
        }
    }
    db()->prepare('DELETE FROM admins WHERE id = :id')->execute(['id' => $id]);
    flash_set('success', '계정이 삭제되었습니다.');
}

redirect(admin_url('accounts/index.php'));
