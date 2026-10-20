<?php

// One-time schema runner — applies schema.sql to the database named in config.php.
// Use this when the host's own DB tool (phpMyAdmin etc.) is awkward to reach.
// Run once, then DELETE both this file and schema.sql from the server.
//
// Safe to run more than once: every statement in schema.sql is
// CREATE TABLE IF NOT EXISTS, so existing tables and their rows are untouched.
// Nothing here drops or alters anything.

require __DIR__ . '/includes/db.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

$schemaPath = __DIR__ . '/schema.sql';
if (!is_file($schemaPath)) {
    http_response_code(500);
    exit("schema.sql이 없습니다. 이 파일과 같은 폴더(admin/)에 schema.sql을 올려주세요.\n");
}

if (($_GET['confirm'] ?? '') !== 'yes') {
    echo "데이터베이스에 관리자 시스템 테이블을 생성합니다.\n";
    echo "실행하려면 URL 끝에 ?confirm=yes 를 붙여 다시 접속하세요.\n\n";
    echo "CREATE TABLE IF NOT EXISTS만 실행하므로, 이미 있는 테이블과\n";
    echo "그 안의 데이터는 건드리지 않습니다. 삭제나 변경은 하지 않습니다.\n";
    exit;
}

// Strip `-- ...` comments, then split on `;`. schema.sql holds no stored routines
// and no semicolons inside string literals, so splitting this way is safe here.
$sql = preg_replace('/^\s*--.*$/m', '', (string) file_get_contents($schemaPath));
$statements = array_values(array_filter(
    array_map('trim', explode(';', $sql)),
    static fn(string $s): bool => $s !== ''
));

if ($statements === []) {
    http_response_code(500);
    exit("schema.sql에서 실행할 문장을 찾지 못했습니다.\n");
}

$pdo = db();

echo "데이터베이스 : " . app_config()['db']['name'] . "\n";
echo "서버         : " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
echo "실행할 문장  : " . count($statements) . "개\n\n";

foreach ($statements as $statement) {
    $label = preg_match('/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i', $statement, $m) === 1
        ? 'CREATE TABLE ' . $m[1]
        : trim((string) preg_replace('/\s+/', ' ', substr($statement, 0, 40)));

    try {
        $pdo->exec($statement);
        echo "  OK     {$label}\n";
    } catch (PDOException $e) {
        echo "  실패   {$label}\n";
        echo "         " . $e->getMessage() . "\n\n";
        http_response_code(500);
        exit("중단되었습니다. 위 오류 메시지를 확인하세요.\n");
    }
}

// Report what the database actually holds now, rather than assuming the run worked.
$expected = [
    // 관리자 시스템 기본
    'admins', 'community_posts', 'consultations', 'login_logs', 'popups',
    // 방문통계
    'sites', 'site_domains', 'visitors', 'sessions', 'page_views', 'events', 'ip_lookups',
];
$actual = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
sort($actual);

echo "\n현재 테이블 (" . count($actual) . "개)\n";
foreach ($actual as $table) {
    $rows = (int) $pdo->query('SELECT COUNT(*) FROM `' . $table . '`')->fetchColumn();
    echo sprintf("  %-18s %d행\n", $table, $rows);
}

$missing = array_values(array_diff($expected, $actual));
if ($missing !== []) {
    echo "\n누락된 테이블: " . implode(', ', $missing) . "\n";
    http_response_code(500);
    exit("스키마가 완전히 적용되지 않았습니다.\n");
}

echo "\n필요한 테이블 " . count($expected) . "개가 모두 준비되었습니다.\n\n";
echo "다음 순서로 진행하세요.\n";
echo "  1. 이 파일(migrate.php)과 schema.sql을 서버에서 삭제합니다.\n";
echo "  2. 관리자 계정이 아직 없다면(최초 설치) setup.php?confirm=yes 로 생성한 뒤\n";
echo "     setup.php도 삭제합니다. 이미 쓰고 있다면 건너뜁니다.\n";
echo "  3. 방문통계를 쓰려면 MASTER로 로그인해 '사이트 관리'에서 사이트를 등록합니다.\n";
