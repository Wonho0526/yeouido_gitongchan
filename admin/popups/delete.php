<?php

require __DIR__ . '/../includes/bootstrap.php';

require_login();

if (!is_post()) {
    redirect(admin_url('popups/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$return = post('return');

$stmt = db()->prepare('SELECT * FROM popups WHERE id = :id');
$stmt->execute(['id' => $id]);
$popup = $stmt->fetch();

if ($popup) {
    db()->prepare('DELETE FROM popups WHERE id = :id')->execute(['id' => $id]);
    delete_popup_image($popup['pc_image_path']);
    delete_popup_image($popup['mobile_image_path']);
    flash_set('success', '팝업이 삭제되었습니다.');
}

redirect(admin_url('popups/index.php' . ($return !== '' ? '?' . $return : '')));
