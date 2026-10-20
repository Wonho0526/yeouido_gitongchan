<?php

// MASTER-only. GET /api/statistics/ip-info.php?ips=1.2.3.4,5.6.7.8
// 세션 표에 뜬 접속 IP들이 "어떤 회선"에서 왔는지(가정용 ISP / 모바일 / 데이터센터)와,
// 검색봇을 자처한 접속이 진짜인지(역DNS 정방향 확인)를 돌려준다.
//
// 세션 목록(sessions.php)과 분리한 이유: 역DNS 조회는 느릴 수 있어서, 목록은 즉시
// 그리고 회선 정보만 뒤이어 채우게 하려는 것이다. 결과는 ip_lookups에 캐시된다.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/ip_intel.php';

require_role_api('MASTER');

// 권한 확인이 끝났으면 세션 파일 잠금을 놓는다. 역DNS 조회는 느릴 수 있는데, 잠금을
// 쥔 채로 오래 걸리면 같은 관리자의 다른 요청(대시보드의 나머지 패널)까지 줄줄이
// 대기하게 된다. 이 엔드포인트는 이후 세션에 아무것도 쓰지 않는다.
session_write_close();

$ips = array_filter(array_map('trim', explode(',', query_param('ips'))));
if (!$ips) {
    echo json_encode(['data' => []], JSON_UNESCAPED_UNICODE);
    exit;
}
// 한 번에 볼 수 있는 양(대시보드 한 페이지 = 20건)을 넘겨받지 않는다.
$ips = array_slice(array_values($ips), 0, 50);

$info = ip_intel_lookup($ips);

// 그 IP로 들어온 접속이 스스로 무슨 봇이라고 주장했는지(User-Agent 기준)를 함께 본다.
// 주장과 역DNS 확인 결과가 어긋나면 사칭 신호다.
$claimed = [];
if ($info) {
    $placeholders = [];
    $params = [];
    foreach (array_keys($info) as $i => $ip) {
        $placeholders[] = ':ip' . $i;
        $params['ip' . $i] = $ip;
    }
    $stmt = db()->prepare(
        'SELECT ip_address, bot_name
         FROM sessions
         WHERE ip_address IN (' . implode(', ', $placeholders) . ')
           AND is_bot = 1 AND bot_name IS NOT NULL
         ORDER BY started_at DESC'
    );
    $stmt->execute($params);
    foreach ($stmt->fetchAll() as $row) {
        // ORDER BY가 최신순이므로 IP마다 처음 만난 값(가장 최근 주장)만 남긴다.
        $claimed[$row['ip_address']] ??= $row['bot_name'];
    }
}

$verifiableBots = array_keys(ip_verifiable_bots());

$data = [];
foreach ($info as $ip => $row) {
    $claimedBot = $claimed[$ip] ?? null;

    if ($row['botVerified'] !== null) {
        $botStatus = 'verified';
    } elseif ($claimedBot !== null && in_array($claimedBot, $verifiableBots, true)) {
        // 진짜 검색봇이라면 역DNS로 확인돼야 한다. 확인이 안 되면 사칭이거나
        // (드물게) 서버에서 DNS 조회가 막힌 경우다 - 화면에서 단정하지 않고 알린다.
        $botStatus = 'unverified';
    } else {
        $botStatus = 'none';
    }

    $data[$ip] = [
        'hostname' => $row['hostname'],
        'networkCode' => $row['networkCode'],
        'networkLabel' => $row['networkLabel'],
        'botVerified' => $row['botVerified'],
        'claimedBot' => $claimedBot,
        'botStatus' => $botStatus,
    ];
}

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
