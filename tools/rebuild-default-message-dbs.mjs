import fs from "node:fs";
import path from "node:path";

const safetyHwpPath = path.resolve("report/safety-hwp-extracted.txt");
const auditPath = path.resolve("report/message-1-source-audit.json");

const weekdaysKo = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const sourceRefs = {
  hwp: "SOURCE-SSONG-HWP-SAFETY-NOTE",
  schoolSafety: "SOURCE-SCHOOLSAFE-7-STANDARDS-2025",
  moeSafety: "SOURCE-MOE-SCHOOL-SAFETY-7-STANDARDS",
  goeSafety: "SOURCE-GOE-ELEMENTARY-SAFETY-GRADE-1-2",
  ssif: "SOURCE-SSIF-DAILY-SAFETY-RULES",
  ksel: "SOURCE-KSEE-SEL-DOCS",
  togetherSchool: "SOURCE-MOE-KSEL-LOWER-ELEMENTARY",
  gradeOne: "SOURCE-GOE-GRADE1-ADAPTATION",
};

function unique(values) {
  const seen = new Set();
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value && !seen.has(value) && seen.add(value));
}

function toKebab(value) {
  return value
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function hwpSafetyLines() {
  const text = fs.readFileSync(safetyHwpPath, "utf8");
  const seen = new Set();
  return text.split(/\r?\n/)
    .map((line) => line.match(/^\(([^)]+)\)\s*(.+)$/)?.slice(1))
    .filter(Boolean)
    .map(([category, message]) => ({
      category: category.includes("친구") || category.includes("선생님") ? "학교생활 예절" : category,
      subCategory: category,
      message: message
        .replace(/말씀 드리기/g, "말씀드리기")
        .replace(/비오는/g, "비 오는")
        .replace(/자전거, 킥보드 탈 때 헬멧 착용하기/g, "개인 이동 장비를 탈 때 보호 장비 착용하기")
        .replace(/데였을 때 흐르는 찬물에 씻기/g, "데였을 때 흐르는 찬물로 식히고 알리기"),
      source: sourceRefs.hwp,
    }))
    .filter((item) => {
      if (seen.has(item.message)) return false;
      seen.add(item.message);
      return true;
    });
}

function safetyExtraLines() {
  const groups = [
    ["교실 안전", [
      "의자를 뒤로 뺄 때 뒤에 친구가 있는지 살피기",
      "책상 사이를 지날 때 가방끈과 의자 다리에 걸리지 않게 걷기",
      "떨어진 연필이나 지우개는 바로 주워 통로 치우기",
      "교실 통로에는 가방과 물건을 놓아두지 않기",
      "청소 시간에는 뛰지 않고 맡은 구역에서 천천히 움직이기",
      "칠판 앞에 모일 때 서로 밀지 않고 자리를 잡기",
      "교실 문을 열고 닫을 때 손가락 끼임 조심하기",
      "창문을 열고 닫을 때 몸을 밖으로 내밀지 않기",
      "높은 곳의 물건은 혼자 꺼내지 말고 도움 요청하기",
      "책상 위에 앉거나 올라가지 않기",
      "바닥에 떨어진 물건을 발견하면 바로 치우거나 알리기",
      "물통은 책상 가장자리보다 안쪽에 놓기",
      "교실에서 이동할 때 의자를 밀어 넣고 지나가기",
      "콘센트 근처에서 물병을 열어 두지 않기",
      "선풍기와 전자기기는 손가락을 넣지 않고 사용하기",
      "청소 도구는 사용한 뒤 제자리에 세워 두기",
      "서랍을 열어 둔 채 자리를 비우지 않기",
      "책상 모서리에 부딪히지 않도록 천천히 이동하기",
      "교실 안에서는 공이나 딱딱한 물건을 던지지 않기",
      "친구의 의자를 장난으로 빼지 않기",
      "교실 바닥에 물이 있으면 밟지 말고 바로 알리기",
      "가방 지퍼와 끈을 정리해 넘어짐을 예방하기",
      "개인 물건은 필요한 만큼만 책상 위에 올려두기",
      "실내화 뒤꿈치를 구겨 신지 않고 바르게 신기",
      "분실물을 발견하면 함부로 갖지 않고 선생님께 알리기",
    ]],
    ["복도·계단 안전", [
      "복도에서는 뛰지 않고 오른쪽으로 천천히 걷기",
      "계단에서는 한 칸씩 차례대로 오르내리기",
      "계단 난간을 타거나 매달리지 않기",
      "계단에서 친구를 앞지르려고 밀지 않기",
      "복도 모퉁이를 돌 때 속도를 줄이고 앞을 보기",
      "교실 밖으로 나갈 때 문 앞에서 잠시 멈추고 살피기",
      "복도 바닥이 젖어 있으면 돌아서 가거나 선생님께 알리기",
      "화장실 앞과 급식실 앞에서는 줄을 지켜 기다리기",
      "계단에서 신발끈이 풀리면 안전한 곳에서 다시 묶기",
      "이동 수업 때는 앞 친구와 간격을 두고 걷기",
      "많은 친구가 이동할 때 장난치지 않고 흐름에 맞춰 걷기",
      "복도에서 문이 열릴 수 있는 곳은 한 걸음 떨어져 지나가기",
      "계단을 내려갈 때 뛰어내리지 않고 발밑을 확인하기",
      "비상구와 소화전 앞에 물건을 놓지 않기",
      "복도 게시물이나 유리창을 손으로 치며 장난하지 않기",
      "줄을 설 때 앞 친구의 가방을 잡아당기지 않기",
      "화장실 문을 세게 밀거나 발로 차지 않기",
      "교문과 현관에서는 뛰지 않고 주변 사람을 살피기",
      "우산을 접고 펼 때 주변 친구와 거리를 두기",
      "실내 이동 중에는 화면을 보며 걷지 않기",
      "좁은 통로에서는 먼저 지나가려 다투지 않기",
      "계단참에서는 멈춰 서서 장난치지 않기",
      "무거운 물건을 들고 계단을 오를 때 도움 요청하기",
      "복도에서는 큰 소리로 뛰어나오지 않기",
      "정해진 이동 길을 벗어나 위험한 곳으로 가지 않기",
    ]],
    ["놀이·체육 안전", [
      "운동 전에는 준비 운동으로 몸을 가볍게 풀기",
      "공을 찰 때 주변에 친구가 가까이 있는지 확인하기",
      "공을 던질 때 받는 친구가 보고 있는지 확인하기",
      "운동장에서는 놀이 규칙을 먼저 확인하고 참여하기",
      "달리기 전 신발끈이 풀리지 않았는지 확인하기",
      "놀이 기구는 차례를 지켜 한 명씩 이용하기",
      "그네 가까이에 서 있지 않고 안전한 거리에서 기다리기",
      "시소를 탈 때 친구가 준비되었는지 확인하기",
      "미끄럼틀은 올라가는 곳과 내려오는 곳을 지켜 이용하기",
      "운동장에서 돌이나 모래를 던지지 않기",
      "체육 도구는 선생님 안내에 따라 꺼내고 정리하기",
      "놀이하다 다치면 참지 말고 바로 선생님께 알리기",
      "몸이 어지럽거나 숨이 차면 참고 뛰지 말고 알리기",
      "더운 날에는 활동 중 물을 마시고 그늘에서 쉬기",
      "비가 온 뒤 미끄러운 곳에서는 달리기보다 걷기",
      "친구 몸을 잡아당기거나 밀며 장난치지 않기",
      "운동장 경계 밖으로 공을 따라 뛰어나가지 않기",
      "체육 시간에는 장난보다 안전한 움직임을 먼저 생각하기",
      "공을 주울 때 주변 움직임을 살피고 천천히 이동하기",
      "사용한 체육 도구는 통로에 두지 않고 제자리에 놓기",
      "체육 활동 전 안경과 소지품을 안전하게 정리하기",
      "무리한 동작은 따라 하지 않고 할 수 있는 만큼 참여하기",
      "게임에서 이기고 져도 친구를 놀리거나 밀지 않기",
      "넓은 곳에서 뛰기 전 방향을 정하고 출발하기",
      "신체 접촉이 생기면 바로 멈추고 괜찮은지 확인하기",
    ]],
    ["건강·위생 안전", [
      "식사 전과 화장실 이용 후에는 비누로 손 씻기",
      "기침이나 재채기를 할 때 옷소매로 입과 코 가리기",
      "개인 물병과 수저는 친구와 바꾸어 쓰지 않기",
      "음식은 입에 넣은 채 말하거나 뛰지 않기",
      "급식은 천천히 씹어 먹고 장난치지 않기",
      "알레르기가 있는 음식은 먹기 전에 선생님께 확인하기",
      "약은 선생님과 보호자 안내 없이 함부로 먹지 않기",
      "몸이 아프거나 열이 나는 느낌이 들면 바로 알리기",
      "코피가 나면 고개를 숙이고 선생님께 알리기",
      "상처가 나면 만지지 말고 깨끗하게 처치받기",
      "눈에 먼지가 들어가면 비비지 말고 도움 요청하기",
      "뜨거운 국이나 물은 두 손으로 천천히 옮기기",
      "급식실에서는 식판을 들고 뛰지 않기",
      "음료나 물을 쏟으면 바로 닦거나 알리기",
      "마스크가 필요한 날에는 안내에 따라 바르게 착용하기",
      "손톱은 짧고 깨끗하게 관리하기",
      "양치할 때 친구에게 물을 튀기며 장난하지 않기",
      "화장실에서는 물과 휴지를 필요한 만큼만 사용하기",
      "물비누와 소독제는 장난감처럼 사용하지 않기",
      "감염병 안내가 있을 때 정해진 생활 수칙 지키기",
      "쉬는 시간에는 몸 상태를 살피고 필요한 휴식 갖기",
      "피곤하거나 속이 불편하면 혼자 참지 않고 말하기",
      "음식 포장지는 바닥에 두지 않고 바로 버리기",
      "입에 넣으면 안 되는 물건은 장난으로 물지 않기",
      "친구의 컵이나 빨대를 허락 없이 사용하지 않기",
    ]],
    ["도구·자료 안전", [
      "가위는 손잡이를 잡고 날이 아래로 향하게 들기",
      "칼이나 송곳은 선생님 안내가 있을 때만 사용하기",
      "연필은 끝이 친구 쪽을 향하지 않게 다루기",
      "자와 각도기는 휘두르지 않고 책상 위에서 사용하기",
      "풀과 테이프는 필요한 만큼만 사용하고 뚜껑 닫기",
      "물감과 색연필은 입에 넣지 않고 사용하기",
      "작은 재료는 바닥에 떨어지면 바로 주워 정리하기",
      "실험 도구는 만지기 전 선생님 설명을 듣기",
      "뜨거운 기구나 전기 기구는 혼자 만지지 않기",
      "컴퍼스는 뾰족한 부분을 친구에게 향하지 않기",
      "종이를 자를 때 손가락 위치를 확인하기",
      "무거운 책이나 상자는 두 손으로 들고 천천히 옮기기",
      "물건을 친구에게 건넬 때 던지지 않고 직접 주기",
      "분필과 보드마카는 정해진 곳에서만 사용하기",
      "청소기와 전기 코드는 잡아당기지 않고 정리하기",
      "책을 높이 쌓아 무너지게 하지 않기",
      "사물함 문을 열고 닫을 때 주변 친구 살피기",
      "깨진 물건은 직접 만지지 말고 선생님께 알리기",
      "날카로운 종이 모서리에 베이지 않게 조심하기",
      "물건을 빌릴 때는 허락을 받고 사용 후 돌려주기",
      "미술 재료를 나눌 때 친구 손을 밀치지 않기",
      "실험 후 손을 씻고 책상을 정리하기",
      "전자기기는 젖은 손으로 만지지 않기",
      "사용하지 않는 플러그는 선생님 도움으로 정리하기",
      "학용품으로 친구를 찌르거나 놀라게 하지 않기",
    ]],
    ["디지털·사이버 안전", [
      "온라인 글을 올리기 전 친구가 불편하지 않을지 생각하기",
      "친구 사진은 허락 없이 찍거나 보내지 않기",
      "비밀번호는 친구에게 알려주지 않기",
      "낯선 사람이 보낸 링크는 누르지 않고 어른에게 알리기",
      "화면을 보며 걷지 않고 멈춰 서서 확인하기",
      "온라인 대화에서도 욕이나 놀리는 말 쓰지 않기",
      "게임과 영상은 정한 시간을 지켜 이용하기",
      "개인정보가 보이는 화면은 다른 사람에게 보여주지 않기",
      "이상한 메시지를 받으면 답하지 말고 어른에게 알리기",
      "학습 기기는 수업 목적에 맞게 사용하기",
      "친구의 기기를 허락 없이 만지지 않기",
      "온라인 자료를 사용할 때 출처를 확인하기",
      "채팅방에서 친구를 따돌리는 말 하지 않기",
      "화상 수업에서는 다른 사람 얼굴을 몰래 저장하지 않기",
      "디지털 기기는 떨어뜨리지 않도록 두 손으로 들기",
      "충전기는 선을 잡아당기지 않고 플러그를 잡고 빼기",
      "인터넷에서 본 내용을 바로 믿기보다 선생님께 확인하기",
      "불편한 온라인 상황은 혼자 해결하려 하지 않고 알리기",
      "친구 이름으로 장난 게시글을 올리지 않기",
      "수업 중 알림이 울리지 않게 기기 상태 확인하기",
      "공용 기기는 사용 후 로그아웃하기",
      "친구의 화면을 허락 없이 들여다보지 않기",
      "악성 댓글이나 놀림 글을 보면 따라 쓰지 않기",
      "온라인에서도 상대가 싫어하면 바로 멈추기",
      "디지털 학습 뒤에는 눈을 쉬게 하고 바른 자세 갖기",
    ]],
    ["재난·비상 안전", [
      "비상벨이 울리면 장난으로 여기지 않고 안내 듣기",
      "대피할 때는 뛰지 않고 입을 가린 채 이동하기",
      "화재 대피 때 엘리베이터를 이용하지 않기",
      "연기가 보이면 몸을 낮추고 선생님 안내 따르기",
      "지진이 나면 머리를 보호하고 책상 아래로 들어가기",
      "흔들림이 멈춘 뒤 선생님 안내에 따라 이동하기",
      "태풍과 폭우 때 창문 가까이에 머물지 않기",
      "천둥이 들리면 실외 활동을 멈추고 실내로 이동하기",
      "폭염 안내가 있을 때 무리한 야외 활동 줄이기",
      "한파가 심한 날에는 손과 귀를 따뜻하게 보호하기",
      "미세먼지 안내가 있을 때 실외 활동 안내 따르기",
      "대피 훈련 중 친구를 밀거나 장난치지 않기",
      "비상구 위치를 평소에 확인해 두기",
      "위험한 냄새나 연기를 맡으면 바로 알리기",
      "정전이 되면 자리에서 침착하게 안내 기다리기",
      "방송이 나오면 하던 일을 멈추고 조용히 듣기",
      "비 오는 날 배수구와 물이 고인 곳 가까이 가지 않기",
      "강풍이 불 때 창문과 출입문을 조심하기",
      "겨울철 빙판길에서는 보폭을 줄여 천천히 걷기",
      "비상 상황에서는 물건보다 사람의 안전을 먼저 생각하기",
      "대피 줄에서는 앞사람과 간격을 지키기",
      "불장난이나 라이터 장난을 절대 하지 않기",
      "소화기와 비상 장비는 장난으로 만지지 않기",
      "재난 안내가 나오면 보호자와 선생님 말 따르기",
      "위험을 보면 혼자 확인하지 말고 어른에게 알리기",
    ]],
    ["학교폭력 예방", [
      "친구가 싫다고 말하면 바로 멈추기",
      "장난이라도 친구의 몸을 아프게 하지 않기",
      "놀리는 별명 대신 친구 이름을 바르게 부르기",
      "친구의 비밀과 개인정보를 함부로 말하지 않기",
      "여럿이 한 친구를 따돌리는 행동 하지 않기",
      "친구 물건을 숨기거나 빼앗는 장난 하지 않기",
      "불편한 일을 보면 모른 척하지 않고 어른에게 알리기",
      "화가 나도 욕이나 때리는 행동으로 표현하지 않기",
      "친구가 사과하면 다시 안전한 방법을 함께 생각하기",
      "서로 다른 모습과 속도를 존중하기",
      "친구의 몸이나 얼굴을 평가하는 말 하지 않기",
      "친구의 실수를 반복해서 놀리지 않기",
      "돈이나 물건을 억지로 빌리거나 요구하지 않기",
      "친구가 거절하면 이유를 캐묻기보다 멈추기",
      "다툼이 커지기 전에 선생님께 도움 요청하기",
      "온라인에서도 친구를 놀리거나 따돌리지 않기",
      "친구의 작품과 노력을 비웃지 않기",
      "무리한 부탁을 받으면 싫다고 말하고 도움 요청하기",
      "친구의 동의 없이 사진이나 영상을 공유하지 않기",
      "험담이 시작되면 함께하지 않고 대화를 멈추기",
      "상대가 불편해하는 표정을 보면 장난을 멈추기",
      "힘든 친구를 보면 조용히 선생님께 알려 돕기",
      "반복되는 괴롭힘은 혼자 참지 않고 바로 알리기",
      "친구를 웃기려고 누군가를 희생시키지 않기",
      "모두가 안전하게 지낼 수 있는 말을 선택하기",
    ]],
  ];
  return groups.flatMap(([category, messages]) => messages.map((message) => ({
    category,
    subCategory: category,
    message,
    source: sourceRefs.schoolSafety,
  })));
}

function eventAction(label) {
  const rules = [
    [/독도/, "우리 땅과 바다를 아끼는 마음 갖기"],
    [/평화/, "평화를 위해 노력한 사람들을 기억하기"],
    [/안전|소방|방재|재난|화재/, "안전 수칙을 다시 확인하고 침착하게 실천하기"],
    [/환경|물|숲|바다|습지|지구|오존|생물|사막화|기후|토양/, "생활 속에서 자연을 아끼는 행동 한 가지 실천하기"],
    [/한글|언어|국어/, "바른 우리말로 생각을 또박또박 표현하기"],
    [/과학|정보|통신|수학|지식재산/, "궁금한 점을 질문하고 근거를 찾아보기"],
    [/어린이|청소년|학생/, "나와 친구의 권리를 함께 존중하기"],
    [/장애|점자|수어|노인|사회복지|빈곤|난민|인권/, "서로 다른 모습과 필요한 도움을 존중하기"],
    [/민주|헌법|법|국회|유엔|광복|3·1|4·19|5·18|6·10|임시정부|개천절|국군|보훈|현충|의병|순국|서해|독립/, "공동체를 위해 애쓴 분들을 기억하기"],
    [/스승|어버이|부부|가정|가족/, "고마운 마음을 말과 행동으로 표현하기"],
    [/농업|농촌|어업|무역|소비자|저축|통계|납세|상공|섬유|발명|철도|자동차/, "우리 생활을 돕는 일을 알고 감사하기"],
    [/보건|건강|구강|약|마약|결핵|암|당뇨|에이즈|정신/, "건강을 지키는 생활 습관 한 가지 실천하기"],
    [/책|도서|문해|문화|예술|음악|박물관|방송|체육|관광/, "배운 내용을 차분히 살피고 즐겁게 참여하기"],
  ];
  return rules.find(([pattern]) => pattern.test(label))?.[1] ?? "오늘의 의미를 알고 바른 행동으로 실천하기";
}

function buildMessage1Db() {
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const dateItems = audit.audited_items
    .filter((item) => item.display_name_ko !== "세계 자전거의 날")
    .map((item) => ({
    message: `${item.display_name_ko} : ${eventAction(item.display_name_ko)}`,
    category: "날짜별 계기교육",
    subCategory: item.classification ?? "계기교육",
    schoolContexts: ["아침 활동", "알림장"],
    activationRule: item.activation_rule,
    recommendedMonths: item.activation_rule?.month ? [item.activation_rule.month] : [],
    priority: 100,
    sourceRequired: true,
    sourceRefs: item.source_refs ?? [],
    similarGroup: `event-${toKebab(item.display_name_ko)}`,
    level: 2,
  }));

  const everydayItems = unique([...hwpSafetyLines(), ...safetyExtraLines()].map((item) => item.message))
    .map((message) => {
      const sourceItem = [...hwpSafetyLines(), ...safetyExtraLines()].find((item) => item.message === message);
      return {
        message,
        category: sourceItem?.category ?? "학교 안전",
        subCategory: sourceItem?.subCategory ?? "학교 안전",
        schoolContexts: ["학교생활", "알림장"],
        activationRule: { type: "evergreen" },
        recommendedMonths: [],
        priority: 30,
        sourceRequired: false,
        sourceRefs: [sourceItem?.source ?? sourceRefs.schoolSafety],
        similarGroup: `safety-${toKebab(message).slice(0, 48)}`,
        level: /알리기|요청하기|확인하기/.test(message) ? 2 : 1,
      };
    });

  const selected = [...dateItems, ...everydayItems].slice(0, 300);
  return {
    version: "2.0",
    type: "evergreen-school-context-message-1-db",
    total: selected.length,
    description: "초등학교 알림장용 1번 문구 데이터베이스. 주신 HWP 안전 문구를 우선 반영하고 공식 학교안전·계기교육 자료 기준으로 재구성함.",
    metadata_definitions: {
      level: "1 직접 행동, 2 상황 판단 또는 알리기, 3 공동체 판단",
      priority: "날짜 계기교육 100, 일반 학교 안전 30",
      non_school_day_policy: "토·일요일, 공휴일 또는 학교 휴업일이면 표시하지 않거나 직전 등교일에 표시함",
    },
    usage_guidance: [
      "문구는 짧은 일일 안내이며 교사의 현장 판단과 학교 안전교육을 대신하지 않는다",
      "학교 실정과 학생 특성에 맞지 않는 문구는 설정에서 체크 해제해 사용한다",
    ],
    source_refs: buildSourceRefs(),
    messages: selected.map((item, index) => ({
      id: `MESSAGE1-${String(index + 1).padStart(3, "0")}`,
      emoji: "",
      message: item.message,
      display_text: `1. ${item.message}`,
      category: item.category,
      sub_category: item.subCategory,
      school_contexts: item.schoolContexts,
      activation_rule: item.activationRule,
      recommended_months: item.recommendedMonths,
      recommended_weekdays: [],
      weather_tags: [],
      priority: item.priority,
      similar_group: item.similarGroup,
      level: item.level,
      active: true,
      source_required: item.sourceRequired,
      source_refs: item.sourceRefs,
    })),
  };
}

function schoolLifePhrases() {
  const categories = [
    ["듣기와 말하기", [
      "친구의 말을 끝까지 듣고 대답하기",
      "내 생각을 말하기 전에 친구 말을 먼저 확인하기",
      "고마운 일이 있으면 바로 고맙다고 말하기",
      "미안한 일이 있으면 핑계보다 사과 먼저 하기",
      "친구가 말할 때 끼어들지 않고 기다리기",
      "내 의견은 짧고 분명하게 말하기",
      "잘 못 들었을 때 다시 말해 달라고 부탁하기",
      "친구의 의견이 달라도 비웃지 않고 듣기",
      "발표하는 친구를 바라보며 조용히 듣기",
      "질문할 때는 손을 들고 차례를 기다리기",
      "속상한 마음은 소리치지 않고 말로 표현하기",
      "친구가 싫다고 말하면 그 이유를 듣고 멈추기",
      "칭찬할 점을 찾으면 친구에게 직접 말하기",
      "대화가 길어지면 중요한 말을 한 문장으로 정리하기",
      "친구 이름을 바르게 부르며 이야기하기",
      "말하기 어려운 일은 선생님께 도움 요청하기",
      "친구의 설명을 듣고 이해한 내용을 다시 말하기",
      "농담을 할 때 상대가 웃는지 불편한지 살피기",
      "부탁할 때는 필요한 이유를 함께 말하기",
      "거절할 때는 차분한 말로 내 마음 표현하기",
      "친구가 도와주면 결과보다 마음에 감사하기",
      "실수한 친구에게 괜찮다고 말해 주기",
      "새로운 친구에게 먼저 인사하기",
      "친구 말을 들은 뒤 내 생각 한 가지 말하기",
      "모둠 대화에서는 모두 한 번씩 말할 기회 갖기",
    ]],
    ["협력과 배려", [
      "함께 쓰는 물건은 차례를 정해 사용하기",
      "모둠 활동에서 맡은 일을 끝까지 해보기",
      "친구가 어려워하면 먼저 무엇이 필요한지 물어보기",
      "친구의 속도에 맞춰 기다려 주기",
      "함께 정한 규칙은 내가 먼저 지키기",
      "도움을 받았으면 다음에는 내가 도와보기",
      "친구가 준비물을 찾을 때 아는 곳을 알려주기",
      "같은 자료를 볼 때 서로 잘 보이게 자리 조정하기",
      "모둠 결과물에는 친구의 생각도 함께 담기",
      "역할을 정할 때 하고 싶은 일을 서로 말하기",
      "역할이 마음에 들지 않아도 먼저 해보고 조정하기",
      "친구가 실수해도 탓하기 전에 해결 방법 찾기",
      "함께 만든 물건은 함께 정리하기",
      "놀이에 들어오고 싶은 친구가 있으면 방법 함께 정하기",
      "혼자 있는 친구에게 함께할지 물어보기",
      "교실 물건은 내 것처럼 조심해서 사용하기",
      "공용 물건은 사용한 뒤 다음 친구를 위해 정리하기",
      "모둠 책상은 모두가 쓸 수 있게 넓게 정리하기",
      "친구가 말한 좋은 생각을 모둠 활동에 반영하기",
      "친구와 의견이 다르면 한 가지씩 이유 말하기",
      "정리 시간에는 내가 쓴 자리부터 치우기",
      "줄을 설 때 앞뒤 친구와 간격 지키기",
      "함께하는 활동에서는 이기는 것보다 규칙 지키기",
      "친구가 부탁을 거절해도 서운한 말 하지 않기",
      "서로의 차례가 보이도록 약속을 글로 정리하기",
    ]],
    ["감정 조절", [
      "화가 날 때 바로 말하기보다 세 번 숨 고르기",
      "속상한 일이 있으면 상황과 마음을 나누어 말하기",
      "실패했을 때 다시 해볼 방법 한 가지 찾기",
      "친구 말에 기분이 상하면 차분히 확인하기",
      "마음이 급할 때 하던 일을 잠시 멈추고 생각하기",
      "울고 싶을 때 안전한 곳에서 도움 요청하기",
      "짜증이 날 때 손과 발로 표현하지 않기",
      "기분이 좋을 때도 친구를 놀라게 하지 않기",
      "실수했을 때 나를 탓하기보다 고칠 점 찾기",
      "걱정되는 일이 있으면 혼자 오래 참지 않기",
      "친구가 화난 모습을 보이면 거리를 두고 기다리기",
      "말다툼이 생기면 목소리를 낮추고 다시 말하기",
      "내 마음을 색깔이나 날씨처럼 표현해 보기",
      "수업이 어려우면 모르는 부분을 표시하기",
      "긴장될 때 천천히 숨 쉬고 시작하기",
      "친구의 표정을 보고 말을 멈출지 이어갈지 살피기",
      "억울한 일이 있으면 사실을 순서대로 말하기",
      "즐거운 마음은 안전한 행동으로 표현하기",
      "분한 마음이 들면 손을 멈추고 도움 요청하기",
      "마음이 흔들릴 때 물 한 모금 마시고 정리하기",
      "내가 할 수 있는 일과 도움 받을 일을 구분하기",
      "오늘 기분을 짧게 적고 하루를 시작하기",
      "친구의 감정을 내가 마음대로 정하지 않기",
      "다툼 뒤에는 필요한 시간을 갖고 다시 이야기하기",
      "사과를 들은 뒤에도 불편하면 선생님께 말하기",
    ]],
    ["학습 습관", [
      "수업 전에 책과 필통을 미리 꺼내기",
      "모르는 문제는 표시한 뒤 질문하기",
      "과제는 할 수 있는 부분부터 시작하기",
      "설명을 들을 때 눈은 말하는 사람에게 두기",
      "중요한 말은 짧게 적어 두기",
      "틀린 문제는 답만 보지 말고 이유 확인하기",
      "친구가 발표할 때 내 생각과 비교해 듣기",
      "새로 배운 말은 예문으로 한 번 써보기",
      "읽은 내용은 한 문장으로 정리하기",
      "공부하다 막히면 도움 받을 사람을 떠올리기",
      "활동이 끝나면 배운 점 한 가지 말하기",
      "숙제는 날짜와 내용을 확인하고 챙기기",
      "학습지는 이름과 날짜를 먼저 쓰기",
      "문제를 풀기 전 무엇을 묻는지 밑줄 긋기",
      "정답을 맞혀도 풀이 과정을 한 번 확인하기",
      "친구의 좋은 공부 방법을 하나 배워보기",
      "수업 중 필요한 말은 손을 들고 하기",
      "활동 자료는 잃어버리지 않게 한곳에 모으기",
      "어려운 낱말은 뜻을 물어보고 다시 읽기",
      "발표 전에는 말할 순서를 마음속으로 정하기",
      "쓰기 전에는 무엇을 쓸지 짧게 생각하기",
      "그림과 글을 함께 보며 내용을 이해하기",
      "끝난 활동은 표시하고 다음 할 일 확인하기",
      "실수한 부분은 지우기보다 고쳐 쓴 흔적 남기기",
      "오늘 배운 내용을 학교생활에서 한 번 써보기",
    ]],
    ["책임과 정리", [
      "내 자리는 내가 먼저 정리하기",
      "빌린 물건은 사용한 뒤 바로 돌려주기",
      "분실물을 보면 주인을 찾거나 선생님께 전하기",
      "급식 뒤 내 자리를 깨끗하게 확인하기",
      "청소 당번은 맡은 일을 확인하고 시작하기",
      "준비물은 전날 가방에 넣었는지 확인하기",
      "교실을 나갈 때 의자와 책상 상태 확인하기",
      "공용 물건을 망가뜨렸다면 바로 사실을 말하기",
      "내가 만든 쓰레기는 내가 버리기",
      "책은 읽은 뒤 바르게 꽂아 두기",
      "알림장 내용을 집에 가서 다시 확인하기",
      "학급 약속은 보지 않아도 기억하려고 노력하기",
      "시간이 부족하면 먼저 해야 할 일을 고르기",
      "내 역할이 끝나면 필요한 친구를 도와보기",
      "활동 도구는 개수와 상태를 확인하고 반납하기",
      "물건을 잃어버렸을 때 마지막으로 쓴 곳 떠올리기",
      "정리 시간이 되면 하던 말을 줄이고 손부터 움직이기",
      "신발장과 사물함은 다음 사용을 생각해 정리하기",
      "사용한 컵과 휴지는 정해진 곳에 버리기",
      "마무리하지 못한 일은 언제 할지 정하기",
      "약속한 시간에 맞춰 활동을 끝내기",
      "내 물건에는 이름을 쓰고 스스로 챙기기",
      "학교 물건은 모두가 함께 쓰는 것임을 기억하기",
      "친구에게 맡긴 일도 함께 확인하기",
      "오늘 해야 할 일을 하나씩 지우며 확인하기",
    ]],
    ["갈등 해결", [
      "다툼이 생기면 먼저 몸을 멈추고 거리 두기",
      "누가 맞는지보다 무슨 일이 있었는지 차례로 말하기",
      "친구 말이 사실과 다르면 차분히 내 기억 말하기",
      "사과할 때는 내가 한 행동을 분명히 말하기",
      "화해가 바로 어렵다면 시간을 갖자고 말하기",
      "친구 물건을 망가뜨렸다면 숨기지 않고 알리기",
      "장난이 다툼으로 바뀌면 바로 멈추기",
      "내가 싫은 행동은 짧고 분명하게 말하기",
      "친구가 싫다고 한 행동은 반복하지 않기",
      "갈등을 해결할 때 선생님 도움을 받을 수 있음을 기억하기",
      "내 말 때문에 친구가 속상했는지 물어보기",
      "친구가 사과하면 들은 뒤 내 마음을 말하기",
      "오해가 생기면 들은 말과 본 일을 구분하기",
      "여럿이 이야기할 때 한 사람씩 말하기",
      "친구 편을 나누기보다 해결 방법을 찾기",
      "놀림을 봤을 때 웃지 않고 멈추라고 말하기",
      "친구가 도움을 청하면 혼자 판단하지 말고 어른께 알리기",
      "같은 일이 반복되면 기록하고 선생님께 말하기",
      "화난 마음으로 메시지를 보내지 않고 잠시 기다리기",
      "친구의 별명 사용이 불편하면 바로 바꿔 부르기",
      "다툼 뒤에도 수업과 놀이 규칙은 지키기",
      "친구의 사과를 강요하지 않고 필요한 도움 요청하기",
      "속상한 친구에게 왜 그러냐고 따지기보다 괜찮은지 묻기",
      "억울한 마음은 사실과 느낌을 나누어 말하기",
      "서로의 말을 들은 뒤 다시 할 약속 하나 정하기",
    ]],
    ["존중과 다양성", [
      "친구마다 잘하는 것이 다름을 인정하기",
      "느린 친구를 재촉하지 않고 기다려 주기",
      "다른 나라 말과 이름을 놀리지 않기",
      "친구의 생김새를 평가하는 말 하지 않기",
      "나와 다른 생각도 배울 점이 있는지 살피기",
      "도움이 필요한 친구에게 먼저 물어보고 돕기",
      "친구의 가족 이야기를 함부로 말하지 않기",
      "새로운 방법을 제안한 친구에게 이유 물어보기",
      "모두가 참여할 수 있는 놀이 방법 생각하기",
      "친구의 작품은 비교보다 좋은 점부터 보기",
      "말이 서툰 친구도 끝까지 말할 시간 주기",
      "실수는 누구나 할 수 있음을 기억하기",
      "친구의 종교와 문화 이야기를 존중해서 듣기",
      "내 기준으로 친구를 이상하다고 말하지 않기",
      "혼자 있고 싶은 마음도 존중하기",
      "도움이 필요 없어 보이는 친구에게도 의사를 물어보기",
      "칭찬은 겉모습보다 노력과 행동에 하기",
      "친구가 좋아하는 것을 무시하지 않기",
      "다름을 이유로 편을 가르지 않기",
      "발표가 서툰 친구에게 조용히 응원 보내기",
      "친구의 자리와 물건을 내 마음대로 정하지 않기",
      "서로의 이름을 정확하게 부르려고 노력하기",
      "몸이 불편한 친구의 이동 길을 막지 않기",
      "친구의 말투를 따라 하며 놀리지 않기",
      "우리 반 모두가 안전하게 지낼 방법 생각하기",
    ]],
    ["학교 공동체", [
      "아침에 만나는 사람에게 밝게 인사하기",
      "학교에서 일하시는 분들께 감사한 마음 갖기",
      "복도에서 손님을 만나면 조용히 길 비켜주기",
      "학급 회의에서는 우리 반에 필요한 일을 말하기",
      "학급 약속을 바꿀 때 모두의 의견 듣기",
      "활동 준비는 맡은 역할을 확인하고 참여하기",
      "학교 시설을 깨끗하게 사용하기",
      "공공장소에서는 내 목소리 크기를 조절하기",
      "도서관에서는 책 읽는 친구를 방해하지 않기",
      "급식실에서는 배식해 주시는 분께 감사 인사하기",
      "화장실은 다음 사람이 쓰기 좋게 사용하기",
      "운동장은 함께 쓰는 공간임을 생각하며 놀기",
      "교실 규칙은 선생님만의 규칙이 아니라 우리 약속으로 생각하기",
      "함께 쓰는 물건은 사용한 뒤 제자리에 두기",
      "활동이 끝나면 사용한 자리를 스스로 정리하기",
      "작은 도움을 받았을 때도 고마움을 표현하기",
      "친구의 좋은 행동을 발견하면 함께 칭찬하기",
      "우리 반 문제는 비난보다 해결 방법부터 말하기",
      "친구에게 교실 물건 사용 방법 친절하게 알려주기",
      "모두가 볼 게시물은 바르게 붙이고 아껴 보기",
      "학교 물건을 망가뜨리지 않도록 조심해서 쓰기",
      "함께 쓰는 공간에서는 뛰기보다 걷기",
      "학급 활동에서는 혼자 돋보이기보다 함께 완성하기",
      "모르는 사람이 학교 안에 있으면 선생님께 알리기",
      "하루를 마칠 때 우리 반에 도움이 된 일 떠올리기",
    ]],
    ["생활 예절", [
      "말을 걸기 전 상대가 들을 준비가 되었는지 살피기",
      "친구의 책상과 사물함은 허락 없이 열지 않기",
      "다른 사람의 물건은 먼저 허락받고 사용하기",
      "식사 중에는 음식으로 장난하지 않기",
      "줄을 설 때 새치기하지 않고 차례 기다리기",
      "문을 지나갈 때 뒤 사람을 살피고 천천히 닫기",
      "친구가 집중할 때 일부러 방해하지 않기",
      "빌려준 물건이 돌아오지 않으면 차분히 물어보기",
      "수업 중 이동할 때 주변 친구에게 방해되지 않게 하기",
      "친구의 이야기를 다른 곳에 옮기기 전 허락받기",
      "칭찬받은 친구에게 함께 박수 보내기",
      "내가 늦었을 때 조용히 들어와 흐름을 맞추기",
      "공용 자료를 가져갈 때 필요한 만큼만 가져가기",
      "친구가 그만하라고 하면 장난을 멈추기",
      "말실수했을 때 바로 고쳐 말하기",
      "친구의 순서를 대신 정하지 않기",
      "선생님 설명 중에는 하던 말을 멈추기",
      "교실에 들어올 때 문을 세게 닫지 않기",
      "활동 중 생긴 소음은 스스로 줄이기",
      "친구의 질문을 바보 같다고 말하지 않기",
      "청소한 곳을 일부러 어지럽히지 않기",
      "친구가 아끼는 물건을 장난감처럼 다루지 않기",
      "다른 반 수업을 지나갈 때 조용히 이동하기",
      "학교 방송이 나오면 말소리를 줄이고 듣기",
      "하루 한 번 주변 사람에게 다정한 말 건네기",
    ]],
    ["자기 이해와 성장", [
      "오늘 내가 잘한 행동 한 가지 떠올리기",
      "어제보다 나아진 점을 작게라도 찾아보기",
      "어려운 일을 만나면 도움 받을 방법 생각하기",
      "내가 좋아하는 활동과 힘든 활동을 구분해 보기",
      "실수한 일을 다음 행동으로 고쳐 보기",
      "새로운 도전을 하기 전 필요한 준비물 확인하기",
      "친구와 비교하기보다 내 변화 살피기",
      "칭찬받은 일을 다시 해볼 방법 생각하기",
      "마음이 복잡할 때 글이나 그림으로 표현하기",
      "오늘 지킬 약속을 한 가지 정하기",
      "잘 안 되는 일도 한 번 더 시도해 보기",
      "내가 도움을 줄 수 있는 일을 찾아보기",
      "몸과 마음이 보내는 신호를 알아차리기",
      "하기 싫은 일도 필요한 이유를 생각해 보기",
      "내 장점을 친구에게 도움이 되는 방식으로 쓰기",
      "수업 뒤 궁금한 점을 하나 남겨두기",
      "하루 끝에 고마웠던 일을 한 가지 적기",
      "바쁜 날에는 가장 중요한 일부터 정하기",
      "작은 성공도 스스로 인정하기",
      "새로운 친구와 닮은 점 한 가지 찾아보기",
      "선택하기 어려울 때 기준을 세워 결정하기",
      "실패한 경험에서 다음 방법을 찾아보기",
      "내 마음을 말할 수 있는 믿을 만한 사람 떠올리기",
      "좋아하는 것을 친구와 나누는 방법 생각하기",
      "오늘의 나에게 필요한 응원 한 문장 말하기",
    ]],
    ["안전한 관계", [
      "내 몸은 소중하다는 것을 기억하기",
      "불편한 접촉은 싫다고 말하고 바로 알리기",
      "친구의 몸을 장난으로 만지지 않기",
      "사진을 찍기 전 상대의 허락을 받기",
      "친구가 불편해하면 미안하다고 말하고 멈추기",
      "비밀이라도 위험한 일은 어른에게 알리기",
      "누군가 억지로 시키는 일은 거절하고 도움 요청하기",
      "혼자 해결하기 어려운 관계 문제는 선생님께 말하기",
      "친구를 웃기려고 다른 친구를 놀리지 않기",
      "사람마다 안전하게 느끼는 거리가 다름을 존중하기",
      "상대가 원하지 않는 별명은 사용하지 않기",
      "친구를 협박하거나 겁주는 말 하지 않기",
      "온라인에서 만난 사람에게 개인정보 알려주지 않기",
      "불편한 장난이 반복되면 기록하고 알리기",
      "친구에게 돈이나 물건을 요구하지 않기",
      "내가 본 괴롭힘을 장난으로 넘기지 않기",
      "친구가 도움을 청하면 믿고 어른에게 연결하기",
      "비밀을 말하라고 강요하지 않기",
      "내 실수로 친구가 다쳤다면 바로 도움 요청하기",
      "친구의 거절을 받아들이고 다른 방법 찾기",
      "여럿이 한 명을 놀리는 분위기를 만들지 않기",
      "힘든 친구에게 왜 못하냐고 말하지 않기",
      "선생님께 말하는 것은 고자질이 아니라 안전을 지키는 일임을 알기",
      "친구와 가까워도 지켜야 할 예절이 있음을 기억하기",
      "모두가 안심할 수 있는 말과 행동 선택하기",
    ]],
    ["가정 연계", [
      "집에 가면 오늘 배운 안전 약속 한 가지 말하기",
      "알림장 내용을 보호자와 함께 확인하기",
      "학교에서 고마웠던 일을 집에서 이야기하기",
      "내일 필요한 준비물을 보호자와 함께 확인하기",
      "하교 후 정해진 장소와 시간을 지키기",
      "모르는 연락이나 메시지는 보호자에게 보여주기",
      "집에서도 친구 사진을 허락 없이 보내지 않기",
      "학교에서 속상했던 일은 믿을 만한 어른에게 말하기",
      "숙제를 시작할 시간을 스스로 정해보기",
      "가족에게 부탁할 때 고운 말 사용하기",
      "학교 물건을 집에 가져갔다면 다음 날 챙겨오기",
      "집에서 쓰는 디지털 기기도 약속한 시간 지키기",
      "보호자에게 오늘 도와준 친구 이야기를 들려주기",
      "잠들기 전 가방과 옷을 미리 준비하기",
      "몸이 아프면 아침에 바로 보호자와 선생님께 알리기",
      "집에서도 손 씻기와 양치 습관 지키기",
      "가족 말을 들을 때 눈을 보고 대답하기",
      "학교에서 정한 약속을 집에서도 연습하기",
      "내가 할 수 있는 집안일을 한 가지 해보기",
      "내 마음을 가족에게 짧게 말해보기",
      "친구와의 약속은 보호자에게도 알려두기",
      "가정통신문은 잊지 않고 보호자께 전하기",
      "집에서 읽은 책 이야기를 친구에게 소개하기",
      "등교 전 몸과 마음 준비 상태 확인하기",
      "하루를 마치며 감사한 사람 한 명 떠올리기",
    ]],
  ];
  return categories.flatMap(([category, messages]) => messages.map((message) => ({ category, message })));
}

function buildSchoolLifeDb() {
  const phrases = unique(schoolLifePhrases().map((item) => item.message));
  const selected = phrases.slice(0, 300);
  const lookup = new Map(schoolLifePhrases().map((item) => [item.message, item.category]));
  return {
    version: "2.0",
    type: "evergreen-school-life-message-db",
    total: selected.length,
    description: "초등학생 학교생활 실천을 위한 2번 문구 데이터베이스. 사회정서교육과 입학초기 적응 자료의 방향에 맞춰 완성 문장 단위로 재작성함.",
    source_refs: buildSourceRefs(),
    level_definitions: {
      1: "한 번의 관찰 가능한 행동으로 바로 실천하기",
      2: "상황을 판단하거나 다른 사람과 조율하며 실천하기",
      3: "안전한 관계와 어른의 도움이 필요한 상황 판단하기",
    },
    safety_priority_definitions: {
      1: "일상에서 바로 실천하는 일반 문구",
      2: "감정·관계 조율이 필요한 문구",
      3: "괴롭힘·불편한 접촉·위험 상황에서 어른의 도움이 필요한 문구",
    },
    selection_policy: {
      weekday_mode: "soft_preference",
      month_mode: "soft_preference",
      recent_message_cooldown: 30,
      similar_group_cooldown: 7,
      category_balance_window: 35,
      trigger_fallback: "any_school_day",
    },
    context_dimensions: ["places", "times", "activities", "situations", "channels"],
    messages: selected.map((message, index) => {
      const category = lookup.get(message) ?? "학교생활 실천";
      const level = /생각|확인|조정|구분|기준|해결|요청|알리기|존중/.test(message) ? 2 : 1;
      const priority = /불편한 접촉|괴롭힘|협박|위험|어른에게|선생님께 말하기/.test(message) ? 3 : level === 2 ? 2 : 1;
      return {
        id: `SCHOOL-LIFE-${String(index + 1).padStart(3, "0")}`,
        emoji: "",
        message,
        display_text: `2. ${message}`,
        category,
        sub_category: category,
        school_contexts: ["학교생활", "알림장"],
        context_tags: {
          places: ["any"],
          times: ["any"],
          activities: ["any"],
          situations: priority === 3 ? ["안전한 관계"] : ["일상 학교생활"],
          channels: /온라인|메시지|디지털|화면|채팅/.test(message) ? ["온라인 소통"] : ["face_to_face"],
        },
        trigger_tags: priority === 3 ? ["safety"] : ["any_school_day"],
        level,
        recommended_weekdays: ["월요일", "화요일", "수요일", "목요일", "금요일"],
        recommended_months: allMonths,
        similar_group: `school-life-${toKebab(category)}-${String(index + 1).padStart(3, "0")}`,
        sub_intent: toKebab(category),
        conflict_type: /다툼|갈등|사과|화해|놀림|괴롭힘/.test(message)
          ? "everyday_peer_conflict"
          : "not_applicable",
        requires_adult_support: /어른|선생님|도움 요청|알리기/.test(message),
        safety_priority: priority,
        active: true,
        source_refs: [sourceRefs.ksel, sourceRefs.togetherSchool, sourceRefs.gradeOne],
      };
    }),
  };
}

function buildDailyNoticeMessages(message1Db, schoolLifeDb) {
  const eventMessages = message1Db.messages.filter((item) => item.category === "날짜별 계기교육");
  const eventByMonthDay = new Map(eventMessages
    .filter((item) => item.activation_rule?.type === "fixed_date" && item.activation_rule.month && item.activation_rule.day)
    .map((item) => [`${String(item.activation_rule.month).padStart(2, "0")}-${String(item.activation_rule.day).padStart(2, "0")}`, item]));
  const safety = message1Db.messages.filter((item) => item.activation_rule?.type === "evergreen");
  const life = schoolLifeDb.messages;
  const daily = {};
  let schoolIndex = 0;
  for (let d = new Date(Date.UTC(2026, 0, 1)); d.getUTCFullYear() === 2026; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const key = d.toISOString().slice(0, 10);
    const monthDay = key.slice(5);
    const event = eventByMonthDay.get(monthDay);
    const message1 = event ?? safety[schoolIndex % safety.length];
    const message2 = life[schoolIndex % life.length];
    daily[key] = {
      event: event?.activation_rule?.label ?? null,
      text: message1.display_text,
      display_text: message1.display_text,
      message_1: message1.display_text.replace(/^1\.\s*/, ""),
      message_2: message2.display_text.replace(/^2\.\s*/, ""),
      source: "rebuilt-from-hwp-and-official-education-sources-2026-09-03",
    };
    schoolIndex += 1;
  }
  return {
    version: "v7",
    source: "HWP 안전 문구 우선 반영 및 공식 교육 자료 기반 재작성",
    total: Object.keys(daily).length,
    repeat_policy: "2026년 1월 1일부터 12월 31일까지의 평일 데이터를 만들고 다른 해에는 같은 월일 기준으로 반복 사용",
    daily_messages: daily,
  };
}

function buildSourceRefs() {
  return [
    {
      id: sourceRefs.hwp,
      title: "안전 지킴이 안내장 오늘의 안전 문구(최종).hwp",
      organization: "사용자 제공 자료",
      url: "G:/내 드라이브/2023 쏭쌤 노트/안전 지킴이 알림장/안전 지킴이 안내장 오늘의 안전 문구(최종).hwp",
      verified_scope: "오늘의 안전 문구 원자료 95개",
    },
    {
      id: sourceRefs.schoolSafety,
      title: "학교안전교육 7대 표준안 교육자료집 2025",
      organization: "교육부·학교안전공제중앙회",
      url: "https://www.schoolsafe24.or.kr/front/rpstr/selectRpstrInfo.do?menuSn=185&rpstrPstSn=4886&upperMenuSn=148",
      verified_scope: "학교 안전교육 영역과 생활 안전 문구 검토",
    },
    {
      id: sourceRefs.moeSafety,
      title: "학교 안전교육 7대 표준안",
      organization: "교육부",
      url: "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=58576&lev=0&m=020402&opType=N&s=moe&statusYN=C",
      verified_scope: "생활안전, 교통안전, 폭력 및 신변안전 등 영역 기준",
    },
    {
      id: sourceRefs.goeSafety,
      title: "초등학교 1-2학년군 안전교육 자료",
      organization: "경기도교육청",
      url: "https://www.goe.go.kr/goe/na/ntt/selectNttInfo.do?mi=10139&nttSn=990821",
      verified_scope: "학교 장소별 안전 수칙 검토",
    },
    {
      id: sourceRefs.ssif,
      title: "학교생활 1일 1안전수칙",
      organization: "학교안전공제중앙회",
      url: "https://ssif.or.kr/news/promotion.php?mode=read&seq=42793",
      verified_scope: "일상형 안전 실천 문구 검토",
    },
    {
      id: sourceRefs.ksel,
      title: "사회정서교육 문서 자료",
      organization: "에듀넷",
      url: "https://ksee.edunet.net/socioEmoLrnDocRsc/list/598",
      verified_scope: "사회정서교육 문구 방향 검토",
    },
    {
      id: sourceRefs.togetherSchool,
      title: "한국형 사회정서교육 프로그램 초등 저학년 교사용 지도서·학생용 워크북",
      organization: "교육부 사회정서성장지원과",
      url: "https://togetherschool.go.kr/togetherTalkTalk/shareInformation/detailView?pstId=80917",
      verified_scope: "초등 사회정서교육 방향 검토",
    },
    {
      id: sourceRefs.gradeOne,
      title: "유초 이음으로 성장하는 1학년",
      organization: "경기도교육청",
      url: "https://www.goe.go.kr/goe/na/ntt/selectNttInfo.do?mi=10961&nttSn=1054676",
      verified_scope: "초등 저학년 학교생활 적응과 관계 예절 검토",
    },
  ];
}

function validate(db1, db2, daily) {
  const errors = [];
  const badPatterns = [
    /말하\s*다시/,
    /기모둠/,
    /차분하게\s*:/,
    /우리 반 안전 습관\s*:/,
    /친구와 한 약속은 끝까지 지키기/,
    /친구와 정한 일을 잊지 않고 실천하기/,
    /차분하게\s*친구와 한 약속/,
  ];
  for (const [name, db, expectedPrefix] of [["1번", db1, "1. "], ["2번", db2, "2. "]]) {
    if (db.total !== 300 || db.messages.length !== 300) errors.push(`${name} DB가 300개가 아닙니다.`);
    const seen = new Set();
    for (const item of db.messages) {
      const normalized = item.message.replace(/\s+/g, " ").trim();
      if (seen.has(normalized)) errors.push(`${name} 중복: ${item.message}`);
      seen.add(normalized);
      if (!item.display_text.startsWith(expectedPrefix)) errors.push(`${name} 번호 접두어 오류: ${item.display_text}`);
      if (/[😀-🙏🚀-🧿]/u.test(item.display_text)) errors.push(`${name} 이모티콘 잔존: ${item.display_text}`);
      if (badPatterns.some((pattern) => pattern.test(item.display_text))) errors.push(`${name} 금지 패턴: ${item.display_text}`);
      if (!/[가기읽듣보기말하기확인하기생각하기표현하기존중하기알리기요청하기정리하기기억하기]$/.test(item.message)) {
        errors.push(`${name} 어미 점검 필요: ${item.display_text}`);
      }
    }
  }
  if (daily.total !== Object.keys(daily.daily_messages).length) errors.push("daily total 불일치");
  if (daily.total < 250) errors.push("평일 daily 메시지가 너무 적습니다.");
  return errors;
}

const db1 = buildMessage1Db();
const db2 = buildSchoolLifeDb();
const daily = buildDailyNoticeMessages(db1, db2);
const errors = validate(db1, db2, daily);

if (errors.length > 0) {
  console.error(errors.slice(0, 80).join("\n"));
  console.error(`errors=${errors.length}`);
  process.exit(1);
}

fs.writeFileSync("src/data/message-1-db.json", `${JSON.stringify(db1, null, 2)}\n`, "utf8");
fs.writeFileSync("src/data/school-life-message-db.json", `${JSON.stringify(db2, null, 2)}\n`, "utf8");
fs.writeFileSync("src/data/dailyNoticeMessages.json", `${JSON.stringify(daily, null, 2)}\n`, "utf8");
fs.writeFileSync("report/default-message-rebuild-v7.json", `${JSON.stringify({
  rebuilt_at: new Date().toISOString(),
  hwp_safety_count: hwpSafetyLines().length,
  message_1_total: db1.total,
  message_2_total: db2.total,
  daily_weekday_total: daily.total,
  validation_errors: errors,
}, null, 2)}\n`, "utf8");

console.log(`message_1=${db1.total}`);
console.log(`message_2=${db2.total}`);
console.log(`daily_weekdays=${daily.total}`);
console.log("report/default-message-rebuild-v7.json");
