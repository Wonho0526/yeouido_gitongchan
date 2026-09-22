<?php

require __DIR__ . '/../includes/bootstrap.php';

require_login();

if (!is_post()) {
    redirect(admin_url('community/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$return = post('return');

$stmt = db()->prepare('SELECT cover_image_path FROM community_posts WHERE id = :id');
$stmt->execute(['id' => $id]);
$post = $stmt->fetch();

if ($post) {
    db()->prepare('DELETE FROM community_posts WHERE id = :id')->execute(['id' => $id]);
    delete_uploaded_image($post['cover_image_path'], 'community');
    flash_set('success', '게시글이 삭제되었습니다.');
}

redirect(admin_url('community/index.php' . ($return !== '' ? '?' . $return : '')));
