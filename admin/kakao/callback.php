<?php

require __DIR__ . '/../includes/bootstrap.php';
require_feature('kakao');
require __DIR__ . '/../includes/kakao.php';

$admin = require_role('MASTER');

$error = query_param('error');
$code = query_param('code');

if ($error !== '') {
    flash_set('error', '카카오 연동이 취소되었습니다. (error=' . $error . ')');
} elseif ($code === '') {
    flash_set('error', '카카오로부터 인가 코드(code)를 받지 못했습니다.');
} else {
    $exchangeError = kakao_exchange_code($code);
    if ($exchangeError !== null) {
        // TEMPORARY: showing Kakao's raw error response to the admin to diagnose the KOE 오류.
        // MASTER-only page, so no sensitive exposure — safe to revert to a generic message once fixed.
        flash_set('error', '카카오 연동에 실패했습니다: ' . $exchangeError);
    } else {
        flash_set('success', '카카오톡 연동이 완료되었습니다.');
    }
}

redirect(admin_url('kakao/index.php'));
