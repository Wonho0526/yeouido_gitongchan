# 카페24 배포 절차서 (뉴 아우토반 호스팅 비즈니스)

홈페이지(정적 파일) + 관리자 시스템(`/admin/`, PHP 8 + MySQL)을 카페24 한 대에 올려 같은 도메인에서 동작시키는 절차입니다.
관리자 기능 자체는 이미 저장소에 들어와 있으므로, 이 문서는 **올리고 연결하는 일**만 다룹니다.

> 관리자 시스템의 기능·구조 설명은 `admin/README.md`를 보세요.
> 이 문서는 그 위에 "뉴 아우토반 + 구매 도메인" 환경을 전제로 한 실행 순서입니다.

## 확정된 환경

| 항목 | 값 |
|---|---|
| 도메인 | `여의도기통찬.com` (한글 도메인 → 퓨니코드 `xn--ok0bu9hnyrvkbwwl58i.com`) |
| 호스팅 | 카페24 뉴 아우토반 비즈니스 |
| 서버 | `uws8-wpm-135` / `222.122.39.70` |
| 웹서버 | 앞단 **openresty**(nginx 계열) 리버스 프록시 + 뒷단 **Apache** |
| PHP | **8.4** — 관리자 코드 요구사항(8.0+) 충족 |
| DB | **MariaDB 10.x** — `schema.sql`이 그대로 적용됩니다 |
| 인코딩 | UTF-8 |
| DNS | **이미 연결 완료** — `xn--ok0bu9hnyrvkbwwl58i.com` → `222.122.39.70` |
| 웹 루트 | **비어 있음** — 아직 아무것도 올라가지 않은 상태 |

이 환경에 대해 미리 확인한 결과:

- **웹서버는 Apache입니다.** 응답 헤더의 `Server: openresty`는 카페24가 앞에 둔 프록시가 덮어쓴 값이라 뒷단이 안 보입니다. 다만 없는 경로를 요청했을 때 돌아오는 404 페이지가 Apache 기본 오류 문서(`<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">` + `The requested URL was not found on this server.`)라서 뒷단이 Apache임이 확인됩니다. 즉 **`.htaccess`가 동작하는 환경**입니다. (nginx 단독이면 `.htaccess`가 전부 무시돼 보안 차단이 통째로 풀립니다.)
- **PHP 8.4 호환**: 8.4에서 deprecated된 "암묵적 nullable 파라미터"(`function f(Type $x = null)`) 패턴이 관리자 코드에 **없습니다.** 경고 없이 동작합니다.
- **MariaDB 호환**: 인덱스가 걸린 가장 긴 컬럼이 `admins.username VARCHAR(20)`(utf8mb4 기준 80바이트)이라 인덱스 길이 제한에 걸리지 않습니다. 외래키 순서도 `schema.sql` 안에서 맞게 정렬돼 있습니다.
- **도메인 의존성 없음**: 관리자 내부 링크는 모두 상대경로(`admin_url()`)입니다. 절대 URL을 만드는 곳은 카카오 알림(`admin/includes/kakao.php`) 한 곳뿐이고, 그 기능은 지금 꺼져 있습니다.

---

## 0단계. 시작 전에 호스팅센터에서 적어둘 값

위 표에서 아직 안 채워진 값만 호스팅센터에서 확인해 메모하세요. 이게 없으면 3단계에서 멈춥니다.

| 항목 | 어디서 보는지 | **어디에 쓰는지** |
|---|---|---|
| FTP 호스트 / 아이디 / 비밀번호 | 나의서비스관리 → FTP 정보 | **FileZilla 등 FTP 프로그램에만.** 코드·저장소에는 절대 안 들어갑니다 |
| 웹 루트 경로 | FTP 접속 후 보이는 폴더. 카페24는 보통 `/www/` | 파일을 올릴 위치 (4단계) |
| MySQL 호스트 | 나의서비스관리 → DB 정보. `localhost`인 경우가 많음 | `admin/config.php` (3단계) |
| MySQL DB명 / 계정 / 비밀번호 | 같은 화면 (DB를 아직 안 만들었으면 2단계에서 생성) | `admin/config.php` (3단계) |

**FTP 정보와 DB 정보는 쓰이는 곳이 완전히 다릅니다.**

- **FTP 정보** = 서버에 파일을 올리기 위한 "출입증". FTP 프로그램의 접속 설정 화면에만 입력하고, 파일로 저장할 일이 없습니다.
- **DB 정보** = 관리자 PHP가 DB에 접속할 때 쓰는 값. 유일하게 `admin/config.php`에 적히고, 그 파일은 **서버에만** 둡니다.

> 이 저장소는 공개(public)입니다. FTP 비밀번호든 DB 비밀번호든 저장소 안의 어떤 파일에도 적지 마세요.

### FTP 프로그램 설정 (FileZilla 기준)

FileZilla → 파일 → **사이트 관리자** → **새 사이트** 를 누르고 아래를 채웁니다.

| 칸 | 넣을 값 |
|---|---|
| 프로토콜 | `FTP - 파일 전송 프로토콜` |
| 호스트 | 호스팅센터의 FTP 주소 (없으면 `222.122.39.70`) |
| 포트 | `21` (비워두면 자동) |
| 암호화 | `사용 가능한 경우 명시적 FTP over TLS 사용` |
| 로그온 유형 | `일반` |
| 사용자 | 카페24 호스팅 **아이디** |
| 비밀번호 | 카페24 **FTP 비밀번호** |

연결하면 오른쪽(서버) 창에 폴더 목록이 나옵니다. 그중 **`www`** 폴더로 들어간 뒤 파일을 올리세요. `www` 안이 웹에서 보이는 영역입니다.

> 암호화를 `명시적 FTP over TLS`로 두면 지원하는 경우 자동으로 암호화됩니다. 지원하지 않아 평문 FTP로 연결되면 비밀번호가 그대로 네트워크에 흘러가니, 공용 와이파이에서는 작업하지 마세요.

### 주의 1 — Apache 버전은 찾지 않아도 됩니다. 대신 동작을 시험하세요

관리자 보안은 `.htaccess`의 `Require all denied`로 `config.php`, `includes/`, `storage/`를 막습니다.
이 문법은 **Apache 2.4 전용**이고, Apache 2.2에서는 `500 Internal Server Error`가 납니다.

카페24 호스팅센터에는 Apache 버전을 표시하는 화면이 없습니다. 찾지 마세요.
버전을 알아내는 대신 **실제로 차단이 되는지 시험하면 됩니다.** 4단계에 그 시험이 들어 있습니다.

> PHP 8.4를 돌리는 서버이고 Apache 2.2는 2017년에 지원이 끝났으므로, 2.4일 가능성이 매우 높습니다.
> 그래도 **추측으로 넘기면 안 되는 항목**입니다. 차단이 안 되면 DB 비밀번호가 담긴 `config.php`가 웹에서 그대로 읽힙니다.

만약 4단계 시험에서 500 에러나 파일 내용이 그대로 보이면, 아래 파일들을 바꿔 다시 올리세요.

- `admin/includes/.htaccess`, `admin/storage/.htaccess` → 내용을 전부 아래 2줄로 교체

  ```apache
  Order allow,deny
  Deny from all
  ```

- `admin/.htaccess`, `admin/uploads/.htaccess` → `Require all denied` 줄을 위 2줄로 교체

### 서버 환경을 직접 보고 싶다면

`admin/_server.php`로 아래 내용을 만들어 올리고 `https://여의도기통찬.com/admin/_server.php` 에 접속하면 실제 값이 나옵니다. **확인 후 반드시 삭제하세요.**

```php
<?php
header('Content-Type: text/plain; charset=utf-8');
echo 'SERVER_SOFTWARE: ', $_SERVER['SERVER_SOFTWARE'] ?? '(없음)', "\n";
echo 'PHP SAPI       : ', php_sapi_name(), "\n";
echo 'PHP 버전       : ', PHP_VERSION, "\n";
echo 'Apache 버전    : ', function_exists('apache_get_version') ? apache_get_version() : '(함수 없음 — FastCGI 모드)', "\n";
echo 'upload_max_filesize: ', ini_get('upload_max_filesize'), "\n";
echo 'post_max_size      : ', ini_get('post_max_size'), "\n";
echo 'session.save_path  : ', ini_get('session.save_path'), "\n";
```

### 주의 2 — 한글 도메인이라 실제 주소는 퓨니코드입니다

`여의도기통찬.com`은 한글 도메인(IDN)입니다. 브라우저 주소창에는 한글로 보이지만, DNS·인증서·서버가 실제로 쓰는 값은 퓨니코드입니다.

```
여의도기통찬.com       →  xn--ok0bu9hnyrvkbwwl58i.com
www.여의도기통찬.com   →  www.xn--ok0bu9hnyrvkbwwl58i.com
```

한글이 안 들어가는 칸을 만나면 위 퓨니코드를 넣으세요. 특히:

- **SSL 인증서 발급**: 인증서에 담기는 이름은 퓨니코드입니다. 카페24 무료 SSL 신청 화면이 한글 도메인을 받아주는지 **미리 고객센터에 확인**하세요. 안 되면 유료 인증서나 별도 영문 도메인이 필요할 수 있습니다. — 이 절차에서 가장 막힐 가능성이 큰 지점입니다.
- **검색엔진 등록**: 구글 서치콘솔, 네이버 서치어드바이저에는 퓨니코드로 등록됩니다.
- **나중에 카카오 알림을 켤 때**: `admin/includes/kakao.php`가 `HTTP_HOST`로 redirect URI를 만드는데, 브라우저가 Host 헤더에 퓨니코드를 보내므로 결과도 퓨니코드가 됩니다. 카카오 디벨로퍼스에 **퓨니코드 주소를 그대로** 등록해야 합니다.

지금 켜져 있는 기능(커뮤니티·팝업·계정)은 전부 상대경로라서 한글 도메인의 영향을 받지 않습니다.

> 영문 도메인을 같이 갖고 계시다면 그쪽을 운영 주소로 쓰고 한글 도메인은 리다이렉트로 붙이는 편이 SSL·검색엔진·외부 연동 모두에서 수월합니다. 한글 도메인만 있다면 그대로 진행해도 됩니다.

---

## 1단계. 업로드할 파일 고르기

웹 루트(`/www/`)에 올릴 것과 올리지 말 것이 나뉩니다.

**올릴 것** (10개 항목)

```
.htaccess   index.html   favicon.ico   css/   js/   img/   fonts/   sub/   vendor/   admin/
```

> 루트 `.htaccess`를 빠뜨리지 마세요. HTTP를 HTTPS로 넘기는 리다이렉트가 이 파일에 들어 있습니다(6단계).
> 점으로 시작하는 파일은 클라이언트가 기본으로 숨기기 때문에 자주 누락됩니다.

**올리지 말 것** (개발용이라 서버에 필요 없고, 일부는 올리면 안 됩니다)

```
.git/   .claude/   .screenshots/   node_modules/   scripts/   dist/
unused-images-review/
package.json   package-lock.json   _config.yml   README.md   docs/   .gitignore
admin/config.php.example   admin/schema.sql
```

`config.php.example`과 `schema.sql`은 `.htaccess`로 HTTP 접근이 막혀 있지만, 애초에 올리지 않는 쪽이 안전합니다.

### 올릴 것만 담긴 폴더를 만들어 주는 명령

위 목록을 손으로 골라낼 필요 없습니다. 저장소에서 아래를 실행하면 `dist/` 폴더가 만들어집니다.

```
npm run build:deploy
```

`dist/` **안의 내용 전체**가 서버의 `/www/`에 그대로 대응합니다. 폴더 자체가 아니라 **그 안의 것들**을 올리세요.

| 제외되는 것 | 이유 |
|---|---|
| 참조 없는 이미지 | 어느 HTML·CSS·JS도 가리키지 않는 파일. 목록은 `dist-excluded-images.txt` |
| `img/` 하위 JSON | 이미지 생성 기록. 런타임 미사용 + 프롬프트·로컬경로 노출 방지 |
| `config.php.example`, `schema.sql`, `migrate.php` | 서버에 상시로 둘 이유가 없는 파일 |
| `config.php` | **의도적으로 제외** — 4-3에서 따로 올립니다 |

스크립트가 매번 스스로 확인하고, 하나라도 어긋나면 오류로 멈춥니다.

- HTML·CSS·JS가 참조하는 파일이 **전부 포함**됐는지
- `.htaccess` 5개가 모두 포함됐는지 (루트, `admin/`, `admin/includes/`, `admin/storage/`, `admin/uploads/`)
- 제외 대상이 섞여 들어가지 않았는지
- `admin/uploads/popups`, `admin/uploads/community`, `admin/storage` 폴더 생성

> `img/icons/`와 `img/keypoints/`는 `Footer.js`가 파일명을 변수로 붙여 쓰기 때문에
> 코드 안에 완성된 경로가 없습니다. 스크립트가 이 두 폴더는 통째로 포함합니다.
> 비슷한 패턴을 새로 만들면 `ASSET_DIR_RE`가 잡는 형태(`img/어떤폴더/${변수}`)를 지키세요.

`dist/`는 `.gitignore`에 있어 커밋되지 않습니다. 언제든 다시 만들면 됩니다.

> **왜 저장소를 통째로 올리면 안 되는가** — `scripts/`, `docs/`, `node_modules/`가 딸려 올라가고,
> 무엇보다 `.git/` 폴더가 웹에서 읽히면 전체 소스와 커밋 이력이 그대로 노출됩니다.

---

## 2단계. DB 생성과 스키마 적용

먼저 호스팅센터에서 **MySQL 데이터베이스를 생성**합니다. (뉴 아우토반은 DB가 기본 포함입니다. 이미 있으면 그대로 사용)

그 다음 테이블을 만드는데, **방법이 두 가지**입니다. 편한 쪽을 쓰세요.

`schema.sql`에는 `CREATE DATABASE`가 없으므로 카페24가 미리 만들어둔 DB에 그대로 적용됩니다.
생성되는 테이블은 5개입니다: `admins`, `popups`, `community_posts`, `consultations`, `login_logs`.
(`consultations`는 현재 숨긴 기능이지만 테이블은 미리 만들어둡니다.)

### 방법 A — 카페24 DB 도구 (업로드 전에 가능)

1. 호스팅센터 → **나의서비스관리 → DB 관리**에 있는 링크로 phpMyAdmin(또는 카페24 DB 편집기)을 엽니다.
   **주소를 직접 입력하지 마세요.** 호스팅센터 링크가 유일하게 확실한 경로입니다.
2. 생성한 DB를 선택합니다.
3. `admin/schema.sql`의 내용을 **SQL 탭에 붙여넣고 실행**합니다.

> 그 도구의 설치 경로가 `/admin/` 안쪽(`/admin/dbeditor/` 등)이라면, 우리 관리자 시스템이 들어갈 폴더와 겹칩니다.
> 그런 경우 4단계 업로드에서 FileZilla의 "같은 이름 폴더 삭제/동기화" 옵션을 쓰지 마세요.

### 방법 B — `migrate.php` (DB 도구를 찾기 어려울 때)

저장소에 일회용 스크립트 `admin/migrate.php`가 있습니다. `config.php`의 접속 정보를 그대로 써서 `schema.sql`을 실행합니다.

> **이 방법은 4-3단계 이후에 실행해야 합니다.** `config.php`가 서버에 올라가 있어야 DB에 접속할 수 있기 때문입니다.
> 순서: 4-1 → 4-2 → 4-3 → **방법 B** → 5단계

1. `admin/migrate.php`와 `admin/schema.sql`을 서버의 `/www/admin/`에 올립니다.
   (1단계 "올리지 말 것" 목록에 `schema.sql`이 있지만, 이 방법을 쓸 때는 **잠깐만** 올립니다.)
2. `https://여의도기통찬.com/admin/migrate.php` 에 접속합니다. 안내문만 나오고 아무것도 실행되지 않습니다.
3. `https://여의도기통찬.com/admin/migrate.php?confirm=yes` 에 접속하면 실행됩니다.
4. 실행 결과로 **테이블 5개와 각 행 수**가 표시되는지 확인합니다.
5. **`migrate.php`와 `schema.sql`을 서버에서 삭제합니다.**

안전장치:

- `CREATE TABLE IF NOT EXISTS`만 실행합니다. 이미 있는 테이블과 그 안의 데이터는 건드리지 않고, 삭제·변경하는 문장이 없습니다. 두 번 실행해도 안전합니다.
- `?confirm=yes`가 없으면 실행되지 않습니다.
- 실행 후 DB에 실제로 뭐가 있는지 `SHOW TABLES`로 다시 읽어서 보고하므로, "성공했다고 표시만 되는" 경우가 없습니다.
- 문장 하나라도 실패하면 거기서 멈추고 오류 메시지를 그대로 보여줍니다.
- `schema.sql`은 `.htaccess`가 HTTP 접근을 막으므로, 서버에 올라가 있는 동안에도 웹에서 읽히지 않습니다.

---

## 3단계. `config.php` 만들기

`admin/config.php.example`을 복사해 `config.php`로 이름을 바꾸고, 0단계에 메모한 DB 정보를 채웁니다.

```php
<?php
return [
    'db' => [
        'host' => 'localhost',          // 0단계의 MySQL 호스트
        'name' => '발급받은_DB명',
        'user' => '발급받은_DB계정',
        'pass' => '발급받은_DB비밀번호',
        'charset' => 'utf8mb4',
    ],
    'app_env' => 'production',
    'features' => [
        'consultations' => false,       // 숨김 유지
        'kakao' => false,               // 숨김 유지
    ],
    'kakao' => [
        'rest_api_key' => '',
        'client_secret' => '',
    ],
];
```

> **이 저장소는 공개(public)입니다.** `config.php`는 `.gitignore`에 들어 있습니다.
> DB 비밀번호를 커밋하지 말고, 이 파일은 **서버에만** 두세요.

숨긴 기능(상담 신청 관리 / 카카오톡 알림)은 코드가 그대로 남아 있어서, 나중에 쓰고 싶으면 `false`를 `true`로만 바꾸면 됩니다.

---

## 4단계. 서버에 파일 올리기

> **순서가 중요합니다.** `config.php`에는 DB 비밀번호가 들어갑니다.
> `.htaccess` 차단이 동작하는지 **먼저 시험한 뒤**에 올려야, 차단이 안 되는 경우에도 비밀번호가 노출되지 않습니다.
> 아래 4-1 → 4-2 → 4-3 순서를 지켜주세요.

### 4-1. `config.php`를 뺀 나머지를 먼저 올리기

FileZilla 등으로 접속해 웹 루트(`/www/`)에 1단계에서 만든 `dist/` **안의 내용 전체**를 올립니다.
`config.php`는 `dist/`에 애초에 들어 있지 않으므로, 그대로 올리면 4-3 순서가 지켜집니다.
폴더 구조는 저장소와 **동일하게** 유지해야 합니다. 홈페이지가 `admin/api/public/...`을 상대경로로 호출하기 때문입니다.

```
/www/
├── .htaccess
├── index.html
├── favicon.ico
├── css/  js/  img/  fonts/  sub/  vendor/
└── admin/
    ├── config.php        ← 4-3에서 마지막에 올림 (3단계에서 만든 것)
    ├── setup.php         ← 5단계 후 삭제
    ├── includes/  community/  popups/  accounts/  my-info/  api/
    ├── consultations/  kakao/     ← 숨김 기능 (코드만 보관)
    ├── uploads/          ← 쓰기 권한 필요
    └── storage/          ← 쓰기 권한 필요
```

### 4-2. 보안 차단이 되는지 시험 — 여기서 멈추고 꼭 확인

브라우저에서 아래 두 주소에 접속합니다.
SSL(6단계)을 아직 안 걸었다면 `https://` 대신 `http://`로 접속하세요.

| 주소 | 통과 | 실패 |
|---|---|---|
| `https://여의도기통찬.com/admin/includes/db.php` | **403 Forbidden** | PHP 코드가 보이거나 빈 화면 |
| `https://여의도기통찬.com/admin/login.php` | 로그인 화면 또는 `config.php가 없습니다` 메시지 | **500 Internal Server Error** |

- **둘 다 통과** → `.htaccess`가 정상 동작합니다(Apache 2.4). 4-3으로 넘어갑니다.
- **`db.php` 내용이 보임** → 차단이 안 걸렸습니다. `.htaccess` 파일이 안 올라갔을 가능성이 가장 큽니다(숨김 파일). 확인 후 다시 올리세요.
- **`login.php`가 500 에러** → Apache 2.2입니다. "주의 1"의 `Order allow,deny` 구문으로 바꿔 다시 올린 뒤 이 시험을 반복하세요.

`config.php`를 아직 안 올렸으므로, 이 단계에서 차단이 실패해도 노출되는 비밀 정보는 없습니다.

### 4-3. 차단이 확인됐으면 `config.php` 올리기

3단계에서 만든 `config.php`를 `/www/admin/config.php`로 올립니다.
올린 직후 `https://여의도기통찬.com/admin/config.php` 에 접속해 **403**이 나오는지 한 번 더 확인하세요.

### 함께 확인할 것

- `admin/uploads/popups/`, `admin/uploads/community/`, `admin/storage/` 폴더가 **존재하고 쓰기 가능**해야 합니다.
  빈 폴더는 FTP 클라이언트가 건너뛸 수 있으니 없으면 직접 만드세요. 퍼미션은 `755`로 시작하고, 이미지 저장이 실패하면 `707`을 시도합니다.
- 각 폴더의 `.htaccess`가 함께 올라갔는지 확인하세요. FTP 클라이언트가 **숨김 파일(점으로 시작)을 기본으로 안 보여주는** 경우가 많습니다. 이 파일이 빠지면 보안 차단이 풀립니다.

### 이미지 용량 설정

커뮤니티 대표 이미지가 5MB까지 허용되므로, 호스팅센터 PHP 설정에서 다음을 **5MB 이상**으로 맞춥니다.

- `upload_max_filesize`
- `post_max_size`

`.htaccess`의 `php_value`로 바꾸는 방법은 PHP 실행 모드에 따라 500 에러를 내므로 쓰지 않았습니다. 호스팅센터 설정 화면을 이용하세요.

---

## 5단계. 관리자 계정 만들고 `setup.php` 삭제

1. 브라우저에서 `https://여의도기통찬.com/admin/setup.php?confirm=yes` 접속
2. `admin`(MASTER), `gitongchan`(ADMIN) 두 계정이 **무작위 비밀번호**로 생성되고 화면에 **한 번만** 표시됩니다 → 즉시 기록
3. **`setup.php`를 서버에서 바로 삭제합니다.**
4. `https://여의도기통찬.com/admin/login.php`로 로그인 → "내 정보"에서 비밀번호 변경

`setup.php`는 계정이 하나라도 있으면 실행을 거부하도록 막혀 있지만, 그래도 삭제하는 게 맞습니다.

---

## 6단계. 도메인 연결과 SSL

### 도메인 연결은 이미 끝났습니다

확인 결과 DNS가 이미 서버를 가리키고 있습니다. 이 부분은 할 일이 없습니다.

```
nslookup xn--ok0bu9hnyrvkbwwl58i.com   →  222.122.39.70
```

지금 `여의도기통찬.com`에 접속하면 카페24 기본 안내 페이지가 뜨고, 웹 루트는 비어 있는 상태입니다
(`/index.html`, `/css/style.css` 모두 404). 4단계에서 파일을 올리면 바로 홈페이지로 바뀝니다.

한글 도메인은 명령줄 도구가 인식하지 못할 수 있으니, 직접 조회할 때는 위처럼 퓨니코드를 쓰세요.

### 남은 일 — SSL

1. 호스팅센터에서 **무료 SSL 인증서를 신청**합니다.
   **한글 도메인이라 여기서 막힐 수 있으니, 신청 전에 고객센터에 IDN 지원 여부를 확인하세요** (위 "주의 2").
2. 적용 후 `https://여의도기통찬.com` 으로 접속되는지, 자물쇠 아이콘이 정상인지 확인합니다.

SSL은 선택이 아니라 **필수**입니다. 관리자 로그인 세션 쿠키가 HTTPS일 때만 `secure` 플래그를 받도록 되어 있어서(`admin/includes/bootstrap.php`), HTTP로 운영하면 로그인 세션이 평문으로 오갑니다.

SSL 적용 후에는 HTTP를 HTTPS로 넘기는 설정도 켜두세요.

---

## 7단계. 배포 후 점검 체크리스트

| 확인 | 주소 | 기대 결과 |
|---|---|---|
| 홈페이지 | `https://여의도기통찬.com/` | 정상 표시, 이미지 깨짐 없음 |
| 서브페이지 | `https://여의도기통찬.com/sub/special.html` | 정상 표시 |
| 관리자 로그인 | `https://여의도기통찬.com/admin/login.php` | 로그인 화면 |
| 팝업 API | `https://여의도기통찬.com/admin/api/public/popups.php` | JSON 응답 |
| 커뮤니티 API | `https://여의도기통찬.com/admin/api/public/community.php` | JSON 응답 |
| 상태 API | `https://여의도기통찬.com/admin/api/public/status.php` | JSON 응답 |
| 상담 API (숨김) | `https://여의도기통찬.com/admin/api/public/consultations.php` | **404** |
| 설정 파일 차단 | `https://여의도기통찬.com/admin/config.php` | **403** |
| includes 차단 | `https://여의도기통찬.com/admin/includes/db.php` | **403** |
| setup 삭제 확인 | `https://여의도기통찬.com/admin/setup.php` | **404** |
| migrate 삭제 확인 | `https://여의도기통찬.com/admin/migrate.php` | **404** |
| schema 삭제 확인 | `https://여의도기통찬.com/admin/schema.sql` | **403 또는 404** |

기능 점검:

- 관리자에서 팝업을 하나 등록 → 홈페이지 첫 화면에 뜨는지
- 관리자에서 커뮤니티 글을 이미지와 함께 등록 → `sub/community.html`에 보이는지
- 공지 상단 고정, 게시일 예약이 동작하는지

---

## 문제 해결

| 증상 | 원인 | 조치 |
|---|---|---|
| 관리자 전체가 500 에러 | Apache 2.2에서 `Require all denied` | 0단계 "주의 1"의 구문으로 교체 |
| `config.php가 없습니다` 메시지 | `config.php`가 없거나 경로 오류 | `/www/admin/config.php` 위치 확인 |
| PHP 코드가 글자로 보임 | PHP 미동작 또는 버전 문제 | 호스팅센터에서 PHP 8.x 설정 확인 |
| DB 연결 오류 | 호스트/DB명/계정 불일치 | 0단계 메모와 `config.php` 대조. `localhost`가 아니면 호스팅센터 값 사용. 포트가 다르면 `'port' => 3306` 형태로 추가 |
| 이미지 저장 실패 | `uploads/` 쓰기 권한 또는 PHP 용량 설정 | 퍼미션 `707`, `upload_max_filesize` 5MB 이상 |
| 로그인하면 바로 로그아웃 | 세션 저장 경로 문제 | 호스팅센터 PHP 설정에서 `session.save_path` 확인 |
| 팝업/커뮤니티가 안 뜸 | API 경로 불일치 | 홈페이지와 `admin/`이 **같은 웹 루트**에 있는지 확인 |

---

## 참고 — GitHub Pages는 그대로 둘 수 있습니다

저장소 루트의 `_config.yml`이 `admin/`을 Pages 배포에서 제외합니다.
카페24가 실제 운영 주소가 되고, Pages는 관리자 없는 미리보기로 남습니다. 둘을 같이 유지해도 충돌하지 않습니다.
