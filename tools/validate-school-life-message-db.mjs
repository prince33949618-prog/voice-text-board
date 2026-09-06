import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve("src/data/school-life-message-db.json");
const reportPath = path.resolve("report/SCHOOL_LIFE_MESSAGE_DB_VALIDATION.md");
const expectedCounts = {
  "친구 관계": 55,
  "수업 생활": 50,
  "공동체 생활": 45,
  "갈등 해결": 40,
  "책임감": 40,
  "성장과 도전": 35,
  "존중과 배려": 35,
};
const requiredFields = [
  "id", "emoji", "message", "display_text", "category", "sub_category",
  "school_contexts", "context_tags", "trigger_tags", "level", "recommended_weekdays",
  "recommended_months", "similar_group", "sub_intent", "conflict_type",
  "requires_adult_support", "safety_priority", "active",
];
const allWeekdays = ["월요일", "화요일", "수요일", "목요일", "금요일"];
const weekdays = new Set(allWeekdays);
const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const contextDimensions = ["places", "times", "activities", "situations", "channels"];
const expectedTriggerVocabulary = new Set([
  "any_school_day", "conflict", "field_trip", "online", "presentation", "rainy_day", "safety", "term_start",
]);
const expectedBullyingSubIntents = new Set([
  "report-bullying", "report-repeated-play", "report-teasing", "ask-adult-help",
  "report-harmful-rumor", "show-online-evidence", "bystander-report-online",
  "move-safe", "repeated-exclusion-help", "report-recurrence",
]);
const forbiddenPhrases = [
  "급식은 먹을 만큼만 받기",
  "교실을 나갈 때 의자를 넣고 이동하기",
  "교실 바닥에 떨어진 쓰레기 하나 줍기",
  "사용한 색연필은 제자리에 넣기",
  "감정에 이름 붙이기",
  "마음을 관찰하기",
  "자기 성찰하기",
];
const inappropriateTerms = ["특정 정당", "후보 지지", "제품 구매", "광고 보기", "전도하기", "기도하기"];
const variableRuleTerms = ["우측통행", "오른쪽으로 걷기", "정해진 자리에서 먹기", "의자를 넣고", "색연필은 제자리에"];
const resolvedReviewTerms = [
  "해결한 다툼은 다시 꺼내지 않고",
  "놀림이 속상하면 느낀 점을 바로 말하기",
  "오해가 생기면 관련된 친구에게 직접 확인하기",
  "몸이 부딪힌 뒤에는 안전한 곳에서 대화하기",
  "친구의 연락처는 허락받은 사람에게만 알려주기",
  "말이 느린 친구",
  "교실 뒤까지 들리는 목소리",
  "손을 들고 차례 기다리기",
];
const retiredAwkwardPhrases = [
  "모둠 활동에서 말이나 글 또는 그림으로 의견 전하기",
  "친구의 공연이 끝날 때까지 조용히 응원하기",
  "친구가 공연을 마치면 노력한 점을 칭찬하기",
  "친구가 노력한 모습을 발견하면 구체적으로 칭찬하기",
  "내 차례가 올 때까지 편안하게 기다리기",
  "함께 앉을 자리가 필요하면 선생님께 도움 요청하기",
  "물을 마실 때 친구와 안전한 간격 두기",
  "자리가 필요한 친구에게 앉을지 먼저 물어보기",
  "서로 다른 생활 방식을 존중하는 말 사용하기",
  "각자 먹는 음식을 존중하는 말 사용하기",
  "실험 결과를 판단하기 전에 자세히 관찰하기",
  "모둠에서 맡은 역할의 진행 상황 알려주기",
  "다른 반의 공연이 끝나면 힘찬 박수 보내기",
  "물을 마실 때 학교에서 안내한 방법 따르기",
  "갈등 중 친구가 말한 핵심을 한 문장으로 확인하기",
  "내가 본 사실과 짐작한 내용을 구분하기",
  "해결 방법을 두 가지 이상 제안해보기",
  "연습한 횟수나 시간을 간단히 기록하기",
  "오늘 새로 해본 행동 한 가지 말하기",
  "짧은 발표 역할에 자원해보기",
  "친구 연락처는 친구가 직접 알려주도록 기다리기",
  "조금 어려운 문제 한 개에 도전해보기",
  "발표가 부담되면 짧은 부분부터 맡아보기",
  "평소 고르지 않던 분야의 책 읽어보기",
  "새로 만난 낱말로 짧은 문장 만들어보기",
  "문제의 다른 풀이 방법 한 가지 찾아보기",
  "익숙하지 않은 노래의 한 소절 연습하기",
  "새로운 재료로 작은 작품 만들어보기",
  "처음 사용하는 도구는 안내받은 방법으로 사용해보기",
  "놀이에서 아쉬워하는 친구에게 따뜻한 말 건네기",
  "도움이 필요할 때 친구에게 정중하게 부탁하기",
  "함께 쓰는 재료를 필요한 만큼씩 나누어 사용하기",
  "짝 활동을 시작할 때 먼저 다정하게 말 걸기",
  "친구와 정한 약속을 그대로 지키기",
  "학급 온라인 공간에서도 다정한 말 사용하기",
  "함께 놀자는 말을 들으면 내 생각을 분명히 답하기",
  "이해하지 못한 부분을 구체적으로 다시 묻기",
  "과제를 받으면 할 수 있는 첫 부분부터 시작하기",
  "계단에서는 한 칸씩 차분하게 이동하기",
  "분리배출 안내를 확인해 알맞게 버리기",
  "어떤 행동 때문에 속상했는지 차분히 말하기",
  "상대에게 바라는 행동을 구체적으로 말하기",
  "친구가 그렇게 행동한 까닭을 차분히 묻기",
  "기억나는 일을 본 그대로 말하기",
  "내 실수를 바로잡을 방법을 친구에게 물어보기",
  "망가뜨린 물건은 주인과 상의해 바로잡기",
  "문제를 말할 때 친구의 행동을 구체적으로 말하기",
  "학급에서 맡은 역할은 스스로 기억해 수행하기",
  "내 준비물은 필요한 때에 스스로 챙겨 사용하기",
  "망가진 도구는 그대로 두지 않고 선생님께 알리기",
  "실험과 만들기에서는 안내받은 안전 방법 지키기",
  "청소 도구는 안전한 방법으로 사용하기",
  "어려워 보여도 할 수 있는 부분부터 시작하기",
  "어려운 부분을 구체적으로 알려 도움 요청하기",
  "더 알고 싶은 내용은 스스로 찾아보기",
  "처음보다 나아지도록 한 번 더 고쳐보기",
  "고친 뒤 달라진 점을 스스로 확인하기",
  "도움을 부탁할 때 예의 있는 말 사용하기",
  "친구가 먹는 음식이 궁금하면 이름을 정중히 물어보기",
  "친구의 작품에서 좋은 점 한 가지 말하기",
  "답을 쓴 뒤 알맞은 단위를 확인하기",
  "종이는 필요한 만큼만 사용하기",
  "학교의 꽃과 나무는 그대로 두고 감상하기",
  "하루를 시작하며 시간표를 스스로 확인하기",
  "수업이 시작되면 책상 위를 학습하기 좋게 정리하기",
  "잘못한 행동을 정확히 말하며 사과하기",
];
const metadataRegressionExpectations = {
  "SCHOOL-058": { trigger: "any_school_day" },
  "SCHOOL-059": { trigger: "any_school_day" },
  "SCHOOL-079": { requires_adult_support: false },
  "SCHOOL-099": { similar_group: "presentation-performance" },
  "SCHOOL-105": { safety_priority: 2 },
  "SCHOOL-106": { requires_adult_support: false },
  "SCHOOL-108": { safety_priority: 2 },
  "SCHOOL-109": { safety_priority: 2 },
  "SCHOOL-115": { safety_priority: 2 },
  "SCHOOL-131": { safety_priority: 2 },
  "SCHOOL-132": { safety_priority: 2 },
  "SCHOOL-136": { safety_priority: 2 },
  "SCHOOL-140": { requires_adult_support: false },
  "SCHOOL-214": { safety_priority: 2 },
  "SCHOOL-215": { safety_priority: 2 },
  "SCHOOL-218": { safety_priority: 2 },
  "SCHOOL-228": { safety_priority: 2 },
  "SCHOOL-291": { sub_category: "안전 도움", requires_adult_support: true },
};
const errors = [];

function parseDb() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch (error) {
    errors.push(`JSON 파싱 오류: ${error.message}`);
    return null;
  }
}

function isEmpty(value) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function normalize(text) {
  return text
    .replace(/[\s,.!?·'"“”‘’()[\]{}:;~\-_/]/g, "")
    .replace(/(하기|해보기|말하기|들어주기|물어보기|알려주기|지켜주기|기다려주기|건네기|묻기|듣기|읽기|쓰기|찾기|지키기|확인하기|정하기|알리기|전하기|사용하기|시작하기|마치기|살피기|연습하기|시도하기|바라보기|나누기|도와주기|돌려주기|인정하기)$/u, "");
}

function trigrams(text) {
  const chars = [...normalize(text)];
  if (chars.length < 3) return new Set([chars.join("")]);
  const result = new Set();
  for (let i = 0; i <= chars.length - 3; i += 1) result.add(chars.slice(i, i + 3).join(""));
  return result;
}

function diceSimilarity(a, b) {
  const left = trigrams(a);
  const right = trigrams(b);
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return (2 * intersection) / (left.size + right.size);
}

function levenshteinSimilarity(a, b) {
  const left = [...normalize(a)];
  const right = [...normalize(b)];
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length, 1);
}

function findSimilarPairs(messages) {
  const pairs = [];
  for (let i = 0; i < messages.length; i += 1) {
    for (let j = i + 1; j < messages.length; j += 1) {
      const dice = diceSimilarity(messages[i].message, messages[j].message);
      const edit = levenshteinSimilarity(messages[i].message, messages[j].message);
      const score = Math.max(dice, edit);
      if (score >= 0.65) {
        pairs.push({ left: messages[i], right: messages[j], score });
      }
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

const db = parseDb();
if (!db) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (db.version !== "1.0") errors.push(`version 불일치: ${db.version}`);
if (db.type !== "evergreen-school-life-message-db") errors.push(`type 불일치: ${db.type}`);
if (db.total !== 300) errors.push(`total 불일치: ${db.total}`);
if (!Array.isArray(db.messages) || db.messages.length !== 300) errors.push(`messages 수량 불일치: ${db.messages?.length}`);
if (!db.level_definitions || Object.keys(db.level_definitions).sort().join(",") !== "1,2,3") errors.push("난이도 정의 누락");
if (!db.selection_policy || db.selection_policy.weekday_mode !== "soft_preference" || db.selection_policy.month_mode !== "soft_preference") errors.push("선택 정책 오류");
if (JSON.stringify(db.context_dimensions) !== JSON.stringify(contextDimensions)) errors.push("상황 차원 정의 오류");

if (!db.safety_priority_definitions || Object.keys(db.safety_priority_definitions).sort().join(",") !== "1,2,3") errors.push("Missing safety priority definitions");
if (!db.context_vocabularies || contextDimensions.some((dimension) => !Array.isArray(db.context_vocabularies[dimension]) || db.context_vocabularies[dimension].length === 0)) errors.push("Invalid context vocabularies");
if (!Array.isArray(db.trigger_vocabulary) || db.trigger_vocabulary.length === 0 || db.trigger_vocabulary.some((trigger) => !expectedTriggerVocabulary.has(trigger))) errors.push("Invalid trigger vocabulary");

const ids = new Set();
const texts = new Set();
const counts = Object.fromEntries(Object.keys(expectedCounts).map((category) => [category, 0]));
const similarGroups = new Map();
const conflictCounts = { not_applicable: 0, everyday_peer_conflict: 0, bullying_or_violence: 0 };

for (let i = 0; i < db.messages.length; i += 1) {
  const item = db.messages[i];
  const label = item.id ?? `index ${i}`;
  for (const field of requiredFields) if (isEmpty(item[field])) errors.push(`${label}: 빈 필드 ${field}`);
  const expectedId = `SCHOOL-${String(i + 1).padStart(3, "0")}`;
  if (item.id !== expectedId) errors.push(`${label}: ID 순서 오류, expected ${expectedId}`);
  if (ids.has(item.id)) errors.push(`${label}: 중복 ID`);
  ids.add(item.id);
  if (texts.has(item.message)) errors.push(`${label}: 동일 문구 중복`);
  texts.add(item.message);
  if (item.display_text !== `2. ${item.emoji} ${item.message}`) errors.push(`${label}: display_text 형식 오류`);
  if (!/\p{Extended_Pictographic}/u.test(item.emoji)) errors.push(`${label}: 이모티콘 오류`);
  if (/[.。]/u.test(item.message)) errors.push(`${label}: 마침표 포함`);
  if (!/기$/u.test(item.message)) errors.push(`${label}: 실천형 어미가 아님`);
  if (/(않기|말기)$/u.test(item.message)) errors.push(`${label}: 부정 명령형 어미`);
  if (item.message.length < 10 || item.message.length > 35) errors.push(`${label}: 문장 길이 범위 초과 (${item.message.length})`);
  if (!Object.hasOwn(expectedCounts, item.category)) errors.push(`${label}: 알 수 없는 카테고리`);
  else counts[item.category] += 1;
  if (!Number.isInteger(item.level) || item.level < 1 || item.level > 3) errors.push(`${label}: 난이도 오류`);
  if (!item.school_contexts.every((value) => typeof value === "string" && value.trim())) errors.push(`${label}: 학교 상황 오류`);
  if (typeof item.context_tags !== "object" || item.context_tags === null) errors.push(`${label}: 상황 차원 오류`);
  else for (const dimension of contextDimensions) {
    if (!Array.isArray(item.context_tags[dimension]) || item.context_tags[dimension].length === 0) errors.push(`${label}: 빈 상황 차원 ${dimension}`);
  }
  if (!Array.isArray(item.trigger_tags) || item.trigger_tags.length === 0) errors.push(`${label}: 상황 트리거 오류`);
  if (!item.recommended_weekdays.every((value) => weekdays.has(value))) errors.push(`${label}: 추천 요일 오류`);
  if (JSON.stringify(item.recommended_weekdays) !== JSON.stringify(allWeekdays)) errors.push(`${label}: 근거 없는 요일 제한`);
  if (!item.recommended_months.every((value) => Number.isInteger(value) && value >= 1 && value <= 12)) errors.push(`${label}: 추천 월 오류`);
  const expectedMonths = item.trigger_tags.includes("term_start") ? [3, 9] : item.trigger_tags.includes("rainy_day") ? [6, 7] : allMonths;
  if (JSON.stringify(item.recommended_months) !== JSON.stringify(expectedMonths)) errors.push(`${label}: 상황 트리거와 추천 월 불일치`);
  if (typeof item.similar_group !== "string" || !item.similar_group.trim()) errors.push(`${label}: 의미군 오류`);
  else similarGroups.set(item.similar_group, (similarGroups.get(item.similar_group) ?? 0) + 1);
  if (!Object.hasOwn(conflictCounts, item.conflict_type)) errors.push(`${label}: 갈등 유형 오류`);
  else conflictCounts[item.conflict_type] += 1;
  if (item.category === "갈등 해결" && item.conflict_type === "not_applicable") errors.push(`${label}: 갈등 유형 미분류`);
  if (item.category !== "갈등 해결" && item.conflict_type !== "not_applicable") errors.push(`${label}: 비갈등 문구의 갈등 유형 오류`);
  if (item.conflict_type === "bullying_or_violence" && (!item.requires_adult_support || item.safety_priority !== 3)) errors.push(`${label}: 학교폭력 안전 우선순위 오류`);
  if (typeof item.requires_adult_support !== "boolean") errors.push(`${label}: 성인 지원 필드 오류`);
  if (!Number.isInteger(item.safety_priority) || item.safety_priority < 1 || item.safety_priority > 3) errors.push(`${label}: 안전 우선순위 오류`);
  if (typeof item.active !== "boolean" || item.active !== true) errors.push(`${label}: active 오류`);
  if (item.context_tags && db.context_vocabularies) {
    for (const dimension of contextDimensions) {
      if (Array.isArray(item.context_tags[dimension]) && item.context_tags[dimension].some((value) => !db.context_vocabularies[dimension]?.includes(value))) errors.push(`${label}: unregistered context value in ${dimension}`);
    }
  }
  if (Array.isArray(item.trigger_tags) && item.trigger_tags.some((trigger) => !db.trigger_vocabulary?.includes(trigger))) errors.push(`${label}: unregistered trigger`);
  if (item.safety_priority === 3 && !item.trigger_tags?.some((tag) => ["conflict", "online", "safety"].includes(tag))) errors.push(`${label}: priority-3 trigger missing`);
  if (expectedBullyingSubIntents.has(item.sub_intent) && (item.conflict_type !== "bullying_or_violence" || !item.requires_adult_support || item.safety_priority !== 3)) errors.push(`${label}: bullying intent metadata mismatch`);
  const metadataExpectation = metadataRegressionExpectations[item.id];
  if (metadataExpectation) {
    for (const [field, expected] of Object.entries(metadataExpectation)) {
      if (field === "trigger") {
        if (!item.trigger_tags.includes(expected)) errors.push(`${label}: expected trigger ${expected}`);
      } else if (item[field] !== expected) errors.push(`${label}: expected ${field}=${expected}, got ${item[field]}`);
    }
  }
  for (const phrase of forbiddenPhrases) if (item.message.includes(phrase)) errors.push(`${label}: 제외 문구 포함 (${phrase})`);
  for (const phrase of inappropriateTerms) if (item.message.includes(phrase)) errors.push(`${label}: 학교생활 부적합 표현 (${phrase})`);
  for (const phrase of variableRuleTerms) if (item.message.includes(phrase)) errors.push(`${label}: 학교별 가변 규칙 표현 (${phrase})`);
  for (const phrase of resolvedReviewTerms) if (item.message.includes(phrase)) errors.push(`${label}: 1차 전문가 검토 미반영 표현 (${phrase})`);
  for (const phrase of retiredAwkwardPhrases) if (item.message.includes(phrase)) errors.push(`${label}: retired awkward phrase (${phrase})`);
  if (/\b(?:19|20)\d{2}\b/u.test(item.message)) errors.push(`${label}: 특정 연도 포함`);
}

for (const [category, expected] of Object.entries(expectedCounts)) {
  if (counts[category] !== expected) errors.push(`${category}: expected ${expected}, got ${counts[category]}`);
}
if (similarGroups.size < 20 || similarGroups.size > 40) errors.push(`의미군 수 부적절: ${similarGroups.size}`);
for (const [group, count] of similarGroups) if (count < 2) errors.push(`단독 의미군: ${group}`);
if (conflictCounts.everyday_peer_conflict === 0 || conflictCounts.bullying_or_violence === 0) errors.push("갈등 유형 분포 누락");

const similarPairs = findSimilarPairs(db.messages);
for (const pair of similarPairs) {
  errors.push(`과도 유사 ${pair.left.id}/${pair.right.id} (${pair.score.toFixed(3)}): ${pair.left.message} <> ${pair.right.message}`);
}

if (errors.length > 0) {
  console.error(`검증 실패 (${errors.length}건)`);
  console.error(errors.join("\n"));
  process.exit(1);
}

const negativeSubordinateCount = db.messages.filter((item) => /(않고|못한|빠뜨렸|틀린)/u.test(item.message)).length;
const levelCounts = db.messages.reduce((acc, item) => {
  acc[item.level] = (acc[item.level] ?? 0) + 1;
  return acc;
}, {});
const triggerCounts = db.messages.flatMap((item) => item.trigger_tags).reduce((acc, trigger) => {
  acc[trigger] = (acc[trigger] ?? 0) + 1;
  return acc;
}, {});
const report = `# 학교생활 실천 문구 DB 검증 보고서

- 검증 대상: \`${dbPath}\`
- 검증 일자: ${new Date().toISOString().slice(0, 10)}
- 결과: **통과**

## 자동 검증 결과

| 항목 | 결과 |
|---|---:|
| JSON 파싱 | 오류 0건 |
| 전체 문구 수 | ${db.messages.length}개 |
| ID 연속성·중복 | SCHOOL-001~SCHOOL-300, 오류 0건 |
| 동일 문구 | 0건 |
| 과도 유사 문구 | 0건 (문자 3-gram Dice·편집 유사도 최대값 0.65 이상 기준) |
| 빈 필드 | 0건 |
| display_text 형식 | 오류 0건 |
| 이모티콘 | 누락·형식 오류 0건 |
| 마침표 | 포함 0건 |
| 실천형 어미 | 오류 0건 |
| 부정 명령형 어미 | 0건 |
| 특정 연도 고정 | 0건 |
| 제외·부적합·학교별 가변 규칙 표현 | 0건 |
| 1차 전문가 필수수정 표현 | 잔존 0건 |
| 의미군 | ${similarGroups.size}개, 단독 의미군 0개 |
| 갈등 유형 | 일상 갈등 ${conflictCounts.everyday_peer_conflict}개, 학교폭력·위험 ${conflictCounts.bullying_or_violence}개 |
| 추천 요일 | 모든 평일을 약한 선호값으로 사용 |
| 추천 월 | 범용 12개월, 새 학기·비 오는 날만 상황별 제한 |
| 상황 차원 | 장소·시간·활동·상황·채널 분리 완료 |

## 카테고리별 수량

${Object.entries(counts).map(([category, count]) => `- ${category}: ${count}개`).join("\n")}

## 품질 검토

- 모든 문구를 학교 안에서 당일 실행 가능한 단일 중심 행동으로 검토함
- 담임교사가 학생에게 자연스럽게 제안할 수 있는 부드러운 실천형 문장으로 통일함
- 이모티콘과 행동 의미의 대응을 전 항목 검토함
- 반드시 제외할 7개 예시와 추상적 자기 관찰 표현을 배제함
- 학교마다 달라질 수 있는 이동 방향·좌석·세부 정리 규칙을 배제함
- 갈등과 학교폭력을 구분하고 학교폭력·위험 문구는 성인 지원과 안전 우선순위 3을 강제함
- 추천 트리거 분포: ${Object.entries(triggerCounts).map(([key, value]) => `${key} ${value}개`).join(", ")}
- 안전·개인정보처럼 명확한 제한이 필요한 ${negativeSubordinateCount}개 문장에는 부정 표현이 보조적으로 쓰였으나, 부정 명령형 어미는 사용하지 않음
- 난이도 분포: 1단계 ${levelCounts[1]}개, 2단계 ${levelCounts[2]}개, 3단계 ${levelCounts[3]}개

## 남은 이슈

- 없음
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, "utf8");
console.log(`검증 통과: ${db.messages.length}개, 중복 0건, 과도 유사 0건`);
console.log(`보고서: ${reportPath}`);
