# 관리자 시스템 설계 기준서

여의도기통찬의원 홈페이지의 `admin/`을 기준으로, **다른 홈페이지에 같은 구조의 관리자 시스템을
만들 때 참고할 문서**입니다. 코드를 그대로 복사하기보다, 어떤 결정을 왜 그렇게 했는지와
무엇을 반드시 바꿔야 하는지를 적었습니다.

- 기준 코드: `admin/` (PHP 8 + MySQL, 프레임워크 없음)
- 운영 환경: 카페24 "일반형" 같은 **공유 PHP 호스팅**. FTP로 올리면 그대로 돈다
- 작성 기준일: 2026-10-22

---

## 0. 시작하기 전에 — 새로 만들 필요가 없을 수도 있습니다

**방문통계만 필요하다면 새 관리자를 만들지 마세요.** 기존 관리자의 통계 모듈은 이미
**멀티사이트**입니다. `sites` / `site_domains` 테이블이 있고, 새 사이트를 등록한 뒤
그 사이트에 추적 스크립트 한 줄만 넣으면 됩니다.

```html
<script src="https://기존도메인/admin/tracker.js" data-site-id="SITE_NEW"></script>
```

관리자 화면의 **사이트 관리**에서 Site ID와 허용 도메인을 등록합니다. 등록되지 않은
도메인에서 온 수집 요청은 `api/public/track.php`가 저장하지 않습니다.

게시판·팝업처럼 **사이트별 콘텐츠가 필요할 때만** 아래 구조로 새로 만듭니다.
(현재 게시판과 팝업 테이블에는 `site_id` 칼럼이 없어 단일 사이트 전용입니다. 한 관리자가
여러 사이트의 콘텐츠를 다루게 하려면 그 칼럼부터 추가해야 합니다. 8-3 참고.)

---

## 1. 전체 구조

```
웹 루트/
├── index.html, sub/, css/, js/     정적 홈페이지
├── admin/
│   ├── .htaccess                   config.php·schema.sql 직접 접근 차단
│   ├── config.php                  DB 접속 정보. 서버에만 둔다. git 제외
│   ├── config.php.example          저장소에 두는 견본
│   ├── schema.sql                  테이블 정의
│   ├── setup.php                   최초 1회 시드 계정 생성. 쓰고 나면 삭제
│   ├── login.php / logout.php
│   ├── index.php                   대시보드
│   ├── includes/                   .htaccess: Require all denied
│   │   ├── bootstrap.php           모든 화면이 맨 위에서 1줄로 부르는 진입점
│   │   ├── db.php                  설정 로드 + PDO 1개 재사용
│   │   ├── auth.php                로그인·세션·권한·검증
│   │   ├── csrf.php
│   │   ├── helpers.php             h(), flash, post(), 링크 검증, 기능 플래그
│   │   ├── layout.php              공통 헤더/푸터, 메뉴
│   │   └── upload.php              이미지 검증·리사이즈·저장
│   ├── <기능>/                     index.php(목록) new.php edit.php delete.php
│   ├── api/public/                 정적 홈페이지가 호출. 인증 없음
│   ├── api/<기능>/                 관리자 화면이 호출. 서버에서 권한 재검증
│   ├── assets/                     admin.css, 화면용 js
│   └── uploads/                    .htaccess: 스크립트 실행 차단
```

### 요청 흐름

| 누가 | 어디로 | 인증 |
|---|---|---|
| 관리자 브라우저 | `admin/<기능>/index.php` | 세션. `require_login()` / `require_role()` |
| 관리자 화면의 JS | `admin/api/<기능>/*.php` | 세션. `require_role_api()`로 **서버에서 다시** 검증 |
| 일반 방문자의 홈페이지 | `admin/api/public/*.php` | 없음. 공개해도 되는 데이터만 |

정적 홈페이지와 관리자가 **같은 웹 루트**에 있어 동일 출처입니다. CORS 처리가 필요 없고,
홈페이지는 `../admin/api/public/...` 같은 **상대 경로**로 호출합니다. 상대 경로로 둔 덕분에
하위 경로에 배포되는 호스트(GitHub Pages)와 루트 도메인(카페24) 양쪽에서 같은 코드가 돕니다.

---

## 2. 반드시 지킬 7가지 규약

### 2-1. 모든 화면은 bootstrap 한 줄로 시작한다

```php
require __DIR__ . '/../includes/bootstrap.php';
$admin = require_login();
```

`bootstrap.php`가 타임존, 세션 쿠키 정책, DB, 인증, CSRF, 업로드를 한 번에 세웁니다.
화면마다 세션 설정을 따로 하면 반드시 어긋납니다.

세션 쿠키는 `httponly`, `samesite=Lax`, HTTPS일 때만 `secure`로 둡니다.
`Strict`가 아니라 `Lax`인 이유는 외부 OAuth 동의 화면에서 돌아올 때(최상위 GET 이동)
`Strict`면 쿠키가 빠져 로그인 화면으로 튕기기 때문입니다.

### 2-2. 설정은 코드 밖에, 서버에만

`config.php`는 **저장소에 커밋하지 않습니다**(`.gitignore`). 견본만 `config.php.example`로
둡니다. `.htaccess`가 HTTP 직접 접근도 막습니다.

```php
return [
    'db' => ['host' => '', 'name' => '', 'user' => '', 'pass' => '', 'charset' => 'utf8mb4'],
    'app_env' => 'production',
    'features' => ['consultations' => false, 'kakao' => false],
];
```

저장소가 공개라면 이 분리는 선택이 아니라 필수입니다.

### 2-3. 로그인은 사용자 이름을 알려주지 않는다

없는 아이디, 비활성 계정, 틀린 비밀번호가 **모두 같은 문구**를 돌려줍니다.
"없는 아이디입니다"와 "비밀번호가 틀렸습니다"를 구분하면 그 화면이 아이디 목록을 알려주는
도구가 됩니다.

성공·실패를 모두 `login_logs`에 남기되, 실패 사유는 **DB에만** 적고 화면에는 내보내지 않습니다.

로그인에 성공하면 `session_regenerate_id(true)`로 세션 고정 공격을 끊습니다.

### 2-4. 권한은 메뉴가 아니라 서버에서 막는다

메뉴를 숨기는 것은 보호가 아닙니다. 화면은 `require_role('MASTER')`, API는
`require_role_api('MASTER')`로 **서버에서 다시** 검사합니다. 주소를 직접 쳐도 403입니다.

`current_admin()`은 세션만 믿지 않고 **요청마다 DB를 다시 읽습니다.** 그래야 방금 비활성화한
계정이 세션 만료를 기다리지 않고 즉시 막힙니다.

### 2-5. 마지막 MASTER는 잠글 수 없다

삭제·비활성화·권한 강등 전에 `ensure_not_last_active_master()`로 확인합니다.
아무도 못 들어가는 관리자는 복구에 DB 직접 수정이 필요합니다.

### 2-6. 모든 POST는 CSRF 토큰을 검증한다

폼에 `csrf_field()`, 처리부 맨 위에 `verify_csrf_or_403()`. 예외를 두지 않습니다.
로그아웃 버튼도 `<a>`가 아니라 **POST 폼**입니다. GET 링크면 외부 이미지 태그로 로그아웃을
유발할 수 있습니다.

### 2-7. 업로드는 확장자가 아니라 내용으로 판단한다

```php
$bytes = file_get_contents($file['tmp_name']);
$ext = detect_image_extension($bytes);   // 매직 바이트로 JPEG/PNG/WEBP 판별
```

파일명은 신뢰하지 않고 `bin2hex(random_bytes(16))`로 새로 짓습니다.
업로드 폴더의 `.htaccess`가 `.php`, `.phtml`, `.cgi` 등의 실행을 **거부**합니다
(내용 검사와 실행 차단, 두 겹으로 둡니다).

큰 이미지는 버킷별 최대 변 길이로 줄여 WebP로 다시 씁니다. GD가 없거나 실패하면
원본을 그대로 저장해 **기능이 멈추지 않게** 합니다.

---

## 3. 데이터 모델

### 꼭 필요한 표

| 표 | 역할 | 핵심 칼럼 |
|---|---|---|
| `admins` | 계정 | `username` UNIQUE, `password_hash`, `role` ENUM, `is_active` |
| `login_logs` | 로그인 시도 기록 | `attempted_username`, `ip_address`, `success`, `failure_reason` |

`password_hash`는 PHP의 `password_hash()` 기본 알고리즘을 그대로 씁니다.
직접 해시를 만들지 않습니다.

### 콘텐츠 표 (필요한 것만)

| 표 | 역할 |
|---|---|
| `community_posts` | 게시판. 공지 고정, 예약 발행, 조회수, 대표 이미지 |
| `popups` | 첫 화면 팝업. 노출 기간, 순서, PC/모바일 이미지 |
| `consultations` | 상담 신청 |

### 통계 표 (쓸 경우)

`sites`, `site_domains`, `visitors`, `sessions`, `page_views`, `events`, `ip_lookups`

### 공통 규칙

- `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` — 이모지와 한글 조합이 안전하게 들어갑니다
- `CREATE TABLE IF NOT EXISTS` — 스키마를 다시 실행해도 기존 표를 건드리지 않습니다
- 작성자 외래키는 `ON DELETE SET NULL` — 계정을 지워도 글이 사라지지 않습니다
- `created_at` / `updated_at`은 DB 기본값과 `ON UPDATE CURRENT_TIMESTAMP`로 둡니다

### 공개 범위를 스키마 주석에 적는다

```sql
-- 방문자: 브라우저 localStorage의 UUID 기준 1행.
-- 실명/이메일/전화번호는 저장하지 않습니다. 접속 IP는 sessions.ip_address에만
-- 기록되며 MASTER 계정의 방문통계 화면에서만 조회됩니다.
```

개인정보처리방침에 쓸 내용과 실제 저장 내용이 어긋나지 않게, **표를 만들 때 같이 적습니다.**

---

## 4. 공개 API 규약

정적 홈페이지가 부르는 엔드포인트입니다. 인증이 없으므로 **공개해도 되는 데이터만** 담습니다.

| 엔드포인트 | 용도 |
|---|---|
| `GET api/public/community.php?page=N` | 목록(공지 + 한 페이지) |
| `GET api/public/community.php?id=N` | 상세. 조회수 1 증가 |
| `GET api/public/popups.php` | 현재 노출 기간인 팝업 |
| `POST api/public/consultations.php` | 상담 신청 접수 |
| `POST api/public/track.php` | 방문 수집 |
| `GET api/public/status.php` | **이 호스트에서 PHP가 도는지** 알려 줌 |

### 응답 형태를 하나로 고정한다

```json
{ "data": { ... } }
{ "error": { "message": "사람이 읽을 한국어 문장" } }
```

호출하는 쪽은 `data`가 있으면 성공으로 봅니다.

### 정적 호스트에서 깨지지 않게 만든다

PHP가 없는 호스트(GitHub Pages, 로컬 정적 서버)에서는 이 API가 **HTML 404**를 돌려주거나
PHP 원본이 그대로 내려옵니다. 호출부는 세 가지를 구분해야 합니다.

```js
// 1) API가 "글이 없다"고 답함  2) 여기에는 API 자체가 없음  3) 네트워크 실패
if (response.status === 404 && body?.error) return { kind: "not-found" };
if (!response.ok || !body?.data)            return { kind: "unavailable" };
```

`status.php`가 DB도 `config.php`도 건드리지 않는 이유가 이것입니다. **설정 전에도** 대답해야
"여기는 관리자가 없는 호스트"를 판정할 수 있습니다.

이 구분이 없으면 정적 호스트에서 게시판이 오류 화면을 띄웁니다. 있으면 "준비하고 있습니다"로
조용히 넘어갑니다.

---

## 5. 기능 끄기 — 지우지 말고 숨긴다

```php
'features' => ['consultations' => false, 'kakao' => false],
```

- 꺼진 기능은 **메뉴에서 빠지고**, 해당 화면과 공개 API가 **404**를 돌려줍니다
- 403이 아니라 404인 이유: 403은 "여기 뭔가 있다"고 알려 줍니다
- 기본값은 꺼짐 — 플래그가 생기기 전에 쓰던 `config.php`도 안전하게 동작합니다
- 코드는 남아 있으므로 `true`로 바꾸면 되살아납니다

아직 안 쓰는 기능을 지우는 대신 이렇게 두면, 되살릴 때 다시 만들 필요가 없습니다.

---

## 6. 파일 배치와 서버 차단

| 경로 | `.htaccess` | 이유 |
|---|---|---|
| `admin/` | `config.php`, `schema.sql`, `config.php.example` 거부 | DB 비밀번호와 구조 노출 방지 |
| `admin/includes/` | `Require all denied` | 직접 실행 금지 |
| `admin/storage/` | `Require all denied` | 토큰 등 내부 파일 |
| `admin/uploads/` | 스크립트 확장자 거부 + `php_flag engine off` | 이미지로 위장한 코드 실행 방지 |

**배포 후 반드시 시험하세요.** `https://도메인/admin/config.php`에 접속해
**403 또는 빈 화면**이 나와야 합니다. PHP 소스가 보이거나 설정 내용이 보이면 즉시 중단하고
서버 설정을 고쳐야 합니다. 차단이 동작하지 않는 서버가 있습니다.

관리자 화면에는 `<meta name="robots" content="noindex, nofollow">`를 넣고,
`robots.txt`에서 `/admin/`을 `Disallow` 합니다. 단 **공개로 쓰는 업로드 이미지 폴더는
따로 열어야** 합니다. 안 그러면 게시글 이미지가 검색 결과에 안 나옵니다.

```
Disallow: /admin/
Allow: /admin/uploads/
```

---

## 7. 배포 절차

1. 호스팅에서 **MySQL DB 생성**, 접속 정보 확보
2. phpMyAdmin 등에서 **`schema.sql` 실행**
3. `config.php.example` → `config.php` 복사 후 접속 정보 입력
4. **`config.php`를 뺀 나머지를 먼저 FTP 업로드**
5. 6절의 **차단 시험** — 여기서 멈추고 꼭 확인
6. `config.php` 업로드 (차단이 되는 것을 확인한 뒤에)
7. PHP 8.x 설정, `upload_max_filesize` / `post_max_size`를 5MB 이상으로
8. `https://도메인/admin/setup.php?confirm=yes` 접속 → 무작위 비밀번호가 **한 번만** 표시됨
9. **`setup.php`를 서버에서 즉시 삭제**
10. 로그인 후 "내 정보"에서 비밀번호 변경

`config.php`를 마지막에서 두 번째로 올리는 순서가 중요합니다. 차단이 안 되는 서버에
비밀번호가 담긴 파일을 먼저 올리면 그 사이에 노출됩니다.

`.htaccess`에 `php_value`를 쓰지 마세요. PHP 실행 모드에 따라 500 오류가 납니다.
업로드 용량은 **호스팅센터 설정 화면**에서 바꿉니다.

---

## 8. 다른 홈페이지로 옮길 때 체크리스트

### 8-1. 반드시 바꿔야 하는 값

| 위치 | 현재 값 | 바꿀 것 |
|---|---|---|
| `includes/layout.php` | `const ADMIN_BRAND = '여의도기통찬의원 관리자'` | 기관명 |
| `includes/bootstrap.php` | `session_name('ygtc_admin_session')` | 사이트별 고유 이름 |
| `includes/layout.php` | 메뉴 항목과 한국어 라벨 | 그 사이트의 기능 |
| `setup.php` | 시드 계정 `admin` / `gitongchan` | 그 사이트의 계정명 |
| `schema.sql` | 표 구성 | 안 쓰는 표 삭제 |
| `config.php` | 전부 | 새 DB 정보 |

`session_name`을 그대로 두면 **같은 도메인에 두 관리자를 올렸을 때 세션이 섞입니다.**

### 8-2. 그대로 가져가도 되는 것

`includes/` 전체(bootstrap, db, auth, csrf, helpers, upload)는 사이트 이름만 바꾸면
그대로 씁니다. 이 부분이 보안 결정이 모여 있는 곳이라, 새로 쓰기보다 옮기는 쪽이 안전합니다.

### 8-3. 한 관리자로 여러 사이트를 다루려면

콘텐츠 표에 `site_id`를 넣고 모든 조회에 조건을 추가해야 합니다.

```sql
ALTER TABLE community_posts ADD COLUMN site_id INT UNSIGNED NOT NULL;
ALTER TABLE community_posts ADD INDEX idx_site (site_id, is_published, published_at);
```

조회 한 곳이라도 빠지면 **다른 사이트 글이 섞여 보입니다.** 공개 API도 `site_id`를 받아야
합니다. 통계 모듈은 이미 이 구조라 참고가 됩니다.

사이트가 둘뿐이고 내용이 전혀 다르다면, **DB와 관리자를 따로 두는 쪽이 단순합니다.**
`site_id`를 모든 곳에 흘리는 비용이 생각보다 큽니다.

---

## 9. 밟았던 함정

실제로 겪은 것들입니다. 같은 곳에서 멈추지 마세요.

**배포 경로가 둘인데 한쪽이 화이트리스트였습니다.** 빌드 스크립트가 올릴 파일을 배열로
열거하는 방식이라, 웹 루트에 새 파일을 만들어도 그 배열에 넣지 않으면 **한쪽에만 조용히
누락**됐습니다. 루트에 파일을 추가하면 배포 목록 갱신을 항상 같이 확인하세요.

**PHP 파일을 정적 호스트에 올리면 원본이 그대로 보입니다.** GitHub Pages는 PHP를 실행하지
않아 소스가 텍스트로 내려옵니다. Pages 배포 제외 목록에 넣어야 합니다.

**`robots.txt`로 `/admin/`을 통째로 막으면 게시글 이미지까지 막힙니다.** 업로드 폴더만
`Allow`로 열어 주세요.

**관리자 영역을 막았다고 안심하지 마세요.** 차단은 서버 설정에 의존합니다. 배포할 때마다
`config.php`에 직접 접속해 눈으로 확인하는 절차를 넣으세요.

**세션만 믿으면 비활성화가 늦게 반영됩니다.** 요청마다 DB를 다시 읽는 비용은 질의 한 번이고,
얻는 것은 즉시 차단입니다.

---

## 10. 참고 파일

| 보고 싶은 것 | 파일 |
|---|---|
| 전체 진입 규약 | `admin/includes/bootstrap.php` |
| 로그인·권한·검증 | `admin/includes/auth.php` |
| 표 정의와 공개 범위 주석 | `admin/schema.sql` |
| 업로드 검증·리사이즈 | `admin/includes/upload.php` |
| 공개 API 작성 예 | `admin/api/public/community.php` |
| 정적 호스트 대응 | `js/community.js` 의 `request()` |
| 운영 안내 | `admin/README.md` |
| 호스팅 배포 절차 | `docs/cafe24-deploy.md` |
