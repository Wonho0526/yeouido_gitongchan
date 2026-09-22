<?php

require __DIR__ . '/../includes/bootstrap.php';
require_feature('consultations');

require_login();

if (!is_post()) {
    redirect(admin_url('consultations/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');

$stmt = db()->prepare('SELECT id FROM consultations WHERE id = :id');
$stmt->execute(['id' => $id]);
$consultation = $stmt->fetch();

if ($consultation) {
    db()->prepare('DELETE FROM consultations WHERE id = :id')->execute(['id' => $id]);
    flash_set('success', '상담 신청이 삭제되었습니다.');
}

redirect(admin_url('consultations/index.php'));
