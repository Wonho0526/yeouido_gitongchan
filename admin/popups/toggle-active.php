<?php

require __DIR__ . '/../includes/bootstrap.php';

require_login();

if (!is_post()) {
    redirect(admin_url('popups/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$return = post('return');

db()->prepare('UPDATE popups SET is_active = NOT is_active WHERE id = :id')->execute(['id' => $id]);

redirect(admin_url('popups/index.php' . ($return !== '' ? '?' . $return : '')));
