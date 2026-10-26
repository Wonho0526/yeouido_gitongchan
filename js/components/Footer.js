(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";

  const hours = [
    { term: "월 화 목 금", desc: "09:00 ~ 20:00", badge: "야간진료", badgeType: "night" },
    { term: "수요일", desc: "09:00 ~ 19:00" },
    { term: "토요일", desc: "09:00 ~ 14:00", badge: "단축진료", badgeType: "short" },
    { term: "점심시간", desc: "13:30 ~ 14:30" },
  ];

  const hoursNotes = [
    "진료 종료 30분 전 접수 마감입니다.",
    "일요일 · 일반 공휴일 휴진입니다.",
    "토요일 점심시간 없이 진료합니다.",
  ];

  const location = [
    { term: "병원주소", desc: "서울특별시 영등포구 국제금융로 72, 호정빌딩 4층", emphasis: "KB국민은행 동여의도점 건물 4층" },
    { term: "주차안내", desc: "본원 주차 또는 인근 주차장 안내·지원" },
  ];

  // 구글 지도에 등록된 병원 장소를 직접 연결해 병원명과 정확한 위치를 표시한다.
  const mapEmbedSrc = "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357c9fbf73bb54cb%3A0x503dbac6bdc09b7a!2z7Jes7J2Y64-E6riw7Ya17LCs7J2Y7JuQ!5e0!3m2!1sko!2skr!4v1792994113424!5m2!1sko!2skr";

  const patientRights = [
    "① 환자는 인간으로서의 존엄과 가치를 바탕으로 인격을 존중 받을 권리가 있다.",
    "② 환자는 국적, 성별, 연령, 종교, 경제·사회적 지위, 질병의 종류 등 어떤 이유로도 차별 받지 않으며, 평등한 의료 서비스를 받을 권리가 있다.",
    "③ 환자는 최선의 진료를 위하여 지정의 및 의료기관을 선택할 권리가 있다.",
    "④ 환자는 적법한 자격을 갖춘 의료인으로부터 의료행위를 제공받을 권리가 있다.",
    "⑤ 환자 및 보호자는 환자의 진료기록에 관한 정보 및 기록을 요구할 권리가 있다.",
    "⑥ 환자 및 보호자는 환자의 질병상태 및 치료 행위의 목적, 방법, 내용과 그 결과에 대해 설명을 듣고, 치료 방법 또는 치료 거부에 대해 선택할 권리가 있다.",
    "⑦ 환자 및 보호자는 의료행위와 관련된 문서에 서명하기 전에 그 내용에 대해 설명을 들을 권리가 있다.",
    "⑧ 환자 및 보호자는 의료행위에 소요된 의료비 내역에 대해 알 권리가 있다.",
    "⑨ 환자는 질병. 치료에 관련된 정보 및 사생활에 관한 모든 비밀을 침해 받지 않을 권리가 있다.",
    "⑩ 환자 및 보호자는 병원 내 의료서비스를 포함한 기타 사항에 대해 불만이 있을 경우, 의견을 표현하고 그에 대하여 답변을 들을 권리가 있다.",
  ];

  const patientResponsibilities = [
    "① 환자는 현재 증상, 과거 병력, 약물 치료 및 기타 기록 등 진료에 관련된 사안을 직접 또는 법적 대리인을 통해 의료진에게 제공할 책임이 있다.",
    "② 본인의 치료와 관련해 모르는 점이 있을 때, 확인 할 책임이 있다.",
    "③ 환자는 의료진이 권장한 치료 계획에 참여하고, 치료에 협력할 책임이 있다.",
    "④ 환자는 치료 계획 불응 시 발생한 결과에 대한 책임이 있다.",
    "⑤ 환자는 다른 환자 및 의료진을 존중하며, 병원의 자산을 중요시 할 책임이 있다.",
    "⑥ 환자는 치료와 관련된 재정적 의무를 다할 책임이 있다.",
    "⑦ 환자는 병원의 규칙 및 규정에 따를 책임이 있다.",
  ];

  // SAMPLE DATA — placeholder until the clinic supplies its real fee schedule.
  // Replace the groups below (and remove nonCoveredIsSample) once real figures arrive.
  const nonCoveredIsSample = true;
  const nonCoveredBaseDate = "2026. 09. 22";
  const nonCoveredGroups = [
    {
      title: "치료",
      items: [
        { name: "도수치료 (30분)", price: 100000, note: "1회 기준" },
        { name: "도수치료 (50분)", price: 150000, note: "1회 기준" },
        { name: "체외충격파 (일반)", price: 80000, note: "1회 기준" },
        { name: "체외충격파 (고강도 집속형)", price: 120000, note: "1회 기준" },
        { name: "크라이오 냉각치료", price: 50000, note: "1회 기준" },
        { name: "페인케어 (무통증 신호치료)", price: 60000, note: "1회 기준" },
      ],
    },
    {
      title: "주사 · 수액",
      items: [
        { name: "프롤로 주사", price: 70000, note: "1부위 기준" },
        { name: "영양수액 (기본)", price: 50000 },
        { name: "비타민 수액", price: 80000 },
        { name: "회복수액 (고함량)", price: 120000 },
      ],
    },
    {
      title: "제증명 수수료",
      items: [
        { name: "일반진단서", price: 20000 },
        { name: "상해진단서 (3주 미만)", price: 100000 },
        { name: "진료확인서", price: 3000 },
        { name: "진료기록 사본", price: 1000, note: "1~5매, 1매당" },
      ],
    },
  ];

  const formatWon = (value) => `${value.toLocaleString("ko-KR")}원`;

  // Shared shell for the footer's policy dialogs: focus handling, Escape, backdrop, scroll lock.
  function PolicyModal({ titleId, title, onClose, wide = false, children }) {
    const dialogRef = React.useRef(null);

    React.useEffect(() => {
      const previouslyFocused = document.activeElement;
      dialogRef.current && dialogRef.current.focus();
      document.body.classList.add("modal-open");

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          onClose();
        }
        if (event.key === "Tab" && dialogRef.current) {
          const controls = [...dialogRef.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
            .filter(element => !element.disabled && element.getClientRects().length);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) {
            event.preventDefault();
          } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.classList.remove("modal-open");
        previouslyFocused && previouslyFocused.focus && previouslyFocused.focus();
      };
    }, [onClose]);

    return h(
      "div",
      {
        className: "modal-overlay",
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) {
            // Keep the default focus shift from clobbering the focus we restore on unmount.
            event.preventDefault();
            onClose();
          }
        },
      },
      h(
        "div",
        {
          className: wide ? "modal-dialog modal-dialog--wide" : "modal-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleId,
          tabIndex: -1,
          ref: dialogRef,
        },
        h(
          "button",
          { type: "button", className: "modal-close", "aria-label": "닫기", onClick: onClose },
          "×"
        ),
        h("h2", { id: titleId, className: "modal-title" }, title),
        children
      )
    );
  }

  // Supplied privacy policy; clinic identity and contact details updated to this site.
  const privacyPolicyBlocks = [
    {
      "text": "여의도기통찬의원은(이하 '의원' 이라 함) 귀하의 개인정보보호를 매우 중요시하며, 『개인정보보호법』을 준수하고 있습니다. 의원은 개인정보처리방침을 통하여 귀하께서 제공하시는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다. 이 개인정보처리방침의 순서는 다음과 같습니다."
    },
    {
      "heading": true,
      "text": "기준항목"
    },
    {
      "text": "1. 수집하는 개인정보의 항목 및 수집방법\n2. 개인정보의 수집 및 이용목적\n3. 개인정보의 보유 및 이용기간\n4. 개인정보의 파기절차 및 그 방법\n5. 개인정보 제공 및 공유\n6. 수집한 개인정보의 취급위탁\n7. 이용자 및 법정대리인의 권리와 그 행사방법\n8. 동의철회 / 회원탈퇴 방법\n9. 개인정보 자동 수집 장치의 설치/운영 및 그 거부에 관한 사항\n10. 개인정보관리책임자\n11. 개인정보의 안전성 확보조치\n12. 정책 변경에 따른 공지의무"
    },
    {
      "heading": true,
      "text": "수집하는 개인정보의 항목 및 수집방법"
    },
    {
      "text": "의원은 회원가입 시 서비스 이용을 위해 필요한 최소한의 개인정보만을 수집합니다. 귀하가 의원의 서비스를 이용하기 위해서는 회원가입 시 필수항목과 선택항목이 있는데, 메일수신여부 등과 같은 선택항목은 입력하지 않더라도 서비스 이용에는 제한이 없습니다."
    },
    {
      "text": "[홈페이지 회원가입 시 수집항목]\n- 필수항목: 성명, 아이디, 비밀번호, 닉네임, 이메일, 연락처(전화번호 or 휴대폰번호), 외국인을 확인할 수 있는 관련 증명서류(외국인에 한함) ,주소, 메일수신여부, SMS수신여부\n- 선택항목: 필수항목외 회원가입시 등록하는 정보 등\n- 서비스 이용 과정이나 서비스 제공 업무 처리 과정에서 다음과 같은 정보들이 자동으로 생성되어 수집될 수 있습니다. : 서비스 이용기록, 접속 로그, 쿠키, 접속 IP 정보"
    },
    {
      "text": "[개인정보 수집방법]\n- 다음과 같은 방법으로 개인정보를 수집합니다.\n: 홈페이지, 서면양식, 팩스, 전화, 상담 게시판, 이메일, 이벤트 참여"
    },
    {
      "heading": true,
      "text": "개인정보의 수집 및 이용목적"
    },
    {
      "text": "의원은 수집한 개인정보를 다음의 목적을 위해 활용합니다.이용자가 제공한 모든 정보는 하기 목적에 필요한 용도 이외로는 사용되지 않으며 이용 목적이 변경될 시에는 사전 동의를 구할 것입니다."
    },
    {
      "text": "[홈페이지 회원정보]\n- 필수항목: 성명, 아이디, 비밀번호, 닉네임, 이메일, 연락처(전화번호 or 휴대폰번호), 외국인을 확인할 수 있는 관련 증명서류(외국인에 한함) ,주소, 메일수신여부, SMS수신여부\n- 선택항목: 필수항목외 회원가입시 등록하는 정보 등 이메일을 통한 의원 소식, 예약/답변안내 SMS수신, 질병정보 등의 안내, 설문조사, 이벤트참여 외"
    },
    {
      "heading": true,
      "text": "개인정보의 보유 및 이용기간"
    },
    {
      "text": "의원은 개인정보의 수집목적 또는 제공받은 목적이 달성된 때에는 귀하의 개인정보를 지체 없이 파기합니다."
    },
    {
      "text": "[홈페이지 회원정보]\n- 회원가입을 탈퇴하거나 회원에서 제명된 때\n다만, 수집목적 또는 제공받은 목적이 달성된 경우에도 상법 등 법령의 규정에 의하여 보존할 필요성이 있는 경우에는 귀하의 개인정보를 보유할 수 있습니다.\n- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)\n- 신용정보의 수집/처리 및 이용 등에 관한 기록: 3년 (신용정보의 이용 및 보호에 관한 법률)\n- 본인 확인에 관한 기록: 6개월 (정보통신망 이용촉진 및 정보보호 등에 관한 법률)\n- 방문에 관한 기록: 3개월 (통신비밀보호법)"
    },
    {
      "heading": true,
      "text": "개인정보의 파기절차 및 그 방법"
    },
    {
      "text": "의원은 『개인정보의 수집 및 이용목적』이 달성된 후에는 즉시 파기합니다. 파기절차 및 방법은 다음과 같습니다."
    },
    {
      "text": "[파기절차]\n- 이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 파기방법에 의하여 즉시 파기합니다."
    },
    {
      "text": "[파기방법]\n- 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다."
    },
    {
      "heading": true,
      "text": "개인정보 제공 및 공유"
    },
    {
      "text": "의원은 귀하의 동의가 있거나 관련법령의 규정에 의한 경우를 제외하고는 어떠한 경우에도 『개인정보의 수집 및 이용목적』에서 고지한 범위를 넘어 귀하의 개인정보를 이용하거나 타인 또는 타기업ㆍ기관에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.\n- 이용자들이 사전에 공개에 동의한 경우\n- 통계작성ㆍ학술연구를 위하여 필요한 경우 특정 개인을 알아볼 수 없는 형태로 가공하여 제공\n- 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우 제출 등"
    },
    {
      "heading": true,
      "text": "수집한 개인정보의 취급위탁"
    },
    {
      "text": "의원은 현재 개인정보의 처리업무를 외부에 위탁하고 있지 않습니다. 향후 위탁이 필요한 경우 수탁업체와 위탁업무 내용을 이 방침에 공개하고, 관계 법령에 따라 개인정보가 안전하게 관리되도록 필요한 사항을 위탁계약에 반영하겠습니다."
    },
    {
      "heading": true,
      "text": "이용자 및 법정대리인의 권리와 그 행사방법"
    },
    {
      "text": "만14세 미만 아동(이하 \"아동\"이라 함)의 회원가입은 아동이 이해하기 쉬운 평이한 표현으로 작성된 별도의 양식을 통해 이루어지고 있으며 개인정보 수집시 반드시 법정대리인의 동의를 구하고 있습니다. 의원은 법정대리인의 동의를 받기 위하여 아동으로부터 법정대리인의 성명과 연락처 등 최소한의 정보를 수집하고 있으며, 개인정보취급방침에서 규정하고 있는 방법에 따라 법정대리인의 동의를 받고 있습니다. 아동의 법정대리인은 아동의 개인정보에 대한 열람, 정정 및 삭제를 요청할 수 있습니다. 아동의 개인정보를 열람/정정, 삭제하고자 할 경우에는 회원정보수정을 클릭하여 법정대리인 확인 절차를 거치신 후 아동의 개인정보를 법정대리인이 직 열람/정정, 삭제하거나, 개인정보보호책임자로 서면, 전화, 또는 Fax등으로 연락하시면 필요한 조치를 취합니다. 의원은 아동에 관한 정보를 제3자에게 제공하거나 공유하지 않으며, 아동으로부터 수집한 개인정보에 대하여 법정대리인이 오류의 정정을 요구하는 경우 그 오류를 정정할 때까지 해당 개인정보의 이용 및 제공을 금지합니다.\n※ 법에 의해 보관이 의무화된 개인정보는 요청이 있더라도 보관기간 내에 수정/삭제할 수 없습니다."
    },
    {
      "heading": true,
      "text": "동의철회 / 회원탈퇴 방법"
    },
    {
      "text": "귀하는 회원가입 시 개인정보의 수집ㆍ이용 및 제공에 대해 동의하신 내용을 언제든지 철회하실 수 있습니다. 회원탈퇴는 개인정보관리책임자에게 서면, 전화 또는 Fax 등으로 연락하시면 지체 없이 귀하의 개인정보를 파기하는 등 필요한 조치를 하겠습니다."
    },
    {
      "heading": true,
      "text": "개인정보 자동 수집 장치의 설치/운영 및 그 거부에 관한 사항"
    },
    {
      "text": "의원은 귀하의 정보를 수시로 저장하고 찾아내는 '쿠키(cookie)'를 운용합니다. 쿠키란 의원의 웹사이트를 운영하는데 이용되는 서버가 귀하의 브라우저에 보내는 아주 작은 텍스트 파일로서 귀하의 컴퓨터 하드디스크에 저장됩 다. 의원은 다음과 같은 목적을 위해 쿠키를 사용합니다. 귀하는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 귀하는 웹 브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다. 회원님께서 쿠키 설치를 거부하셨을 경우 일부 서비스 제공에 어려움이 있습니다."
    },
    {
      "heading": true,
      "text": "개인정보관리책임자"
    },
    {
      "text": "귀하의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 의원은 아래와 같이 개인정보관리책임자를 두고 있습니다."
    },
    {
      "text": "개인정보관리책임자 성명 : 이동현\n전화번호 :  02-782-7070"
    },
    {
      "text": "귀하께서는 의원의 서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보관리책임자로 신고하실 수 있습니다. 의원은 이용자들의 신고사항에 대해 신속하게 충분한 답변을 드릴 것입니다. 기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.\n- 개인분쟁조정위원회 (http://www.1336.or.kr / 1336)\n- 정보보호마크인증위원회 (http://www.eprivacy.or.kr / (02) 580-0533~4)\n- 대검찰청 사이버범죄수사단 (http://www.spo.go.kr / (02) 3480-3573)\n- 경찰청 사이버테러대응센터 (http://www.ctrc.go.kr / (02) 392-0330)"
    },
    {
      "heading": true,
      "text": "개인정보의 안전성 확보조치"
    },
    {
      "text": "의원은 이용자의 개인정보보호를 위한 기술적 대책으로서 여러 보안장치를 마련하고 있습니다. 이용자께서 보내시는 모든 정보는 방화벽장치에 의해 보호되는 보안시스템에 안전하게 보관/관리되고 있습니다. 또한 의원은 이용자의 개인정보보호를 위한 관리적 대책으로서 이용자의 개인정보에 대한 접근 및 관리에 필요한 절차를 마련하고, 이용자의 개인정보를 취급하는 인원을 최소한으로 제한하여 지속적인 보안교육을 실시하고 있습니다. 또한 개인정보를 처리하는 시스템의 사용자를 지정하여 사용자 비밀번호를 부여하고 이를 정기적으로 갱신하겠습니다."
    },
    {
      "heading": true,
      "text": "이메일무단수집거부"
    },
    {
      "text": "여의도기통찬의원은 고객님의 이메일 정보를 소중히 보호하고 있습니다. 본 페이지에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로 수집되는 것을 거부하며, 이를 위반 시 정보통신망법에 의해 형사처벌 됨을 유념하시기 바랍니다."
    },
    {
      "heading": true,
      "text": "정책 변경에 따른 공지의무"
    },
    {
      "text": "이 개인정보취급방침은 2011년 09월 01일에 제정되었으며 법령ㆍ정책 또는 보안기술의 변경에 따라 내용의 추가ㆍ삭제 및 수정이 있을 시에는 변경되는 개인정보취급방침을 시행하기 최소 7일전에 의원 홈페이지를 통해 변경이유 및 내용 등을 공지하도록 하겠습니다."
    },
    {
      "text": "공고일자: 2025년 03월 01일\n시행일자: 2025년 03월 01일"
    }
  ];

  function PrivacyPolicyModal({ onClose }) {
    return h(PolicyModal,
      { titleId: "privacy-policy-title", title: "개인정보처리방침", onClose, wide: true },
      h("div", { className: "privacy-policy-content" },
        privacyPolicyBlocks.map((block, index) => block.details
          ? h("dl", { key: index, className: "privacy-policy-details", "aria-label": "개인정보 위탁처리 정보" },
              block.details.map(item => h("div", { key: item.label },
                h("dt", null, item.label), h("dd", null, item.value))))
          : h(block.heading ? "h3" : "p", { key: index }, block.text))
      )
    );
  }

  function PatientRightsModal({ onClose }) {
    return h(
      PolicyModal,
      { titleId: "patient-rights-title", title: "환자 권리장전", onClose },
      h(
        "p",
        { className: "modal-lead" },
        "모든 환자는 인간으로서 존엄과 가치를 지니고, 건강한 삶을 영위하기 위해 다음과 같은 권리를 가지며 이에 따른 책임과 의무를 가진다."
      ),
      h(
        "div",
        { className: "modal-body" },
        h(
          "div",
          { className: "modal-section" },
          h("h3", null, "환자의 권리"),
          h(
            "ul",
            { className: "modal-list" },
            patientRights.map((item) => h("li", { key: item }, item))
          )
        ),
        h(
          "div",
          { className: "modal-section" },
          h("h3", null, "환자의 책임"),
          h(
            "ul",
            { className: "modal-list" },
            patientResponsibilities.map((item) => h("li", { key: item }, item))
          )
        )
      )
    );
  }

  function NonCoveredModal({ onClose }) {
    return h(
      PolicyModal,
      { titleId: "non-covered-title", title: "비급여 진료비용 안내", onClose, wide: true },
      nonCoveredIsSample &&
      h(
        "p",
        { className: "modal-sample-notice", role: "note" },
        "아래 금액은 화면 구성을 위한 예시이며, 실제 진료비와 다릅니다."
      ),
      h(
        "p",
        { className: "modal-lead" },
        "의료법 제45조에 따라 비급여 진료비용을 안내해 드립니다. 환자분의 상태와 치료 내용에 따라 비용이 달라질 수 있으니 자세한 사항은 진료 시 문의해 주세요."
      ),
      h(
        "div",
        { className: "modal-body" },
        nonCoveredGroups.map((group) =>
          h(
            "div",
            { className: "modal-section", key: group.title },
            h("h3", null, group.title),
            h(
              "table",
              { className: "modal-table" },
              h("caption", { className: "modal-sr-only" }, `${group.title} 비급여 비용`),
              h(
                "thead",
                null,
                h("tr", null, h("th", { scope: "col" }, "항목"), h("th", { scope: "col" }, "금액"))
              ),
              h(
                "tbody",
                null,
                group.items.map((item) =>
                  h(
                    "tr",
                    { key: item.name },
                    h(
                      "th",
                      { scope: "row" },
                      item.name,
                      item.note && h("span", { className: "modal-table-note" }, item.note)
                    ),
                    h("td", null, formatWon(item.price))
                  )
                )
              )
            )
          )
        )
      ),
      h(
        "p",
        { className: "modal-footnote" },
        `기준일 ${nonCoveredBaseDate}${nonCoveredIsSample ? " (예시)" : ""}`
      )
    );
  }

  const DefinitionRows = ({ items }) =>
    items.map((item) =>
      h(
        "div",
        { key: item.term },
        items === hours
          ? h("dt", { className: "footer-hours-label", "aria-label": item.term },
              [...item.term.replace(/\s/g, "")].map((letter, index) =>
                h("span", { key: index, "aria-hidden": "true" }, letter)))
          : h("dt", null, item.term),
        h(
          "dd",
          null,
          h("span", null, item.desc),
          item.emphasis && h("strong", { className: "footer-location-emphasis" }, item.emphasis),
          item.badge && h("span", { className: `clinic-hours-badge clinic-hours-badge--${item.badgeType}` }, item.badge)
        )
      )
    );

  function FooterIcon({ name }) {
    const shapes = {
      clock: [
        h("circle", { key: "circle", cx: 12, cy: 12, r: 10 }),
        h("path", { key: "hands", d: "M12 6v6l4 2" }),
      ],
      location: [
        h("path", { key: "pin", d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }),
        h("circle", { key: "center", cx: 12, cy: 10, r: 3 }),
      ],
      phone: h("path", { d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" }),
    };
    return h("svg", {
      className: "footer-info-icon", width: 35, height: 35, viewBox: "0 0 24 24",
      fill: "none", stroke: "currentColor", strokeWidth: 1.8,
      strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false",
    }, shapes[name]);
  }

  function FooterInfoBlock({ id, title, items, icon, className = "", notes = [] }) {
    return h(
      "div",
      {
        className: ["footer-info-block", className].filter(Boolean).join(" "),
        "aria-labelledby": id,
      },
      h("h3", { id }, h(FooterIcon, { name: icon }), title),
      h("dl", null, h(DefinitionRows, { items })),
      notes.length > 0 && h(
        "ul",
        { className: "clinic-hours-notes", "aria-label": "진료 안내" },
        notes.map((note) => h("li", { key: note }, note))
      )
    );
  }

  const keyPoints = [
    {
      title: "주력 진료분야",
      text: "여의도기통찬은 척추, 관절, 근육, 힘줄 등\n근골격계 통증의 비수술적 치료와\n만성통증 및 자율신경 치료를 주력으로 하고 있습니다.",
    },
    {
      title: "타협하지 않는 원칙",
      text: "아무리 바쁘고 어려운 상황에 직면하더라도,\n환자를 위한 치료의 원칙만큼은 타협하지 않고\n초심을 유지하겠습니다.",
    },
    {
      title: "해가 되지 않는 치료",
      text: "몸에 해가 되지 않고, 이로운 치료를 추구합니다.\n단순히 겉으로 드러난 증상만을 바라보기보다,\n근본적인 원인을 찾아 치료를 하겠습니다.",
    },
    {
      title: "가족을 대하는 마음",
      text: "‘이 환자가 내 가족이라면 어떻게 치료할까?’라는 고민에서 치료 계획을 시작합니다.\n나와 내 가족도 안심하고 받을 수 있는 치료를 한다는 마음으로\n성심성의껏 정직하게 진료하겠습니다.",
    },
  ];

  function KeyPointIcon({ index }) {
    const images = [
      "treatment-v2.png", "principles-v2.png", "healing-v2.png", "family-v2.png",
    ];
    return h("img", {
      className: "footer-key-point-icon",
      src: `${rootPrefix}img/keypoints/${images[index]}`,
      width: 1254, height: 1254, alt: "", "aria-hidden": "true",
      loading: "lazy", decoding: "async",
    });
  }

  function FooterKeyPoints() {
    return h(
      "section",
      { className: "footer-key-points", "aria-labelledby": "footer-key-points-title" },
      h(
        "div",
        { className: "inner" },
        !isSubPage && h("span", { className: "clinic-kicker footer-kicker" }, "YEOUIDO GITONGCHAN"),
        h("h2", { id: "footer-key-points-title" }, "여의도기통찬의", h("br"), h("span", null, "4가지 key point")),
        h(
          "div",
          { className: "footer-key-points-grid" },
          keyPoints.map((point, index) => h(
            "article",
            { className: "footer-key-point", key: point.title },
            h(KeyPointIcon, { index }),
            h("p", { className: "footer-key-point-label" }, `KEY POINT ${index + 1}`),
            h("h3", null, point.title),
            h("p", { className: "footer-key-point-text" }, point.text)
          ))
        )
      )
    );
  }

  function Footer() {
    const [openModal, setOpenModal] = React.useState(null);
    // Stable so the dialog's focus/Escape effect doesn't re-run on every Footer render.
    const closeModal = React.useCallback(() => setOpenModal(null), []);

    return h(
      "footer",
      { className: "site-footer" },
      !isSubPage && h(
        "div",
        { className: "footer-contact", id: "hours" },
        h(
          "div",
          { className: "inner-fluid footer-contact-inner" },
          !isSubPage && h("span", { className: "clinic-kicker footer-kicker" }, "YEOUIDO GITONGCHAN"),
          h("h2", null, "여의도기통찬의원", h("br"), h("span", null, "진료시간 및 오시는 길")),
          h(
            "p",
            { className: "footer-contact-desc" },
            h("span", null, "오시는 길부터 부담 없도록, 지하철과 버스로 닿기 쉬운 여의도 중심에 자리했습니다.")
          ),
          h(
            "div",
            { className: "footer-map" },
            h("iframe", {
              className: "footer-map-frame",
              src: mapEmbedSrc,
              title: "여의도기통찬의원 위치 구글 지도",
              loading: "lazy",
              referrerPolicy: "no-referrer-when-downgrade",
              allowFullScreen: true,
            })
          ),
          h(
            "div",
            { className: "inner footer-info-grid" },
            h(FooterInfoBlock, {
              id: "footer-hours-title",
              icon: "clock",
              title: "진료시간",
              items: hours,
              className: "clinic-hours",
              notes: hoursNotes,
            }),
            h(FooterInfoBlock, {
              id: "footer-location-title",
              icon: "location",
              title: "오시는 길",
              items: location,
              className: "footer-location",
            }),
            h(
              "div",
              {
                className: "footer-info-block footer-call",
                "aria-labelledby": "footer-call-title",
              },
              h("h3", { id: "footer-call-title" }, h(FooterIcon, { name: "phone" }), "진료문의"),
              h("p", null, "02-782-7070")
            )
          ),
          h("div", { className: "section-more" },
            h("a", { href: quickLinkUrls.place, className: "view-more-btn", target: "_blank", rel: "noopener noreferrer", "data-naver-reservation": "", "data-track-event": "네이버 예약 클릭" }, "예약 바로가기"))
        )
      ),
      h(
        "div",
        { className: "footer-business" },
        h(
          "div",
          { className: "inner footer-business-inner" },
          h(
            "a",
            { href: `${rootPrefix}index.html`, className: "footer-logo", "aria-label": "여의도기통찬의원 홈" },
            h("img", { src: `${rootPrefix}img/logo_wide.png`, alt: "여의도기통찬의원" })
          ),
          h(
            "div",
            { className: "footer-company-text" },
            h(
              "p",
              null,
              "대표자 : 이동현 ",
              h("span", null, "|"),
              " ",
              h("span", { className: "keep-word" }, "사업자등록번호 : 458-95-01994")
            ),
            h(
              "p",
              null,
              "주소 : 서울특별시 영등포구 ",
              h("span", { className: "keep-word" }, "국제금융로 72 4층"),
              "(여의도동, 호정빌딩)"
            ),
            h(
              "p",
              null,
              h("span", { className: "keep-word" }, "TEL : 02-782-7070"),
              " ",
              h("span", null, "|"),
              " ",
              h("span", { className: "keep-word" }, "FAX : 02-782-7071")
            )
          ),
          h(
            "div",
            { className: "footer-policy-links" },
            h(
              "button",
              { type: "button", className: "footer-policy-link", onClick: () => setOpenModal("nonCovered") },
              "비급여항목"
            ),
            h("span", { "aria-hidden": "true" }, "|"),
            h("button",
              { type: "button", className: "footer-policy-link", onClick: () => setOpenModal("privacy") },
              "개인정보처리방침"
            ),
            h("span", null, "|"),
            h(
              "button",
              { type: "button", className: "footer-policy-link", onClick: () => setOpenModal("rights") },
              "환자권리장전"
            ),
            h("span", null, "|"),
            h("a", { href: `${rootPrefix}sub/admin.html`, rel: "nofollow" }, "관리자")
          )
        )
      ),
      openModal === "privacy" && h(PrivacyPolicyModal, { onClose: closeModal }),
      openModal === "rights" && h(PatientRightsModal, { onClose: closeModal }),
      openModal === "nonCovered" && h(NonCoveredModal, { onClose: closeModal })
    );
  }

  const quickLinkUrls = {
    // 예약과 오시는길은 모두 네이버 플레이스로 보낸다. 버튼 문구는 그대로 둔다.
    place: "https://m.place.naver.com/hospital/2098208942/home?entry=pll",
    kakao: "http://pf.kakao.com/_BUfmX",
    blog: "https://blog.naver.com/yeouidogtc",
    instagram: "https://www.instagram.com/yeouido_gtc/",
    daangn: "https://www.daangn.com/kr/local-profile/vask3g92ky22/?referrer=share",
  };

  function QuickLinks() {
    // 좁은 화면과 높이가 짧은 화면에서는 토글 뒤에 접어 둔다. 데스크톱에서는 늘 펼쳐 둔다.
    const compactQuery = "(max-width: 920px), (max-height: 760px)";
    const [compact, setCompact] = React.useState(() => window.matchMedia(compactQuery).matches);
    const [open, setOpen] = React.useState(false);
    const navRef = React.useRef(null);
    const toggleRef = React.useRef(null);

    React.useEffect(() => {
      const media = window.matchMedia(compactQuery);
      const update = () => { setCompact(media.matches); setOpen(false); };
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }, []);

    // 펼쳤을 때만 본문·푸터가 퀵바 앞에서 끊기도록 body에 표시를 남긴다. 퀵바는 푸터보다
    // 뒤에 붙어서 CSS 선택자로는 앞의 요소에 닿지 못하므로 클래스로 알린다.
    React.useEffect(() => {
      const on = compact && open;
      document.body.classList.toggle("quick-links-open", on);
      return () => document.body.classList.remove("quick-links-open");
    }, [compact, open]);

    React.useEffect(() => {
      if (!compact || !open) return;
      const dismiss = (event) => {
        if (navRef.current && !navRef.current.contains(event.target)) setOpen(false);
      };
      const escape = (event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggleRef.current?.focus();
        }
      };
      document.addEventListener("pointerdown", dismiss);
      document.addEventListener("keydown", escape);
      return () => {
        document.removeEventListener("pointerdown", dismiss);
        document.removeEventListener("keydown", escape);
      };
    }, [compact, open]);

    const items = [
      { id: "top", label: "최상단 이동", icon: "arrow-up.svg" },
      { id: "reservation", label: "네이버 예약", icon: "naver_reservation_icon-1.png", href: quickLinkUrls.place, external: true },
      { id: "phone", label: "전화 문의", icon: "phone-color.svg", href: "tel:027827070" },
      { id: "location", label: "오시는길", icon: "map-pin-color.svg", href: quickLinkUrls.place, external: true },
      { id: "daangn", label: "당근마켓", icon: "logoImage.png", href: quickLinkUrls.daangn, external: true },
      { id: "instagram", label: "인스타그램", icon: "instargram.png", href: quickLinkUrls.instagram, external: true },
      { id: "kakao", label: "카카오톡 상담", icon: "free-icon-kakao-talk-2111466.png", href: quickLinkUrls.kakao, external: true },
      { id: "blog", label: "네이버 블로그", icon: "blog.png", href: quickLinkUrls.blog, external: true },
    ];

    return h("nav", { className: `quick-links${open ? " is-open" : ""}`, "aria-label": "빠른 안내", ref: navRef },
      h("div", {
        className: "quick-links-panel", id: "quick-links-panel",
        "aria-hidden": compact && !open ? "true" : undefined,
        inert: compact && !open ? "" : undefined,
      },
      items.map((item) => {
        const unavailable = item.id !== "top" && !item.href;
        const props = {
          key: item.id,
          "data-naver-reservation": item.id === "reservation" ? "" : undefined,
          // 방문통계 전환 이벤트. tracker.js가 data-track-event를 가진 요소의 클릭을 집계한다.
          "data-track-event": item.id === "reservation" ? "네이버 예약 클릭" : item.id === "kakao" ? "카카오톡 상담 클릭" : undefined,
          className: `quick-link quick-link--${item.id}`,
          "aria-label": unavailable ? `${item.label} (준비 중)` : item.label,
          title: unavailable ? `${item.label} (준비 중)` : item.label,
          // 접혀 있을 때는 탭 이동으로도 닿지 않게 한다.
          tabIndex: compact && !open ? -1 : undefined,
        };
        if (item.href) {
          props.href = item.href;
          if (item.external && item.href !== "#") {
            props.target = "_blank";
            props.rel = "noopener noreferrer";
          }
        } else {
          props.type = "button";
          props.disabled = unavailable;
          if (item.id === "top") {
            props.onClick = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }
        }
        return h(item.href ? "a" : "button", props,
          h("img", { src: `${rootPrefix}img/icons/${item.icon}`, width: 24, height: 24, alt: "", "aria-hidden": "true" }),
          item.id !== "top" && h("span", null, item.label)
        );
      })),
      h("button", {
        type: "button", className: "quick-links-toggle", ref: toggleRef,
        "aria-label": open ? "빠른 안내 메뉴 닫기" : "빠른 안내 메뉴 열기",
        "aria-expanded": open, "aria-controls": "quick-links-panel",
        onClick: () => setOpen((value) => !value),
      }, h("img", { src: `${rootPrefix}img/logo_back.png`, alt: "", width: 40, height: 40 }))
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.QuickLinks = QuickLinks;
  window.YgtcComponents.Footer = Footer;
})();
