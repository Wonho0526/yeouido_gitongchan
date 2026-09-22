<?php

const ADMIN_BRAND = '여의도기통찬의원 관리자';

function layout_header(string $title, ?array $admin): void
{
    $flash = flash_get();
    ?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= h($title) ?> — <?= h(ADMIN_BRAND) ?></title>
<link rel="icon" href="<?= h(admin_url('../favicon.ico')) ?>" sizes="any">
<link rel="stylesheet" href="<?= h(admin_url('assets/admin.css')) ?>">
</head>
<body>
<?php if ($admin): ?>
<header class="admin-nav">
    <div class="admin-nav__brand"><a href="<?= h(admin_url('index.php')) ?>"><?= h(ADMIN_BRAND) ?></a></div>
    <nav>
        <a href="<?= h(admin_url('community/index.php')) ?>">커뮤니티 관리</a>
        <a href="<?= h(admin_url('popups/index.php')) ?>">팝업 관리</a>
        <?php if (feature_enabled('consultations')): ?>
        <a href="<?= h(admin_url('consultations/index.php')) ?>">상담 신청 관리</a>
        <?php endif; ?>
        <?php if ($admin['role'] === 'MASTER'): ?>
        <a href="<?= h(admin_url('accounts/index.php')) ?>">계정 관리</a>
        <?php if (feature_enabled('kakao')): ?>
        <a href="<?= h(admin_url('kakao/index.php')) ?>">카카오톡 알림 설정</a>
        <?php endif; ?>
        <?php endif; ?>
        <a href="<?= h(admin_url('my-info/index.php')) ?>">내 정보</a>
    </nav>
    <div class="admin-nav__user">
        <span><?= h($admin['name']) ?>님 (<?= h($admin['role']) ?>)</span>
        <form method="post" action="<?= h(admin_url('logout.php')) ?>" class="admin-nav__logout">
            <?= csrf_field() ?>
            <button type="submit">로그아웃</button>
        </form>
    </div>
</header>
<?php endif; ?>
<main class="admin-main">
<?php if ($flash): ?>
    <div class="flash flash--<?= h($flash['type']) ?>"><?= h($flash['message']) ?></div>
<?php endif; ?>
    <h1><?= h($title) ?></h1>
<?php
}

function layout_footer(): void
{
    ?>
</main>
</body>
</html>
<?php
}
