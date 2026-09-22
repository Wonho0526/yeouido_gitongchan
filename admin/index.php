<?php

require __DIR__ . '/includes/bootstrap.php';

require_login();
redirect(admin_url(feature_enabled('consultations') ? 'consultations/index.php' : 'community/index.php'));
