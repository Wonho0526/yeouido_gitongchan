-- 여의도기통찬의원 관리자 시스템 (PHP/MySQL) 스키마
-- 카페24 phpMyAdmin 등에서 한 번 실행하세요.
-- 시드 계정은 여기서 만들지 않습니다 (비밀번호 해시는 setup.php가 서버에서 직접 계산해 넣습니다).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(50) NOT NULL,
    role          ENUM('MASTER', 'ADMIN') NOT NULL,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admins_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS popups (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title             VARCHAR(100) NOT NULL,
    pc_image_path     VARCHAR(255) NOT NULL,
    mobile_image_path VARCHAR(255) NULL,
    link_url          VARCHAR(500) NULL,
    link_target       ENUM('_self', '_blank') NOT NULL DEFAULT '_self',
    start_date        DATETIME NOT NULL,
    end_date          DATETIME NOT NULL,
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    display_order     INT NOT NULL DEFAULT 0,
    created_by        INT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_popups_active_range (is_active, start_date, end_date),
    INDEX idx_popups_display_order (display_order),
    CONSTRAINT fk_popups_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- '기가 통하는 커뮤니티' 게시판. 본문은 일반 텍스트로 저장하고 출력 시 이스케이프합니다
-- (HTML을 허용하지 않으므로 별도의 HTML 정화 과정이 필요 없습니다).
CREATE TABLE IF NOT EXISTS community_posts (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    content          MEDIUMTEXT NOT NULL,
    cover_image_path VARCHAR(255) NULL,
    is_pinned        TINYINT(1) NOT NULL DEFAULT 0,
    is_published     TINYINT(1) NOT NULL DEFAULT 1,
    view_count       INT UNSIGNED NOT NULL DEFAULT 0,
    published_at     DATETIME NOT NULL,
    created_by       INT UNSIGNED NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_community_public (is_published, is_pinned, published_at),
    CONSTRAINT fk_community_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS consultations (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    phone      VARCHAR(20) NOT NULL,
    content    VARCHAR(2000) NOT NULL,
    date       DATETIME NOT NULL,
    status     ENUM('상담전', '상담완료', '예약완료') NOT NULL DEFAULT '상담전',
    memo       VARCHAR(2000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_consultations_date (date),
    INDEX idx_consultations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_logs (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id           INT UNSIGNED NULL,
    attempted_username VARCHAR(50) NOT NULL,
    ip_address         VARCHAR(45) NOT NULL,
    user_agent         VARCHAR(500) NULL,
    success            TINYINT(1) NOT NULL,
    failure_reason     VARCHAR(50) NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_logs_admin (admin_id, created_at),
    INDEX idx_login_logs_ip (ip_address, created_at),
    CONSTRAINT fk_login_logs_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 방문통계(Visitor Analytics) — 2026-10-20 추가
-- 이미 운영 중인 DB라면 phpMyAdmin에서 이 섹션 전체를 한 번 실행하세요.
-- 위의 기존 표는 CREATE TABLE IF NOT EXISTS라 다시 실행해도 건드리지 않습니다.
--
-- visitors/sessions/page_views/events의 site_id는 sites.id(내부 숫자 PK)를
-- 가리키는 FK입니다. tracker.js가 보내는 외부용 문자열 식별자("SITE_001" 등)는
-- sites.site_id 컬럼에만 존재하고, track.php가 요청을 받을 때 한 번 내부 id로
-- 변환해 저장합니다 (참조 무결성 + 조인 성능을 위해 admins/popups 등 기존 테이블과
-- 동일한 패턴을 따름).
--
-- 통계 조회 전용 API는 반드시 서버 측에서 require_role_api('MASTER')로 검증합니다
-- (includes/auth.php). ADMIN 계정은 API를 직접 호출해도 403을 받습니다.
-- ============================================================

CREATE TABLE IF NOT EXISTS sites (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    site_id    VARCHAR(50) NOT NULL UNIQUE,   -- tracker.js data-site-id 값 (예: "SITE_YGTC")
    site_name  VARCHAR(100) NOT NULL,
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 사이트별 허용 도메인 (여러 개 등록 가능). tracker.js를 호출한 Origin이
-- 여기 등록되지 않은 도메인이면 track.php가 데이터를 저장하지 않습니다.
CREATE TABLE IF NOT EXISTS site_domains (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    site_id    INT UNSIGNED NOT NULL,
    domain     VARCHAR(255) NOT NULL,         -- 예: xn--ok0bu9hnyrvkbwwl58i.com (프로토콜/포트 제외)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_site_domains (site_id, domain),
    CONSTRAINT fk_site_domains_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 방문자: 브라우저 localStorage에 저장된 UUID(visitor_id) 기준 1행.
-- 실명/이메일/전화번호 등은 저장하지 않습니다. 접속 IP는 sessions.ip_address에만
-- 기록되며 MASTER 계정의 방문통계 화면에서만 조회됩니다.
CREATE TABLE IF NOT EXISTS visitors (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitor_id    CHAR(36) NOT NULL,
    site_id       INT UNSIGNED NOT NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at  DATETIME NOT NULL,
    UNIQUE KEY uq_visitors_site_visitor (site_id, visitor_id),
    INDEX idx_visitors_site (site_id),
    CONSTRAINT fk_visitors_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 세션: 브라우저 sessionStorage에 저장된 UUID(session_id) 기준 1행 = 방문 1회.
-- 유입경로/UTM/기기 정보는 세션 시작 시점(첫 페이지) 기준으로 한 번만 저장합니다.
CREATE TABLE IF NOT EXISTS sessions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id      CHAR(36) NOT NULL,
    visitor_id      CHAR(36) NOT NULL,
    site_id         INT UNSIGNED NOT NULL,
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME NULL,             -- 마지막으로 신호를 받은 시각(추정 종료 시각)
    landing_page    VARCHAR(500) NOT NULL,
    referrer_url    VARCHAR(500) NULL,          -- 원본 Referrer URL
    referrer_source VARCHAR(30) NOT NULL DEFAULT '직접접속', -- 네이버/구글/다음/인스타그램/페이스북/유튜브/기타 검색엔진/직접접속/기타
    utm_source      VARCHAR(100) NULL,
    utm_medium      VARCHAR(100) NULL,
    utm_campaign    VARCHAR(100) NULL,
    utm_term        VARCHAR(100) NULL,
    utm_content     VARCHAR(100) NULL,
    device          VARCHAR(10) NOT NULL DEFAULT '기타',  -- PC/Mobile/Tablet
    os              VARCHAR(20) NOT NULL DEFAULT '기타',
    browser         VARCHAR(30) NOT NULL DEFAULT '기타',
    user_agent      VARCHAR(500) NULL,          -- 봇 판별 근거 확인용 원본 User-Agent
    ip_address      VARCHAR(45) NULL,           -- 접속 IP(IPv6까지 45자). 세션 첫 비콘 시점의 값만 기록
    is_bot          TINYINT(1) NOT NULL DEFAULT 0, -- 1이면 봇/자동화 접속(사람 아님)
    bot_name        VARCHAR(50) NULL,           -- is_bot=1일 때의 봇 이름(GPTBot/구글봇/자동화 브라우저 등)
    screen_width    SMALLINT UNSIGNED NULL,
    screen_height   SMALLINT UNSIGNED NULL,
    page_view_count SMALLINT UNSIGNED NOT NULL DEFAULT 0, -- 이탈률 계산용(1이면 이탈)
    UNIQUE KEY uq_sessions_session_id (session_id),
    INDEX idx_sessions_site_started (site_id, started_at),
    INDEX idx_sessions_visitor (visitor_id),
    INDEX idx_sessions_bot (site_id, is_bot, started_at),
    INDEX idx_sessions_ip (site_id, ip_address),
    CONSTRAINT fk_sessions_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 페이지뷰: 세션 내 페이지 이동 순서(sequence)와 체류시간을 기록.
-- page_view_id는 클라이언트(tracker.js)가 생성하는 UUID로, 페이지 진입 시 INSERT,
-- 이탈 시 같은 page_view_id로 UPDATE(left_at/duration)합니다.
CREATE TABLE IF NOT EXISTS page_views (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    page_view_id      CHAR(36) NOT NULL,
    session_id        CHAR(36) NOT NULL,
    visitor_id        CHAR(36) NOT NULL,
    site_id           INT UNSIGNED NOT NULL,
    page_url          VARCHAR(500) NOT NULL,
    page_title        VARCHAR(255) NULL,
    previous_page_url VARCHAR(500) NULL,
    sequence          SMALLINT UNSIGNED NOT NULL,
    entered_at        DATETIME NOT NULL,
    left_at           DATETIME NULL,
    duration          INT UNSIGNED NULL,       -- 초 단위, 이탈 시점에 채워짐
    UNIQUE KEY uq_page_views_pv_id (page_view_id),
    INDEX idx_page_views_site_entered (site_id, entered_at),
    INDEX idx_page_views_session (session_id, sequence),
    INDEX idx_page_views_url (site_id, page_url(191)),
    CONSTRAINT fk_page_views_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 이벤트: 전화/예약/카카오상담/지도/스크롤 등 페이지뷰 외 행동 기록. 확장 가능한 구조.
CREATE TABLE IF NOT EXISTS events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id      CHAR(36) NOT NULL,
    visitor_id      CHAR(36) NOT NULL,
    site_id         INT UNSIGNED NOT NULL,
    event_name      VARCHAR(100) NOT NULL,
    event_category  VARCHAR(50) NULL,
    event_value     VARCHAR(255) NULL,
    page_url        VARCHAR(500) NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_events_site_created (site_id, created_at),
    INDEX idx_events_session (session_id),
    INDEX idx_events_name (site_id, event_name),
    CONSTRAINT fk_events_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- IP 조회 캐시 (역DNS)
-- 접속 IP가 "어떤 회선에서 왔는가"(가정용 ISP / 모바일 / 데이터센터)를 판단하려고
-- 역DNS를 조회한 결과를 담아 둡니다. DNS 조회는 느리고 결과가 잘 안 바뀌므로
-- 한 번 조회한 IP는 이 표에서 재사용하고, 오래된 것만 다시 조회합니다.
-- 외부 유료 DB나 API는 쓰지 않습니다 (includes/ip_intel.php).
--
-- 주의: 카페24는 역DNS(PTR) 조회가 막혀 있어 회선 뱃지가 표시되지 않습니다.
-- 코드는 그대로 두었으므로 PTR이 열린 호스팅으로 옮기면 바로 동작합니다.
-- ============================================================

CREATE TABLE IF NOT EXISTS ip_lookups (
    ip_address    VARCHAR(45) NOT NULL PRIMARY KEY,
    hostname      VARCHAR(255) NULL,          -- 역DNS 결과. PTR 레코드가 없으면 NULL
    network_code  VARCHAR(20) NOT NULL,       -- residential/mobile/datacenter/institution/unknown
    network_label VARCHAR(30) NOT NULL,       -- 화면 표시용 한글 라벨
    bot_verified  VARCHAR(50) NULL,           -- 정방향 확인까지 끝난 검색봇 이름(예: 구글봇)
    checked_at    DATETIME NOT NULL,
    INDEX idx_ip_lookups_checked (checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
