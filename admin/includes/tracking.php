<?php

// Shared helpers for the visitor-analytics feature: User-Agent sniffing and
// referrer classification. Used by api/public/track.php (writes) and the
// api/statistics/* endpoints (reads, for display labels). Plain regex-based
// detection — no Composer dependency is available on the cafe24 shared host.

/** PC / Mobile / Tablet. iPadOS 13+ reports as "Macintosh" and can't be told
 *  apart from a real Mac by User-Agent alone — that's a known limitation. */
function detect_device(string $ua): string
{
    if (preg_match('/iPad|Android(?!.*Mobile)|Tablet/i', $ua)) {
        return 'Tablet';
    }
    if (preg_match('/Mobi|iPhone|iPod|Android|Windows Phone/i', $ua)) {
        return 'Mobile';
    }
    return 'PC';
}

function detect_os(string $ua): string
{
    if (preg_match('/Windows/i', $ua)) {
        return 'Windows';
    }
    if (preg_match('/Mac OS X|Macintosh/i', $ua)) {
        return 'macOS';
    }
    if (preg_match('/Android/i', $ua)) {
        return 'Android';
    }
    if (preg_match('/iPhone|iPad|iPod/i', $ua)) {
        return 'iOS';
    }
    if (preg_match('/Linux/i', $ua)) {
        return 'Linux';
    }
    return '기타';
}

/** Order matters: Edge/Samsung Internet/Firefox UAs also contain "Chrome" and/or
 *  "Safari" tokens, so the more specific browsers must be checked first. */
function detect_browser(string $ua): string
{
    if (preg_match('/SamsungBrowser/i', $ua)) {
        return 'Samsung Internet';
    }
    if (preg_match('/Edg\//i', $ua)) {
        return 'Edge';
    }
    if (preg_match('/Firefox|FxiOS/i', $ua)) {
        return 'Firefox';
    }
    if (preg_match('/CriOS|Chrome/i', $ua)) {
        return 'Chrome';
    }
    if (preg_match('/Safari/i', $ua)) {
        return 'Safari';
    }
    return '기타';
}

/** Classifies a raw Referrer URL into the Korean buckets shown in the dashboard.
 *  AI 챗봇(챗지피티/클로드/퍼플렉시티/제미나이 등)의 답변에 실린 링크를 웹 브라우저에서
 *  클릭했을 때의 Referrer만 잡아낼 수 있다 — 각 서비스의 네이티브 앱(iOS/Android)
 *  웹뷰는 보통 Referrer 자체를 보내지 않아 '직접접속'으로 집계되는 게 알려진 한계다. */
function classify_referrer_source(?string $referrerUrl): string
{
    if (!$referrerUrl) {
        return '직접접속';
    }
    $host = parse_url($referrerUrl, PHP_URL_HOST);
    if (!$host) {
        return '기타';
    }
    $host = strtolower($host);

    $exactBuckets = [
        // gemini.google.com / bard.google.com은 google.com의 하위 도메인이므로
        // 뒤의 '구글' 버킷(.google.com 서픽스 매치)보다 반드시 먼저 검사해야 한다.
        '제미나이' => ['gemini.google.com', 'bard.google.com'],
        '챗지피티' => ['chatgpt.com', 'chat.openai.com'],
        '클로드' => ['claude.ai'],
        '퍼플렉시티' => ['perplexity.ai'],
        '네이버' => ['naver.com'],
        '구글' => ['google.com', 'google.co.kr'],
        '다음' => ['daum.net'],
        '인스타그램' => ['instagram.com', 'l.instagram.com'],
        '페이스북' => ['facebook.com', 'fb.com', 'l.facebook.com', 'm.facebook.com'],
        '유튜브' => ['youtube.com', 'youtu.be'],
    ];
    foreach ($exactBuckets as $label => $domains) {
        foreach ($domains as $domain) {
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                return $label;
            }
        }
    }
    if (preg_match('/(^|\.)(bing|yahoo|duckduckgo|search)\./i', $host)) {
        return '기타 검색엔진';
    }
    return '기타';
}

/**
 * 방문자가 사람인지 봇인지 판별한다. 봇이면 표시용 이름(예: 'GPTBot', '구글봇')을,
 * 사람으로 보이면 null을 돌려준다.
 *
 * 숫자를 해석할 때 반드시 알아야 할 두 가지 한계:
 * - 여기 기록이 남으려면 tracker.js가 실행돼야 한다. 즉 자바스크립트를 실행하지 않는
 *   전통적 크롤러(GPTBot/ClaudeBot/PerplexityBot 및 대부분의 검색봇)는 사이트를
 *   긁어가더라도 이 통계에 아예 잡히지 않는다. 그럼에도 아래 이름 목록에 그들을
 *   포함해 둔 이유는 (1) 일부 봇은 실제로 JS를 렌더링하고(구글봇이 대표적),
 *   (2) 헤드리스 브라우저가 해당 UA를 위장해 접속할 수 있기 때문이다.
 * - $automation은 tracker.js가 보내는 navigator.webdriver 값이다. Selenium/Puppeteer/
 *   Playwright 계열 자동화 브라우저는 UA만 보면 평범한 크롬과 구별되지 않으므로,
 *   이 플래그가 UA 패턴보다 더 확실한 신호다.
 */
function detect_bot(string $ua, bool $automation = false): ?string
{
    $ua = trim($ua);
    if ($ua === '') {
        return 'UA 없음'; // 정상 브라우저 비콘이라면 User-Agent가 비어 있을 수 없다
    }

    // 이름이 알려진 봇 — 부분 문자열(소문자) 매칭. 배열 순서가 곧 우선순위이므로
    // 더 구체적인 토큰(applebot-extended)을 일반 토큰(applebot)보다 앞에 둔다.
    $namedBots = [
        // --- AI 크롤러 / AI 에이전트 ---
        'GPTBot' => ['gptbot'],
        'ChatGPT-User' => ['chatgpt-user', 'oai-searchbot'],
        'ClaudeBot' => ['claudebot', 'claude-user', 'claude-searchbot', 'claude-web', 'anthropic-ai'],
        'PerplexityBot' => ['perplexitybot', 'perplexity-user'],
        'Google-Extended' => ['google-extended'],
        'Applebot-Extended' => ['applebot-extended'],
        'Bytespider' => ['bytespider'],
        'CCBot' => ['ccbot'],
        'Meta AI' => ['meta-externalagent', 'meta-externalfetcher', 'facebookbot'],
        'Amazonbot' => ['amazonbot'],
        'MistralAI' => ['mistralai-user'],
        'Cohere' => ['cohere-ai', 'cohere-training-data-crawler'],
        'YouBot' => ['youbot'],
        'DuckAssistBot' => ['duckassistbot'],
        'Diffbot' => ['diffbot'],
        // --- 검색엔진 크롤러 ---
        '구글봇' => ['googlebot', 'google-inspectiontool', 'storebot-google', 'googleother',
                     'adsbot-google', 'mediapartners-google', 'apis-google', 'feedfetcher-google'],
        '빙봇' => ['bingbot', 'adidxbot', 'msnbot', 'bingpreview'],
        '네이버 예티' => ['yeti/', 'naverbot'],
        '다음봇' => ['daumoa'],
        '얀덱스봇' => ['yandexbot', 'yandeximages'],
        '바이두' => ['baiduspider'],
        '덕덕고' => ['duckduckbot', 'duckduckgo-favicons-bot'],
        'Applebot' => ['applebot'],
        'SeznamBot' => ['seznambot'],
        'PetalBot' => ['petalbot'],
        // --- SNS/메신저 링크 미리보기 ---
        // 주의: 카카오톡/라인 '인앱 브라우저'(UA에 KAKAOTALK, Line 포함)는 진짜 사람이다.
        // 링크 미리보기 수집기만 잡도록 -scrap 같은 구체적 토큰만 넣는다.
        '카카오톡 미리보기' => ['kakaotalk-scrap'],
        '페이스북 미리보기' => ['facebookexternalhit'],
        '트위터봇' => ['twitterbot'],
        '슬랙봇' => ['slackbot', 'slack-imgproxy'],
        '링크드인봇' => ['linkedinbot'],
        '디스코드봇' => ['discordbot'],
        '텔레그램봇' => ['telegrambot'],
        // --- SEO / 마케팅 도구 ---
        'AhrefsBot' => ['ahrefsbot'],
        'SemrushBot' => ['semrushbot'],
        'MJ12bot' => ['mj12bot'],
        'DotBot' => ['dotbot'],
        'BLEXBot' => ['blexbot'],
        'DataForSeoBot' => ['dataforseobot'],
        'Screaming Frog' => ['screaming frog'],
        // --- 모니터링 / 아카이브 ---
        'UptimeRobot' => ['uptimerobot'],
        'Pingdom' => ['pingdom'],
        'StatusCake' => ['statuscake'],
        'Site24x7' => ['site24x7'],
        '인터넷 아카이브' => ['ia_archiver', 'archive.org_bot'],
    ];

    $haystack = strtolower($ua);
    foreach ($namedBots as $label => $tokens) {
        foreach ($tokens as $token) {
            if (str_contains($haystack, $token)) {
                return $label;
            }
        }
    }

    // 자동화 브라우저: navigator.webdriver 플래그가 UA 위장보다 확실한 신호다.
    if ($automation) {
        return '자동화 브라우저';
    }
    if (preg_match('/headless|phantomjs|puppeteer|playwright|selenium|webdriver|cypress|electron/i', $ua)) {
        return '자동화 브라우저';
    }

    // 브라우저가 아닌 HTTP 클라이언트/스크립트.
    if (preg_match('/python-requests|python-urllib|python-httpx|aiohttp|scrapy|go-http-client|java\/|curl\/|wget[\/ ]|okhttp|node-fetch|axios\/|apache-httpclient|libwww-perl|postmanruntime|guzzlehttp|winhttp|php-curl/i', $ua)) {
        return '스크립트/HTTP 클라이언트';
    }

    // 이름은 모르지만 스스로 봇이라고 밝히는 UA. 'bot' 뒤에 구분자를 요구해
    // 글자가 우연히 겹치는 기기명(CUBOT NOTE 7 등)이 걸리지 않게 하고, 그마저도
    // 평범한 브라우저 UA면 봇 표식(compatible; Xbot / +http://…)이 있을 때만 인정한다.
    $looksLikeBrowser = (bool) preg_match('/(?:Chrome|Firefox|Safari|Edg|OPR)\/\d/i', $ua);
    $hasBotMarker = (bool) preg_match('/\+https?:\/\/|compatible;\s*[a-z0-9_.-]*bot/i', $ua);
    if (preg_match('/[a-z0-9_.-]*bot[\/\s;,)]|crawler|spider|scraper|crawling|fetcher|archiver/i', $ua)
        && (!$looksLikeBrowser || $hasBotMarker)
    ) {
        return '기타 봇';
    }

    return null;
}

/**
 * 비콘을 보낸 방문자의 접속 IP. 판별할 수 없으면 null.
 *
 * 이름이 client_ip()가 아닌 이유: includes/auth.php에 같은 이름의 함수가 이미 있고
 * (관리자 로그인 기록용), track.php는 세션/인증 스택을 일부러 로드하지 않는 공개
 * 엔드포인트라 두 파일이 한 요청에서 같이 로드되면 재선언 오류가 난다.
 *
 * REMOTE_ADDR을 먼저 믿는다. 2026-09-08에 운영 서버에서 직접 확인한 결과, 카페24는
 * 응답 헤더에 openresty가 찍히는데도 PHP에는 방문자의 진짜 공인 IP가 REMOTE_ADDR로
 * 그대로 들어오고 X-Forwarded-For / X-Real-IP는 아예 오지 않았다. 그런 환경에서
 * XFF를 먼저 보면 누구나 헤더를 넣어 기록될 IP를 바꿀 수 있으므로, 위조할 수 없는
 * REMOTE_ADDR을 우선하고 그 값이 사설/루프백일 때(= 앞단에 프록시가 있는 게 확실할 때)
 * 에만 XFF를 참고한다.
 */
function visitor_ip(): ?string
{
    $isPublic = static fn(string $ip): bool => filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;

    $remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    if ($remote !== '' && $isPublic($remote)) {
        return $remote;
    }

    // 여기까지 왔다면 앞단에 프록시가 있는 구성이다. XFF는 "client, proxy1, ..." 순서다.
    $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
    if ($forwarded === '') {
        $forwarded = (string) ($_SERVER['HTTP_X_REAL_IP'] ?? '');
    }
    foreach (explode(',', $forwarded) as $candidate) {
        $candidate = trim($candidate);
        if ($isPublic($candidate)) {
            return $candidate;
        }
    }

    // 사설망(사내 테스트 등)에서의 접속이면 REMOTE_ADDR을 그대로 남긴다.
    return filter_var($remote, FILTER_VALIDATE_IP) !== false ? $remote : null;
}
