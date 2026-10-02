# 여의도기통찬의원 홈페이지

별도 빌드 없이 HTML을 열거나 정적 웹 서버에서 실행할 수 있습니다.

## 페이지 내용 수정

- 메인 페이지: `index.html`
- 서브페이지: `sub/*.html`
- 제목, 본문, 사진 경로, 질환 목록, 모든 치료 탭 설명은 해당 HTML에서 수정합니다.
- 히어로 배경은 각 HTML의 `sub-hero-background` 이미지 `src`에서 변경합니다. 오버레이와 텍스트 스타일은 `css/subpage.css`에서 공통으로 관리합니다.
- 생성한 서브페이지 히어로 이미지는 `img/heroes/*-natural-v1.webp`에 있습니다. 생성 방식과 페이지별 프롬프트는 `img/heroes/manifest.json`에 기록했습니다. 실제 병원·의료진·보유 장비·주변 경관을 촬영한 사진이 아닌 장식용 AI 이미지입니다.
- 이전에 생성했던 진료 대표 이미지 4장과 시설 이미지 4장은 자연스러운 사진 스타일로 재생성한 `img/editorial/*-natural-v2.webp`로 교체했습니다. 교체 대상과 생성 프롬프트는 `img/editorial/manifest.json`에 있습니다. 시설 이미지 역시 실제 병원 촬영본이 아닌 AI 연출 이미지이며, 기존 원본과 히어로·질환 이미지는 유지했습니다.
- 사진의 중심 위치는 해당 HTML 이미지의 `style="--hero-image-position: 50% 50%"` 값으로 조정할 수 있습니다.
- 치료 탭은 같은 `data-treatment-tabs` 영역 안에 버튼과 설명 패널을 둡니다. 버튼의 `aria-controls`와 패널의 `id`, 패널의 `aria-labelledby`와 버튼의 `id`를 각각 연결합니다.
- 첫 번째 패널을 제외한 패널에는 `hidden` 속성을 둡니다. 페이지 안에서 각 ID는 고유해야 합니다.

## 공통 모듈

- `js/components/Header.js`: 전체 메뉴와 헤더
- 메인과 서브페이지는 `css/header.css`의 동일한 150px 높이의 고정 헤더를 사용합니다. 최대 너비 제한 없이 좌우 여백은 각각 40px입니다. PC 메인의 첫 히어로 영역에서만 투명하며, 이후 영역과 모든 서브페이지에서는 흰색 배경입니다. 모바일 메뉴 형태는 항상 흰색 배경을 유지합니다. 로고 너비는 PC 240px, 모바일 최대 200px입니다. 1440px 이하에서는 메뉴 버튼으로 전체 메뉴를 열고, 1차 메뉴를 눌러 2차 메뉴를 펼칩니다. 반응형 기준을 변경할 때는 `Header.js`의 `matchMedia` 값도 함께 변경합니다.
- `js/components/Footer.js`: 진료안내, 지도, 사업자 정보와 푸터
- `js/components/LocalNavigation.js`: 서브페이지 하위 메뉴
- `js/layout.js`: 공통 모듈을 각 페이지의 지정 영역에 표시
- `js/subpage.js`: HTML에 작성된 치료 탭의 클릭과 키보드 전환
- `js/main.js`: 메인 페이지 HTML에 작성된 중점 진료 슬라이더 동작

공통 UI는 `vendor/react/`의 React/ReactDOM 18.3.1을 사용합니다. 외부 CDN 연결 없이 메뉴와 푸터를 표시하며, 페이지 본문은 JavaScript 없이도 HTML에 표시됩니다.

하위 메뉴는 `site-local-nav-root` 요소의 `data-nav-group`으로 지정합니다. 소개 페이지는 `intro`, 진료 페이지는 `treatment`, 치료 페이지는 `care`를 사용합니다. 메뉴 링크 묶음은 공통 모듈에서 관리합니다.

## 9월 25일 수정안 반영

- 기존 레이아웃을 유지하면서 지정 문구와 메뉴, 연결 동선을 반영했습니다. 추가 스타일은 `css/revision.css`에서 관리합니다.
- 새 상세페이지: `sub/special.html`, `sub/c-arm.html`, `sub/ultrasound.html`, `sub/spaces.html`. 진료환경 하위 메뉴 그룹은 `environment`입니다.
- 진료 안내는 `sub/location.html`에 통합했습니다. 이전 `hours.html`, `equipment.html`은 관련 페이지로 이동하며, 삭제된 커뮤니티 화면은 홈으로 이동합니다. 관리자 기능과 데이터는 유지합니다.
- 모바일 상단 높이는 768px 이하에서 80px이며 로고와 메뉴 버튼 크기는 유지합니다. 부위 선택 탭은 상단에 고정되고, 질환 선택 탭은 해당 질환의 설명·특징·증상 패널을 표시합니다.
- 메인 비주얼은 4개 슬라이드입니다. 모바일 스와이프, 좌우 버튼, 위치 점으로 이동합니다. 현재 카피는 수정안의 문구를 활용한 시안입니다.
- 새로 필요한 실사진은 `asset-placeholder` 클래스로 영역만 표시했습니다. 자료 수령 후 해당 요소를 이미지로 교체합니다. 기존 사진 중 별도 교체 지시가 없는 사진은 유지했습니다.
- `npm run verify:revision`은 모바일·PC 20개 페이지, 메뉴, 질환 탭과 앵커, 슬라이드, 예약 링크를 검증합니다.

### 네이버 예약 href 변경 위치

예약 링크는 모두 일반 `<a>`이며 클릭을 막는 이벤트나 비활성 처리가 없습니다. `data-naver-reservation`으로 검색하여 현재 `href="#"`를 실제 병원 네이버 예약 URL로 교체하면 됩니다.

| 노출 위치 | 수정 파일 |
| --- | --- |
| 공통 상단 메뉴 | `js/components/Header.js`의 예약 바로가기 항목 `href` |
| 공통 하단 예약 버튼 | `js/components/Footer.js`의 `data-naver-reservation` 링크 `href` |
| 공통 빠른 안내 메뉴 | `js/components/Footer.js`의 `id: "reservation"` 항목 `href` |
| 진료 안내 페이지 | `sub/location.html`의 예약 바로가기 `href` |
| 기능회복 수액 페이지 | `sub/recovery-iv.html`의 예약 안내 `href` |

실제 예약 URL이 제공되지 않았으므로 현재는 `#`로 두었습니다. URL 교체 외에 JavaScript 수정이나 빌드 작업은 필요하지 않습니다.

## 스타일

질환 상세페이지 6곳은 첨부 레퍼런스에 맞춰 `css/conditions.css`의 흰 배경, 네이비·골드, 원형 이미지 및 증상 영역을 사용합니다. `js/conditions.js`가 질환 선택, 키보드 이동, URL 해시와 뒤로가기를 관리합니다. 기존 29개 질환의 설명·대표 증상과 부위별 소개·강조 문구를 유지했습니다. JavaScript가 없으면 모든 질환을 이어서 읽을 수 있습니다.

부위별 AI 설명 이미지 6장은 `img/conditions/anatomy/`에 있으며 생성 도구와 전체 프롬프트는 해당 폴더의 `manifest.json`에 기록했습니다. 실제 환자 영상이 아닌 일반적인 부위 이해용 이미지입니다. `npm run verify:conditions`로 질환 탭과 모바일·PC 레이아웃, 파일 직접 열기를 검증합니다.

- `css/reset.css`, `css/common.css`: 공통 기본 스타일
- `css/header.css`: 전체 페이지의 공통 헤더와 반응형 메뉴
- `css/style.css`: 메인 페이지와 푸터 스타일
- `css/subpage.css`: 서브페이지 레이아웃과 반응형 스타일

## 아이콘

통증관리 단계의 인라인 SVG는 Lucide의 `syringe`, `person-standing`, `shield-check` 아이콘을 사용합니다. 출처는 https://github.com/lucide-icons/lucide 이며 라이선스는 `img/icons/LICENSE-lucide.txt`에 있습니다.

## 글꼴

- 전체 페이지는 로컬에 포함된 Pretendard Variable v1.3.9를 사용합니다.
- 글꼴 파일과 SIL Open Font License는 `fonts/pretendard/`에 있습니다.
- 공식 배포처: https://github.com/orioncactus/pretendard
- `css/reset.css`에서 글꼴을 불러오고 `css/common.css`의 `--font-family`에서 공통 글꼴을 지정합니다.
