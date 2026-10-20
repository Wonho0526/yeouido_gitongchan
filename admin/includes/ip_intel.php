<?php

// 접속 IP를 "어떤 회선에서 온 접속인가"로 해석하는 헬퍼.
//
// 외부 유료 DB나 API를 쓰지 않고 역DNS(PTR) 하나만 본다. 그래도 실용적인 이유는,
// User-Agent는 마음대로 위장할 수 있지만 "이 IP가 KT 가정용 회선인지 AWS 서버인지"는
// 위장하기 어렵기 때문이다. 병원 홈페이지에 데이터센터 IP로 들어오는 진짜 환자는 없다.
//
// !! 카페24(이 사이트의 호스팅)에서는 역DNS 조회 자체가 막혀 있다. 2026-09-08에 운영
// 서버에서 확인한 결과 gethostbyaddr / dns_get_record(PTR) / checkdnsrr 세 방법 모두
// 0~2ms 만에 즉시 실패했고(정방향 A 조회는 정상), 그래서 이 파일의 판정은 지금
// 운영에서는 결과를 내지 못한다. 그런 환경에서는 모든 IP를 '알 수 없음'으로 칠하는
// 대신 아예 아무 뱃지도 내보내지 않는다(ip_reverse_dns_available() 참고) — 틀린 정보를
// 보여 주느니 안 보여 주는 편이 낫다. 다른 호스팅으로 옮기면 그대로 동작한다.
//
// 세 가지 한계를 알고 써야 한다:
// 1) 국내 이동통신망을 비롯해 PTR 레코드가 아예 없는 대역이 많다 -> '알 수 없음'이며,
//    이건 "봇이다"라는 뜻이 절대 아니다.
// 2) 국내/해외 판별은 여기서 하지 않는다. 역DNS만으로는 신뢰할 수 없고(kornet.net처럼
//    .kr이 아닌 국내 ISP가 흔하다), 제대로 하려면 IP 대역 DB가 필요하다.
// 3) 자바스크립트를 실행하지 않는 크롤러/스캐너는 애초에 tracker.js에 잡히지 않으므로,
//    이 판정으로 "공격 시도"를 찾을 수는 없다. 그건 로그인 기록(logs/)이 볼 자리다.

/** 역DNS 결과를 다시 확인하기까지의 기간. 회선 종류는 잘 바뀌지 않는다. */
const IP_LOOKUP_TTL_DAYS = 30;

/** 한 요청에서 새로 DNS 조회할 IP 수 상한. DNS는 느려서 화면을 붙잡을 수 있다. */
const IP_LOOKUP_MAX_PER_REQUEST = 20;

/**
 * 호스트명(역DNS) 조각으로 회선 종류를 판정한다. 배열 순서가 곧 우선순위다.
 *
 * datacenter를 가장 먼저 두는 이유: 호스팅 업체 도메인이 ISP 이름을 함께 담는 경우가
 * 있어서(예: 카페24의 국내 회선), 더 구체적인 쪽을 먼저 잡아야 한다.
 */
function ip_network_rules(): array
{
    return [
        // --- 데이터센터 / 클라우드 / 호스팅 (= 사람이 앉아 있는 회선이 아니다) ---
        ['datacenter', '데이터센터/호스팅', [
            'amazonaws.com', 'compute.amazonaws.com', 'googleusercontent.com', 'cloudfront.net',
            'azure.com', 'cloudapp.net', 'azurewebsites.net', 'digitalocean.com', 'linode.com',
            'vultr.com', 'ovh.net', 'ovh.ca', 'hetzner.com', 'hetzner.de', 'contabo.net',
            'oraclecloud.com', 'aliyun.com', 'alibabacloud.com', 'myqcloud.com', 'tencent.com',
            'scaleway.com', 'leaseweb.com', 'choopa.net', 'hostwinds.com', 'ioflood.com',
            'colocrossing.com', 'quadranet.com', 'servers.com', 'upcloud.com', 'fastly.net',
            'cloudflare.com', 'zenlayer.com', 'datacamp.co.uk', 'm247.com',
            // 국내 호스팅/IDC
            'cafe24.com', 'gabia.com', 'ncloud.com', 'navercorp.com', 'kinx.net', 'iwinv.net',
            'smileserv.com', 'hostway.co.kr', 'dacom.net', 'sme-cloud.com',
        ]],
        // --- 모바일(이동통신) 회선 ---
        ['mobile', '모바일 회선', [
            'lte.kt.com', 'mobile.kt.com', 'ktfwibro.co.kr', 'nate.com', 'sktelecom.com',
            'mobile.lguplus.co.kr', '.lte.', '.mobile.', 'cellular',
        ]],
        // --- 기관 / 학교 ---
        ['institution', '기관/학교', ['.go.kr', '.ac.kr', '.re.kr', '.mil.kr', '.edu']],
        // --- 가정용 / 일반 ISP (국내 3사 + 케이블) ---
        ['residential', '가정용/일반 ISP', [
            'kornet.net', 'kt.com', 'megapass.net', 'skbroadband.com', 'hananet.net',
            'bora.net', 'lguplus.co.kr', 'lgtelecom.com', 'xpeed.com', 'dreamx.com',
            'tbroad.com', 'dlive.kr', 'hcn.co.kr', 'cjhv.net', 'ktis.co.kr',
            // 해외 소비자 ISP에서도 사람은 들어온다(교민/여행 등)
            'comcast.net', 'verizon.net', 'att.net', 'virginm.net', 'btcentralplus.com',
            'ocn.ne.jp', 'plala.or.jp', 'dion.ne.jp', 'so-net.ne.jp',
        ]],
    ];
}

/**
 * 정방향 확인(FCrDNS)까지 할 수 있는 검색봇의 PTR 도메인.
 * 구글이 공식 안내하는 "구글봇 확인" 절차가 이것이다: 역DNS로 나온 이름이 이 도메인이고,
 * 그 이름을 다시 정방향 조회했을 때 원래 IP로 돌아오면 진짜다.
 */
function ip_verifiable_bots(): array
{
    return [
        '구글봇' => ['googlebot.com', 'google.com', 'googleusercontent.com'],
        '빙봇' => ['search.msn.com'],
        '네이버 예티' => ['naver.com', 'navercorp.com'],
        '다음봇' => ['daum.net', 'daumcdn.net'],
        '얀덱스봇' => ['yandex.com', 'yandex.ru', 'yandex.net'],
        'Applebot' => ['applebot.apple.com', 'apple.com'],
        '덕덕고' => ['duckduckgo.com'],
        'PetalBot' => ['petalsearch.com', 'aspiegel.com'],
    ];
}

/** 호스트명이 도메인 자체이거나 그 하위인지. 'notgoogle.com'이 'google.com'에 걸리지 않게 한다. */
function ip_host_matches_domain(string $host, string $domain): bool
{
    return $host === $domain || str_ends_with($host, '.' . $domain);
}

/** 역DNS 호스트명으로 회선 종류를 판정해 [코드, 라벨]을 돌려준다. */
function ip_classify_network(?string $hostname): array
{
    if ($hostname === null || $hostname === '') {
        return ['unknown', '알 수 없음'];
    }
    $host = strtolower($hostname);

    foreach (ip_network_rules() as [$code, $label, $needles]) {
        foreach ($needles as $needle) {
            // '.lte.' 처럼 점으로 시작하는 조각은 부분 일치, 나머지는 도메인 단위로 본다.
            $hit = str_starts_with($needle, '.')
                ? str_contains($host, $needle)
                : ip_host_matches_domain($host, $needle);
            if ($hit) {
                return [$code, $label];
            }
        }
    }

    // 이름은 있는데 아는 도메인이 아니다. 크롤러 인프라는 호스트명에 스스로를 드러내는
    // 경우가 많아(crawl-66-249-66-1.googlebot.com 등) 그 흔적만 따로 잡는다.
    if (preg_match('/crawl|spider|bot\.|scan|proxy|vpn|tor-exit|torexit/i', $host)) {
        return ['datacenter', '크롤러/프록시 추정'];
    }
    return ['unknown', '알 수 없음'];
}

/**
 * PTR 이름이 검색봇 도메인이면 정방향 조회로 확인한 뒤 봇 이름을 돌려준다.
 * 정방향이 원래 IP와 다르면(=사칭) null.
 */
function ip_verify_search_bot(string $ip, ?string $hostname): ?string
{
    if ($hostname === null || $hostname === '') {
        return null;
    }
    $host = strtolower($hostname);

    foreach (ip_verifiable_bots() as $label => $domains) {
        foreach ($domains as $domain) {
            if (!ip_host_matches_domain($host, $domain)) {
                continue;
            }
            // IPv6는 gethostbyname으로 확인할 수 없어 판정을 보류한다(사칭으로 몰지 않는다).
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return null;
            }
            return gethostbyname($host) === $ip ? $label : null;
        }
    }
    return null;
}

/**
 * 이 서버에서 역DNS(PTR) 조회가 되는지. 요청당 한 번만 확인한다.
 *
 * 공유 호스팅 중에는 PTR 조회를 막아 둔 곳이 있다(카페24가 그렇다). 실패는 타임아웃이
 * 아니라 즉시 돌아오므로 이 확인 자체는 거의 공짜다. 되지 않는 서버에서는 새 조회를
 * 아예 시도하지 않아, 화면에 '알 수 없음' 뱃지만 가득 차는 일을 막는다.
 */
function ip_reverse_dns_available(): bool
{
    static $available = null;
    if ($available === null) {
        // 8.8.8.8은 PTR(dns.google)이 항상 있는 IP라 카나리아로 쓰기 좋다.
        $available = @gethostbyaddr('8.8.8.8') !== '8.8.8.8';
    }
    return $available;
}

/** IP 하나를 실제로 조회한다(역DNS + 분류 + 봇 확인). DNS가 걸리는 유일한 지점. */
function ip_resolve(string $ip): array
{
    // gethostbyaddr는 PTR이 없으면 입력한 IP를 그대로 돌려준다(에러가 아니다).
    $resolved = @gethostbyaddr($ip);
    $hostname = ($resolved === false || $resolved === $ip) ? null : $resolved;

    [$code, $label] = ip_classify_network($hostname);
    $botVerified = ip_verify_search_bot($ip, $hostname);
    if ($botVerified !== null) {
        // 확인된 검색봇은 회선 종류보다 이 사실이 중요하다.
        $code = 'datacenter';
        $label = '검색엔진 봇';
    }

    return [
        'hostname' => $hostname,
        'network_code' => $code,
        'network_label' => $label,
        'bot_verified' => $botVerified,
    ];
}

/**
 * IP 목록을 캐시(ip_lookups)에서 읽고, 없거나 오래된 것만 새로 조회해 채운다.
 * 반환값은 ip => ['hostname','networkCode','networkLabel','botVerified'] 맵.
 *
 * 새 조회는 IP_LOOKUP_MAX_PER_REQUEST개로 끊는다. DNS 응답이 느린 IP가 섞이면
 * 화면 전체가 그만큼 늦어지므로, 못 채운 IP는 다음 호출에서 채워진다.
 */
function ip_intel_lookup(array $ips): array
{
    $ips = array_values(array_unique(array_filter(
        array_map('trim', $ips),
        fn(string $ip): bool => filter_var($ip, FILTER_VALIDATE_IP) !== false
    )));
    if (!$ips) {
        return [];
    }

    $placeholders = [];
    $params = [];
    foreach ($ips as $i => $ip) {
        $placeholders[] = ':ip' . $i;
        $params['ip' . $i] = $ip;
    }

    $stmt = db()->prepare(
        'SELECT ip_address, hostname, network_code, network_label, bot_verified, checked_at
         FROM ip_lookups WHERE ip_address IN (' . implode(', ', $placeholders) . ')'
    );
    $stmt->execute($params);

    $cached = [];
    foreach ($stmt->fetchAll() as $row) {
        $cached[$row['ip_address']] = $row;
    }

    $staleBefore = (new DateTimeImmutable('-' . IP_LOOKUP_TTL_DAYS . ' days'))->format('Y-m-d H:i:s');
    $result = [];
    $budget = IP_LOOKUP_MAX_PER_REQUEST;

    $insert = db()->prepare(
        'INSERT INTO ip_lookups (ip_address, hostname, network_code, network_label, bot_verified, checked_at)
         VALUES (:ip, :hostname, :code, :label, :bot, NOW())
         ON DUPLICATE KEY UPDATE hostname = VALUES(hostname), network_code = VALUES(network_code),
                                 network_label = VALUES(network_label), bot_verified = VALUES(bot_verified),
                                 checked_at = NOW()'
    );

    foreach ($ips as $ip) {
        $row = $cached[$ip] ?? null;
        $isFresh = $row !== null && $row['checked_at'] >= $staleBefore;

        if (!$isFresh && $budget > 0 && ip_reverse_dns_available()) {
            $budget--;
            $row = ip_resolve($ip);
            $insert->execute([
                'ip' => $ip,
                'hostname' => $row['hostname'],
                'code' => $row['network_code'],
                'label' => $row['network_label'],
                'bot' => $row['bot_verified'],
            ]);
        }
        if ($row === null) {
            // 캐시에 없고 이번에 조회도 못 했다(예산 소진 또는 이 서버에서 PTR 불가).
            // 빈 채로 두면 화면에 뱃지가 안 뜰 뿐, 잘못된 정보가 뜨지는 않는다.
            continue;
        }

        $result[$ip] = [
            'hostname' => $row['hostname'],
            'networkCode' => $row['network_code'],
            'networkLabel' => $row['network_label'],
            'botVerified' => $row['bot_verified'],
        ];
    }

    return $result;
}
