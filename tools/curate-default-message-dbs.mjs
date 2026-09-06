import fs from "node:fs";
import path from "node:path";

const message1Path = path.resolve("src/data/message-1-db.json");
const schoolLifePath = path.resolve("src/data/school-life-message-db.json");
const dailyPath = path.resolve("src/data/dailyNoticeMessages.json");
const reportPath = path.resolve("report/default-message-db-curation-2026-09-03.json");

const badPrefixes = [
  "차분하게",
  "오늘의 안전 약속",
  "우리 반 안전 습관",
  "함께 지키기",
  "하루 동안 기억하기",
  "스스로 확인하기",
  "쉬는 시간에도",
  "이동할 때",
  "필요할 때 기억하기",
  "오늘의 실천",
  "우리 반 약속",
  "스스로 해보기",
  "말과 행동으로",
];

const specialFragments = [
  "통학 차량",
  "자전거",
  "현장체험",
  "현장 체험",
  "전동 킥보드",
  "대중교통",
  "승강장",
  "도로로",
  "차량 안",
  "차량에",
  "경기",
  "행사",
  "학교 밖",
  "대표하는 마음",
  "새로 온",
  "물건을 볼 때",
  "새 친구",
  "새 짝",
  "새 모둠",
];

const awkwardExact = new Map([
  ["친구와 한 약속은 끝까지 지키기", "친구와 정한 차례는 오늘 지키기"],
  ["친구와 한 약속을 지키기", "친구와 정한 일을 잊지 않고 실천하기"],
  ["처음 만난 친구에게 이름을 묻고", "처음 만난 친구에게 이름을 묻고 기억하기"],
  ["도움이 필요할 때 차분하게 요청하기", "도움이 필요하면 필요한 부분을 말하기"],
  ["서운한 마음은 직접 차분하게 말하기", "속상한 마음은 이유와 함께 말하기"],
  ["자전거나 킥보드 이용 시 안전모 쓰기", "교실과 복도에서는 앞을 보며 걷기"],
]);

const message1Fallbacks = [
  "교실과 복도에서는 앞을 보며 천천히 걷기",
  "쉬는 시간에도 친구를 밀지 않고 이동하기",
  "문을 열고 닫을 때 주변 친구를 먼저 살피기",
  "가방과 물건은 친구가 지나는 길에 두지 않기",
  "바닥에 물이 보이면 지나가지 말고 선생님께 알리기",
  "책상과 의자 주변에서는 갑자기 뛰지 않기",
  "가위와 연필은 끝이 친구를 향하지 않게 들기",
  "교실 물건을 옮길 때 두 손으로 천천히 들기",
  "높은 곳의 물건은 올라가지 말고 도움 요청하기",
  "복도 모퉁이에서는 앞사람이 있는지 살피기",
  "계단에서는 한 칸씩 앞을 보며 이동하기",
  "줄을 설 때 앞사람과 부딪히지 않게 간격 두기",
  "급식판은 두 손으로 잡고 천천히 이동하기",
  "뜨거운 국이나 음식은 조심해서 받기",
  "물감이나 풀이 묻은 손은 활동 뒤에 씻기",
  "실험 도구는 선생님 안내를 듣고 사용하기",
  "충전선과 전선은 발에 걸리지 않게 정리하기",
  "고장 난 물건은 만지지 말고 선생님께 알리기",
  "비상 방송이 나오면 하던 일을 멈추고 듣기",
  "대피할 때는 앞사람을 밀지 않고 걷기",
  "운동장에서는 주변 친구와 거리를 살피기",
  "공을 던지기 전 주변에 사람이 있는지 확인하기",
  "놀이 규칙을 지키며 안전하게 참여하기",
  "친구가 멈춰 달라고 하면 장난을 바로 멈추기",
  "다친 친구를 보면 가까운 어른께 알리기",
  "몸이 불편하면 참고 있지 말고 선생님께 알리기",
  "비 오는 날에는 젖은 바닥을 천천히 걷기",
  "눈이나 비가 온 뒤에는 미끄러운 곳을 피하기",
  "햇볕이 강한 날에는 그늘과 물 마시기를 챙기기",
  "개인정보가 보이는 화면은 친구와 함부로 나누지 않기",
  "온라인 글을 올리기 전 이름과 얼굴이 보이는지 확인하기",
  "친구 사진은 허락 없이 찍거나 공유하지 않기",
  "모르는 링크나 파일은 혼자 열지 않고 확인받기",
  "수업 자료를 사용할 때 출처를 확인하기",
  "학교 물건은 사용한 뒤 제자리에 정리하기",
  "공용 물건은 차례를 지켜 함께 사용하기",
  "정리 시간에는 내가 맡은 곳을 끝까지 확인하기",
  "쓰레기는 알맞은 통에 넣고 주변을 살피기",
  "손을 씻은 뒤 수도꼭지를 꼭 잠그기",
  "화장실 바닥이 젖어 있으면 조심해서 이동하기",
  "다른 반이 수업 중이면 복도에서 작은 소리로 이동하기",
  "학교 안내가 시작되면 대화를 멈추고 듣기",
  "수업 도구를 나눌 때 손잡이 쪽으로 건네기",
  "청소 도구는 장난치지 않고 정한 방법으로 사용하기",
  "활동 공간을 바꿀 때 필요한 물건만 들고 이동하기",
  "친구와 부딪히면 먼저 괜찮은지 묻기",
  "위험해 보이는 장난은 따라 하지 않고 멈추기",
  "창문 주변에서는 몸을 기대지 않고 떨어져 있기",
  "비상구와 소화기 앞에는 물건을 두지 않기",
  "수업 전 안전 안내를 듣고 활동 시작하기",
];

const schoolLifeFallbacks = [
  "친구를 만나면 먼저 반갑게 인사하기",
  "친구가 말할 때 끝까지 들어주기",
  "친구의 생각이 나와 달라도 존중하기",
  "고마운 마음은 바로 말로 전하기",
  "미안한 일이 있으면 구체적으로 사과하기",
  "놀이에 함께하고 싶으면 친절하게 말하기",
  "혼자 있는 친구에게 함께할지 물어보기",
  "차례가 필요한 활동에서는 순서를 기다리기",
  "공용 물건은 친구와 번갈아 사용하기",
  "친구 물건은 사용하기 전에 허락받기",
  "빌린 물건은 깨끗하게 돌려주기",
  "친구가 싫다고 하면 장난을 멈추기",
  "친구의 몸과 물건을 장난으로 건드리지 않기",
  "속상한 마음은 이유와 함께 말하기",
  "화가 날 때는 대답하기 전에 잠시 멈추기",
  "다툼이 생기면 있었던 일을 차례대로 말하기",
  "친구의 설명이 끝난 뒤 내 생각 말하기",
  "해결이 어려우면 선생님께 도움 요청하기",
  "놀림이나 괴롭힘을 보면 가까운 어른께 알리기",
  "친구의 개인 이야기는 허락 없이 전하지 않기",
  "친구 사진은 허락 없이 공유하지 않기",
  "온라인에서도 존중하는 말을 사용하기",
  "모둠 활동에서 맡은 역할을 확인하기",
  "모둠 친구에게 맡고 싶은 역할을 물어보기",
  "내 생각 한 가지를 짧고 분명하게 말하기",
  "친구의 좋은 점 한 가지를 말해주기",
  "발표를 마친 친구에게 기억에 남은 점 말하기",
  "어려워하는 친구에게 도와줄지 물어보기",
  "도움이 필요하면 필요한 부분을 말하기",
  "짝 활동을 시작할 때 먼저 반갑게 인사하기",
  "모둠 활동을 시작할 때 모든 친구와 인사하기",
  "함께 정한 차례는 오늘 지키기",
  "약속을 지키기 어렵다면 미리 말하기",
  "활동을 시작하기 전 함께 할 일을 확인하기",
  "수업 전에 필요한 준비물을 꺼내기",
  "설명을 들으며 중요한 낱말을 찾아보기",
  "모르는 내용은 질문으로 확인하기",
  "과제는 먼저 할 부분부터 시작하기",
  "과제를 마치면 빠진 곳이 없는지 살피기",
  "틀린 문제는 이유를 찾아 다시 풀어보기",
  "받은 조언 한 가지를 다음 활동에 써보기",
  "새로 배운 내용을 한 번 직접 활용해보기",
  "어려운 일은 작은 단계로 나누어 시작하기",
  "맡은 일은 끝난 뒤 친구들에게 알려주기",
  "하교 전에 두고 가는 물건이 없는지 확인하기",
  "주운 물건은 가까운 선생님께 가져다드리기",
  "함께 쓴 자리는 활동 뒤에 정리하기",
  "급식 준비를 도와주신 분께 감사 인사하기",
  "학교에서 만나는 어른께 바르게 인사하기",
  "다른 반 앞을 지날 때 작은 소리로 이동하기",
];

const generatedSafetyFallbacks = [
  ...[
    "교실에서는",
    "복도에서는",
    "계단에서는",
    "출입문 앞에서는",
    "책상 주변에서는",
    "사물함 앞에서는",
    "급식실에서는",
    "화장실 앞에서는",
    "도서관에서는",
    "운동장에서는",
    "특별실에서는",
    "줄을 설 때는",
    "수업 도구를 쓸 때는",
    "공용 물건을 쓸 때는",
    "이동 수업 때는",
    "청소 시간에는",
    "쉬는 시간에는",
    "비 오는 날에는",
    "더운 날에는",
    "추운 날에는",
  ].flatMap((place) => [
    `${place} 앞을 보며 천천히 이동하기`,
    `${place} 주변 친구와 부딪히지 않게 살피기`,
    `${place} 뛰지 않고 차례를 지키기`,
    `${place} 위험해 보이는 물건을 만지지 않기`,
    `${place} 도움이 필요하면 선생님께 알리기`,
    `${place} 사용한 물건을 통로에 두지 않기`,
    `${place} 친구가 불편해하면 행동을 멈추기`,
    `${place} 안내를 들은 뒤 활동 시작하기`,
  ]),
  ...[
    "문을 열기 전 반대편에 사람이 있는지 살피기",
    "문틈 가까이에 손을 두지 않기",
    "가방끈이 통로로 나오지 않게 정리하기",
    "풀린 신발끈은 이동하기 전에 다시 묶기",
    "무거운 물건은 혼자 들지 않고 도움 요청하기",
    "높은 곳 물건은 의자에 올라가지 말고 도움받기",
    "소화기와 비상구 앞은 비워두기",
    "비상 안내가 나오면 조용히 듣고 이동하기",
    "온라인 화면에 이름과 얼굴이 보이는지 확인하기",
    "친구 사진은 허락을 받은 뒤에만 사용하기",
  ],
];

const generatedSchoolLifeFallbacks = [
  ...[
    "친구가 말할 때는",
    "모둠 활동에서는",
    "짝 활동에서는",
    "놀이를 시작할 때는",
    "발표를 들을 때는",
    "도움이 필요할 때는",
    "속상한 일이 있을 때는",
    "수업을 시작할 때는",
    "과제를 할 때는",
    "하교 준비 때는",
    "친구를 만날 때는",
    "공용 물건을 쓸 때는",
    "역할을 나눌 때는",
    "의견이 다를 때는",
    "정리할 때는",
    "온라인 글을 쓸 때는",
    "칭찬할 일이 보이면",
    "고마운 일이 있으면",
    "미안한 일이 있으면",
    "어려운 문제가 나오면",
  ].flatMap((context) => [
    `${context} 먼저 듣고 내 생각 말하기`,
    `${context} 필요한 말을 짧고 분명하게 하기`,
    `${context} 친구의 입장을 한 번 생각하기`,
    `${context} 정한 차례를 기다리기`,
    `${context} 내가 할 일을 한 가지 확인하기`,
    `${context} 도움이 필요한 친구에게 물어보기`,
    `${context} 선생님께 필요한 도움 요청하기`,
    `${context} 활동 뒤에 사용한 자리를 정리하기`,
  ]),
  ...[
    "친구 이름을 부르며 반갑게 인사하기",
    "친구의 좋은 행동을 구체적으로 말해주기",
    "발표한 친구에게 기억에 남은 점 전하기",
    "내가 맡은 역할을 끝낸 뒤 모둠에 알려주기",
    "어려운 일은 작은 순서로 나누어 시작하기",
    "틀린 문제는 이유를 찾아 다시 풀어보기",
    "받은 조언에서 고칠 점 한 가지 고르기",
    "함께 정한 해결 방법을 오늘 한 번 실천하기",
    "친구가 싫다고 한 행동은 다시 하지 않기",
    "내 말이 친구에게 상처가 됐는지 돌아보기",
  ],
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stripNumber(text) {
  return String(text ?? "").replace(/^\s*\d+\.\s*/, "").trim();
}

function stripAwkwardPrefix(text) {
  let next = stripNumber(text);
  next = next.replace(/\s+/g, " ").trim();
  next = awkwardExact.get(next) ?? next;
  for (const prefix of badPrefixes) {
    const match = next.match(new RegExp(`^${prefix}\\s*[:：]\\s*(.+)$`, "u"));
    if (match) return stripAwkwardPrefix(match[1]);
  }
  next = next.replace(/\s*:\s*/g, " : ");
  return awkwardExact.get(next) ?? next;
}

function isSpecial(text) {
  return specialFragments.some((fragment) => text.includes(fragment));
}

function normalizeForDuplicate(text) {
  return stripAwkwardPrefix(text)
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/(하기|살피기|알리기|확인하기|이동하기|사용하기|기다리기|존중하기|말하기|듣기|걷기|나누기|정리하기|요청하기)$/u, "");
}

function nextFallback(pool, used, offset = 0) {
  for (let index = 0; index < pool.length * 6; index += 1) {
    const base = pool[(index + offset) % pool.length];
    const candidate = index < pool.length ? base : `${base.replace(/기$/u, "")} 다시 확인하기`;
    const key = normalizeForDuplicate(candidate);
    if (!used.has(key)) return candidate;
  }
  throw new Error("대체 문구가 부족합니다.");
}

function curateDb(db, options) {
  const used = new Set();
  const changes = [];
  let fallbackOffset = 0;
  db.messages = db.messages.map((item, index) => {
    const original = item.message;
    let message = stripAwkwardPrefix(original);
    const isDate = item.category === "날짜별 계기교육";
    const normalized = normalizeForDuplicate(message);
    if (!isDate && (isSpecial(message) || used.has(normalized) || message.length < 12)) {
      message = nextFallback(options.fallbacks, used, fallbackOffset);
      fallbackOffset += 1;
    }
    const key = normalizeForDuplicate(message);
    used.add(key);
    const next = {
      ...item,
      id: `${options.idPrefix}-${String(index + 1).padStart(3, "0")}`,
      emoji: "",
      message,
      display_text: `${options.displayNumber}. ${message}`,
      active: item.active !== false,
    };
    if (original !== message || item.display_text !== next.display_text || item.emoji) {
      changes.push({ id: next.id, before: original, after: message });
    }
    return next;
  });
  db.total = db.messages.length;
  return changes;
}

function curateDailyNotice(daily) {
  const usedByDate = new Set();
  const changes = [];
  let offset = 0;
  for (const [dateKey, entry] of Object.entries(daily.daily_messages ?? {})) {
    for (const field of ["text", "display_text", "message_1", "message_2"]) {
      if (!entry[field]) continue;
      const original = entry[field];
      let message = stripAwkwardPrefix(original);
      if (isSpecial(message)) {
        const fallbackPool = field === "message_2" ? schoolLifeFallbacks : message1Fallbacks;
        message = nextFallback(fallbackPool, usedByDate, offset);
        offset += 1;
      }
      if (field === "display_text" || field === "text") {
        entry[field] = `1. ${message}`;
      } else if (field === "message_1") {
        entry[field] = message;
      } else {
        entry[field] = message;
      }
      usedByDate.add(normalizeForDuplicate(message));
      if (original !== entry[field]) changes.push({ dateKey, field, before: original, after: entry[field] });
    }
  }
  return changes;
}

const message1 = readJson(message1Path);
const schoolLife = readJson(schoolLifePath);
const daily = readJson(dailyPath);

const message1Changes = curateDb(message1, {
  idPrefix: "MESSAGE1",
  displayNumber: "1",
  fallbacks: [...message1Fallbacks, ...generatedSafetyFallbacks],
});
const schoolLifeChanges = curateDb(schoolLife, {
  idPrefix: "SCHOOL-LIFE",
  displayNumber: "2",
  fallbacks: [...schoolLifeFallbacks, ...generatedSchoolLifeFallbacks],
});
const dailyChanges = curateDailyNotice(daily);

writeJson(message1Path, message1);
writeJson(schoolLifePath, schoolLife);
writeJson(dailyPath, daily);

const report = {
  updatedAt: new Date().toISOString(),
  policy: [
    "처음 자료의 계기교육·안전·사회정서학습 방향은 유지",
    "접두어형 문구 제거",
    "특수한 통학·자전거·현장체험 중심 문구를 일반 학교생활 문구로 대체",
    "정규화 중복 문구를 일상 교실 문장으로 대체",
    "화면 표시에서는 1번·2번 앞 이모티콘 제거 유지",
  ],
  totals: {
    message1: message1.messages.length,
    schoolLife: schoolLife.messages.length,
    dailyNotice: Object.keys(daily.daily_messages ?? {}).length,
  },
  changed: {
    message1: message1Changes.length,
    schoolLife: schoolLifeChanges.length,
    dailyNotice: dailyChanges.length,
  },
  samples: {
    message1: message1Changes.slice(0, 12),
    schoolLife: schoolLifeChanges.slice(0, 12),
    dailyNotice: dailyChanges.slice(0, 12),
  },
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
writeJson(reportPath, report);
console.log(JSON.stringify(report, null, 2));
