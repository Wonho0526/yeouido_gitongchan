<?php

require __DIR__ . '/../includes/bootstrap.php';

require_login();

if (!is_post()) {
    redirect(admin_url('community/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$return = post('return');

db()->prepare('UPDATE community_posts SET is_published = NOT is_published WHERE id = :id')->execute(['id' => $id]);

redirect(admin_url('community/index.php' . ($return !== '' ? '?' . $return : '')));
