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
    if ($account['is_active'] && $account['role'] === 'MASTER') {
        $error = ensure_not_last_active_master($id, 'deactivate');
        if ($error) {
            flash_set('error', $error);
            redirect(admin_url('accounts/index.php'));
        }
    }
    db()->prepare('UPDATE admins SET is_active = NOT is_active WHERE id = :id')->execute(['id' => $id]);
}

redirect(admin_url('accounts/index.php'));
