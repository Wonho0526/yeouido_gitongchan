<?php

// One-time seed script — creates the initial MASTER/ADMIN accounts.
// Run once after applying schema.sql, then DELETE this file from the server.
// Guarded so it refuses to run if any admin already exists.
//
// Passwords are generated on the server and shown once, never written here: this
// repository is public, so any password committed in this file would be public too.

require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/auth.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

$count = (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
if ($count > 0) {
    exit('이미 계정이 존재합니다. 이 파일은 최초 1회만 사용하며, 이후에는 삭제해야 합니다.');
}

if (($_GET['confirm'] ?? '') !== 'yes') {
    exit('시드 계정을 생성하려면 URL 끝에 ?confirm=yes 를 붙여 다시 접속하세요. 완료 후 이 파일(setup.php)을 서버에서 반드시 삭제하세요.');
}

$seedAccounts = [
    ['username' => 'admin', 'name' => '최고관리자', 'role' => 'MASTER'],
    ['username' => 'gitongchan', 'name' => '여의도기통찬의원', 'role' => 'ADMIN'],
];

$stmt = db()->prepare('INSERT INTO admins (username, password_hash, name, role) VALUES (:username, :hash, :name, :role)');
foreach ($seedAccounts as &$account) {
    $account['password'] = generate_temp_password();
    $stmt->execute([
        'username' => $account['username'],
        'hash' => password_hash($account['password'], PASSWORD_BCRYPT, ['cost' => 12]),
        'name' => $account['name'],
        'role' => $account['role'],
    ]);
}
unset($account);

echo "시드 계정이 생성되었습니다. 아래 비밀번호는 지금 한 번만 표시되니 바로 기록하세요.\n";
echo "로그인 후 '내 정보'에서 비밀번호를 변경하고, 이 파일(setup.php)을 서버에서 즉시 삭제하세요.\n\n";
foreach ($seedAccounts as $account) {
    echo "- {$account['username']} / {$account['password']} ({$account['role']})\n";
}
