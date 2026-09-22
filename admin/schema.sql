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
