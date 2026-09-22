# 여의도기통찬의원 관리자 시스템 (PHP/MySQL)

홈페이지(저장소 루트의 정적 사이트) 옆 `/admin/`에 붙는 관리자 시스템입니다. 순수 PHP 8 + MySQL이라 카페24 "일반형" 같은 공유 PHP 호스팅에 FTP로 그대로 올릴 수 있습니다.

| 메뉴 | 상태 | 비고 |
|---|---|---|
| 커뮤니티 관리 | 사용 | 홈페이지 `sub/community.html`('기가 통하는 커뮤니티')에 노출 |
| 팝업 관리 | 사용 | 홈페이지 첫 화면 팝업 |
| 계정 관리 | 사용 | MASTER 전용 |
| 내 정보 | 사용 | 비밀번호 변경 |
| 상담 신청 관리 | **숨김** | `config.php`의 `features.consultations` |
| 카카오톡 알림 | **숨김** | `config.php`의 `features.kakao` |

숨긴 기능은 코드가 그대로 남아 있고, 메뉴에서 빠지며 해당 페이지와 공개 상담신청 API는 404를 반환합니다. 나중에 쓰려면 `config.php`에서 `true`로 바꾸면 됩니다.

## GitHub Pages에서는 동작하지 않습니다

GitHub Pages는 PHP와 MySQL을 실행하지 않으므로 관리자는 카페24 같은 PHP 호스팅에 올린 뒤부터 동작합니다. 저장소 루트의 `_config.yml`이 `admin/`을 Pages 배포에서 제외하고 있어, Pages에서는 관리자 파일이 공개되지 않습니다. 그동안 홈페이지는 팝업 없이 표시되고, 커뮤니티 페이지는 "준비하고 있습니다" 안내를 보여줍니다.

**이 저장소는 공개(public)입니다.** DB 비밀번호 등은 절대 커밋하지 말고 서버의 `config.php`에만 두세요 (`config.php`는 `.gitignore`로 제외되어 있습니다).

## 카페24 배포 절차

1. **DB 생성**: 카페24 호스팅센터에서 MySQL 데이터베이스를 만들고 접속 정보(호스트/DB명/계정/비번)를 확인합니다.
2. **스키마 적용**: phpMyAdmin 등에서 `schema.sql`을 실행합니다.
3. **설정 파일**: `config.php.example`을 `config.php`로 복사해 DB 접속 정보를 채웁니다. (`.htaccess`로 직접 HTTP 접근이 차단됩니다.)
4. **업로드**: 이 `admin/` 폴더를 서버의 웹 루트 아래 `/admin/`으로 올립니다. 홈페이지 파일들도 같은 웹 루트에 올려야 팝업·커뮤니티가 같은 주소에서 API를 호출합니다.
5. **PHP 버전**: 호스팅센터에서 PHP 8.x로 설정합니다.
6. **업로드 용량**: 호스팅센터의 PHP 설정에서 `upload_max_filesize`/`post_max_size`를 5MB 이상으로 맞춥니다. (`.htaccess`의 `php_value`는 실행 모드에 따라 500 에러를 낼 수 있어 쓰지 않았습니다.)
7. **시드 계정 생성**: `https://도메인/admin/setup.php?confirm=yes`에 접속하면 `admin`(MASTER), `gitongchan`(ADMIN) 계정이 **무작위 비밀번호**로 만들어지고 화면에 한 번만 표시됩니다. 바로 기록한 뒤 **`setup.php`를 서버에서 즉시 삭제하세요.**
8. **비밀번호 변경**: `https://도메인/admin/login.php`에서 로그인한 뒤 "내 정보"에서 비밀번호를 바꿉니다.

## 커뮤니티 게시판

- 본문은 **일반 텍스트**입니다. 줄바꿈은 그대로 보이고, HTML 태그는 글자 그대로 표시됩니다 (게시글에 스크립트가 섞여도 실행되지 않습니다).
- 대표 이미지 1장(JPEG/PNG/WEBP, 5MB 이하)을 첨부할 수 있습니다. 파일 내용으로 형식을 검사하므로 확장자만 바꾼 파일은 거부됩니다.
- **공지로 상단 고정**한 글은 모든 페이지 맨 위에 표시됩니다.
- **게시일**을 미래로 지정하면 그 날부터 노출됩니다(관리자 목록에 "예약"으로 표시).
- 공개 API: `GET /admin/api/public/community.php?page=N`(목록), `?id=N`(상세, 조회수 1 증가).

## 구조

```
includes/   DB 연결, 세션/인증, CSRF, 업로드 처리, 공통 레이아웃, 커뮤니티 폼 (HTTP 접근 차단)
community/  커뮤니티 게시글 관리
popups/     팝업 관리
accounts/   계정 관리 (MASTER 전용)
my-info/    내 정보 및 비밀번호 변경
consultations/, kakao/   숨김 기능
api/public/ 홈페이지가 호출하는 공개 API
uploads/    업로드 이미지 (PHP 실행 차단)
```

## 로컬 테스트

PHP 8과 MySQL(또는 MariaDB)이 있으면 저장소 루트를 문서 루트로 구동합니다. 홈페이지와 `/admin/`이 같은 주소에서 떠서 실제 배포와 같은 구조가 됩니다.

```
php -S 127.0.0.1:8090 -t .
```

`config.php`를 로컬 DB 정보로 만든 뒤 `http://127.0.0.1:8090/admin/setup.php?confirm=yes` → `http://127.0.0.1:8090/admin/login.php` 순으로 접속합니다. `config.php`에 `'port' => 3307`처럼 포트를 지정할 수 있습니다.
