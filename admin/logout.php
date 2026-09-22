<?php

require __DIR__ . '/includes/bootstrap.php';

if (is_post()) {
    verify_csrf_or_403();
    logout();
}
redirect(admin_url('login.php'));
