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

공통 UI는 기존 React/ReactDOM CDN을 사용합니다. 페이지 본문은 JavaScript나 CDN 로딩 없이도 HTML에 표시됩니다.

하위 메뉴는 `site-local-nav-root` 요소의 `data-nav-group`으로 지정합니다. 소개 페이지는 `intro`, 진료 페이지는 `treatment`, 치료 페이지는 `care`를 사용합니다. 메뉴 링크 묶음은 공통 모듈에서 관리합니다.

## 스타일

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
