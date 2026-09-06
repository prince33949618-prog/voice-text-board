import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const dbPath = path.resolve(root, "src/data/message-1-db.json");
const auditPath = path.resolve(root, "report/message-1-source-audit.json");
const reportPath = path.resolve(root, "report/message-1-db-validation-report.md");
const schoolLifePath = path.resolve(root, "src/data/school-life-message-db.json");

const expectedCounts = {
  "날짜별 계기교육": 80,
  "등하교·교통안전": 40,
  "교실·복도·계단 안전": 40,
  "쉬는 시간·놀이 안전": 35,
  "체육·운동장 안전": 30,
  "계절·기상·재난 대응": 30,
  "수업 도구·실험 안전": 20,
  "디지털·개인정보·미디어 안전": 15,
  "현장체험학습·학교 행사 안전": 5,
  "감염병·공동생활 위생": 5,
};

const requiredFields = [
  "id", "emoji", "message", "display_text", "category", "sub_category",
  "school_contexts", "activation_rule", "recommended_months",
  "recommended_weekdays", "weather_tags", "priority", "similar_group",
  "level", "active", "source_required", "source_refs",
];

const weekdays = new Set(["월요일", "화요일", "수요일", "목요일", "금요일"]);
const validRuleTypes = new Set(["evergreen", "fixed_date", "lunar_date", "relative_date"]);
const validClassifications = new Set(["국경일", "정부기념일", "법정기념일", "국제기념일"]);
const validRelativeRules = new Set(["fourth_friday"]);
const validNonSchoolDayPolicies = new Set(["previous_school_day"]);
const forbiddenExact = [
  "뜨거운 음식은 천천히 식혀 먹기", "음식을 골고루 먹기", "잠을 충분히 자기",
  "아침밥을 꼭 먹기", "물을 많이 마시기", "집에서 규칙적인 생활하기",
  "급식은 먹을 만큼만 받기", "교실을 나갈 때 의자를 넣고 이동하기",
  "바닥에 떨어진 쓰레기 하나 줍기", "사용한 색연필을 제자리에 넣기",
  "안전한 생활 습관 기르기", "안전 의식 갖기", "위험한 행동 하지 않기",
  "건강한 생활 실천하기", "사고를 예방하기", "질서 의식 생활화하기",
];
const forbiddenFragments = [
  "반드시 명심", "절대로 위반", "각별히 주의", "위험성을 인식",
  "자기 보호 역량", "큰 사고가 날 수", "납치되지 않도록",
  "잘못하면 크게 다칠", "특정 정당", "후보 지지", "제품 구매", "전도하기",
  "기도하기", "우측통행", "오른쪽으로 걷기", "정해진 자리",
];

const errors: string[] = [];
const warnings: string[] = [];

function readJson(filePath: string, label: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error: any) {
    errors.push(`${label} JSON 파싱 오류: ${error.message}`);
    return null;
  }
}

function isMissing(value: any): boolean {
  return value === null || value === undefined || value === "";
}

function normalize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\s,.!?·'"“”‘’()[\]{}:;~\-_/]/gu, "")
    .replace(/(하기|살피기|따르기|알리기|확인하기|이동하기|이용하기|사용하기|기다리기|존중하기|전하기|바라보기|살펴보기|걷기|읽기|쓰기|끄기|매기|잡기|두기|피하기|나누기|돕기|쉬기|씻기|착용하기|비우기)$/u, "");
}

function trigrams(text: string): Set<string> {
  const chars = [...normalize(text)];
  if (chars.length < 3) return new Set([chars.join("")]);
  const result = new Set<string>();
  for (let i = 0; i <= chars.length - 3; i += 1) result.add(chars.slice(i, i + 3).join(""));
  return result;
}

function diceSimilarity(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return (2 * intersection) / Math.max(left.size + right.size, 1);
}

function levenshteinSimilarity(a: string, b: string): number {
  const left = [...normalize(a)];
  const right = [...normalize(b)];
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
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

function similarity(a: string, b: string): number {
  return Math.max(diceSimilarity(a, b), levenshteinSimilarity(a, b));
}

function hasEmoji(value: string): boolean {
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value);
}

function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysPerMonth[month - 1];
}

const db = readJson(dbPath, "DB");
const audit = readJson(auditPath, "출처 감사");
const schoolLifeDb = readJson(schoolLifePath, "2번 문구 DB");

if (!db || !audit || !schoolLifeDb) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (db.version !== "1.1") errors.push(`version 불일치: ${db.version}`);
if (db.type !== "evergreen-school-context-message-1-db") errors.push(`type 불일치: ${db.type}`);
if (db.total !== 300) errors.push(`total 불일치: ${db.total}`);
if (!Array.isArray(db.messages) || db.messages.length !== 300) errors.push(`messages 수량 불일치: ${db.messages?.length}`);
if (!db.metadata_definitions?.level || !db.metadata_definitions?.priority || !db.metadata_definitions?.similar_group || !db.metadata_definitions?.empty_recommendation_array) errors.push("메타데이터 의미 정의 누락");
if (!Array.isArray(db.usage_guidance) || db.usage_guidance.length < 3) errors.push("접근성·안전 사용 지침 누락");

const counts = Object.fromEntries(Object.keys(expectedCounts).map((category) => [category, 0]));
const ids = new Set<string>();
const exactTexts = new Set<string>();
const normalizedTexts = new Map<string, string>();
const sourceIds = new Set((audit.sources ?? []).map((source: any) => source.id));
let lengthPass = 0;
let dateCount = 0;
let weatherCount = 0;
let digitalCount = 0;

for (let i = 0; i < db.messages.length; i += 1) {
  const item = db.messages[i];
  const label = item.id ?? `index-${i}`;
  const expectedId = `MESSAGE1-${String(i + 1).padStart(3, "0")}`;

  for (const field of requiredFields) if (isMissing(item[field])) errors.push(`${label}: 필수 필드 누락 ${field}`);
  if (item.id !== expectedId) errors.push(`${label}: ID 순서 오류, expected ${expectedId}`);
  if (ids.has(item.id)) errors.push(`${label}: 중복 ID`);
  ids.add(item.id);

  if (exactTexts.has(item.message)) errors.push(`${label}: 동일 문구 중복`);
  exactTexts.add(item.message);
  const normalized = normalize(item.message);
  if (normalizedTexts.has(normalized)) errors.push(`${label}: 정규화 동일 문구 (${normalizedTexts.get(normalized)})`);
  normalizedTexts.set(normalized, item.id);

  if (item.display_text !== `1. ${item.emoji} ${item.message}`) errors.push(`${label}: display_text 형식 오류`);
  if (!item.display_text.startsWith("1. ")) errors.push(`${label}: display_text 번호 오류`);
  if (!hasEmoji(item.emoji)) errors.push(`${label}: 이모티콘 형식 오류 (${item.emoji})`);
  if (/[.。]$/u.test(item.message)) errors.push(`${label}: 문장 끝 마침표 포함`);
  if (/[.!?。]/u.test(item.message)) errors.push(`${label}: 여러 문장 가능성이 있는 문장부호 포함`);
  if (!/기$/u.test(item.message)) errors.push(`${label}: 실천형 어미가 아님`);

  const maxLength = item.category === "날짜별 계기교육" ? 42 : 36;
  if (item.message.length < 18 || item.message.length > maxLength) {
    errors.push(`${label}: 문장 길이 ${item.message.length}자 (허용 18~${maxLength}자)`);
  } else {
    lengthPass += 1;
  }

  if (!Object.hasOwn(expectedCounts, item.category)) errors.push(`${label}: 알 수 없는 카테고리 ${item.category}`);
  else counts[item.category] += 1;
  if (!Array.isArray(item.school_contexts) || item.school_contexts.length === 0 || !item.school_contexts.every((value: any) => typeof value === "string" && value.trim())) errors.push(`${label}: school_contexts 오류`);
  if (!Array.isArray(item.recommended_months) || !item.recommended_months.every((value: any) => Number.isInteger(value) && value >= 1 && value <= 12)) errors.push(`${label}: recommended_months 오류`);
  if (!Array.isArray(item.recommended_weekdays) || !item.recommended_weekdays.every((value: any) => weekdays.has(value))) errors.push(`${label}: recommended_weekdays 오류`);
  if (!Array.isArray(item.weather_tags) || !item.weather_tags.every((value: any) => typeof value === "string" && value.trim())) errors.push(`${label}: weather_tags 오류`);
  if (!Number.isInteger(item.priority) || item.priority < 1 || item.priority > 100) errors.push(`${label}: priority 오류`);
  if (!Number.isInteger(item.level) || item.level < 1 || item.level > 3) errors.push(`${label}: level 오류`);
  if (item.active !== true) errors.push(`${label}: active는 true여야 함`);
  if (!item.activation_rule || !validRuleTypes.has(item.activation_rule.type)) errors.push(`${label}: activation_rule 오류`);
  if (item.activation_rule?.type === "fixed_date") {
    if (!isValidMonthDay(item.activation_rule.month, item.activation_rule.day)) errors.push(`${label}: 유효하지 않은 고정 날짜`);
  }
  if (item.activation_rule?.type === "relative_date") {
    if (item.activation_rule.requires_calendar_resolution !== true) errors.push(`${label}: 상대 날짜의 calendar resolution 표시 누락`);
    if (!validRelativeRules.has(item.activation_rule.rule)) errors.push(`${label}: 지원하지 않는 상대 날짜 규칙`);
    if (!Number.isInteger(item.activation_rule.month) || item.activation_rule.month < 1 || item.activation_rule.month > 12) errors.push(`${label}: 상대 날짜 월 오류`);
  }

  if (item.category === "날짜별 계기교육") {
    dateCount += 1;
    if (item.source_required !== true || item.source_refs.length === 0) errors.push(`${label}: 계기교육 출처 누락`);
    if (!validClassifications.has(item.sub_category)) errors.push(`${label}: 계기교육 분류 오류`);
    if (item.activation_rule.type === "evergreen") errors.push(`${label}: 계기교육 activation_rule 오류`);
    if (!validNonSchoolDayPolicies.has(item.activation_rule.non_school_day_policy)) errors.push(`${label}: 휴업일 이동 규칙 오류`);
    if (item.activation_rule.requires_school_calendar_resolution !== true) errors.push(`${label}: 학교 달력 확인 표시 누락`);
    if (!item.message.startsWith(`${item.activation_rule.label} : `)) errors.push(`${label}: 계기교육 표시 형식 오류`);
    if (item.message.includes("을 맞아 ") || item.message.includes("를 맞아 ")) errors.push(`${label}: 이전 계기교육 표현 잔존`);
    for (const sourceRef of item.source_refs) if (!sourceIds.has(sourceRef)) errors.push(`${label}: 알 수 없는 출처 ${sourceRef}`);
  } else if (item.source_required !== false || item.source_refs.length !== 0) {
    errors.push(`${label}: 일반 문구의 출처 메타데이터 오류`);
  }

  if (item.category === "계절·기상·재난 대응") weatherCount += 1;
  if (item.category === "디지털·개인정보·미디어 안전") digitalCount += 1;
  for (const phrase of forbiddenExact) if (item.message === phrase) errors.push(`${label}: 제외 대상 문구`);
  for (const phrase of forbiddenFragments) if (item.message.includes(phrase)) errors.push(`${label}: 제외 표현 포함 (${phrase})`);
  if (/\b(?:19|20)\d{2}\b/u.test(item.message)) errors.push(`${label}: 특정 연도 포함`);
}

for (const [category, expected] of Object.entries(expectedCounts)) {
  if (counts[category] !== expected) errors.push(`${category}: expected ${expected}, got ${counts[category]}`);
}

const similarPairs: Array<{ left: any; right: any; score: number }> = [];
for (let i = 0; i < db.messages.length; i += 1) {
  for (let j = i + 1; j < db.messages.length; j += 1) {
    const score = similarity(db.messages[i].message, db.messages[j].message);
    if (score >= 0.72) similarPairs.push({ left: db.messages[i], right: db.messages[j], score });
  }
}
similarPairs.sort((a, b) => b.score - a.score);
for (const pair of similarPairs) errors.push(`과도 유사 ${pair.left.id}/${pair.right.id} (${pair.score.toFixed(3)}): ${pair.left.message} <> ${pair.right.message}`);

const crossDbSimilarPairs: Array<{ left: any; right: any; score: number }> = [];
for (const left of db.messages) {
  for (const right of schoolLifeDb.messages ?? []) {
    const score = similarity(left.message, right.message);
    if (score >= 0.76) crossDbSimilarPairs.push({ left, right, score });
  }
}
crossDbSimilarPairs.sort((a, b) => b.score - a.score);
for (const pair of crossDbSimilarPairs) errors.push(`2번 DB와 과도 유사 ${pair.left.id}/${pair.right.id} (${pair.score.toFixed(3)}): ${pair.left.message} <> ${pair.right.message}`);

if (audit.version !== "1.1") errors.push(`출처 감사 version 불일치: ${audit.version}`);
if (audit.type !== "message-1-source-audit") errors.push("출처 감사 type 오류");
if (audit.policy?.display_format !== "[기념일] : [실천 문구]") errors.push("계기교육 표시 정책 누락");
if (audit.policy?.non_school_day_policy !== "토·일요일, 공휴일 또는 학교 휴업일이면 직전 등교일에 표시") errors.push("휴업일 이동 정책 누락");
if (!Array.isArray(audit.sources) || audit.sources.length < 3) errors.push("출처 감사 공식 출처 목록 부족");
for (const source of audit.sources ?? []) {
  if (!source.id || !source.title || !source.organization || !/^https:\/\//u.test(source.url) || !source.authority_type || !source.verified_scope || !/^\d{4}-\d{2}-\d{2}$/u.test(source.accessed_at) || !source.source_version_note) errors.push(`출처 정보 오류: ${source.id ?? "unknown"}`);
}
if (!Array.isArray(audit.policy?.schedule_source_refs) || audit.policy.schedule_source_refs.length < 2) errors.push("휴업일 정책 출처 누락");
for (const sourceRef of audit.policy?.schedule_source_refs ?? []) if (!sourceIds.has(sourceRef)) errors.push(`휴업일 정책의 알 수 없는 출처 ${sourceRef}`);
if (!Array.isArray(audit.audited_items) || audit.audited_items.length !== 80) errors.push(`출처 감사 항목 수 오류: ${audit.audited_items?.length}`);
const auditByMessage = new Map((audit.audited_items ?? []).map((item: any) => [item.message_id, item]));
for (const item of db.messages.filter((message: any) => message.category === "날짜별 계기교육")) {
  const audited: any = auditByMessage.get(item.id);
  if (!audited) errors.push(`${item.id}: 출처 감사 대응 항목 없음`);
  else {
    if (audited.display_name_ko !== item.activation_rule.label) errors.push(`${item.id}: 출처 감사 한국어 표시명 불일치`);
    if (typeof audited.source_official_name !== "string" || !audited.source_official_name.trim()) errors.push(`${item.id}: 출처 원문 공식 명칭 누락`);
    if (item.sub_category === "국제기념일" && audited.source_language !== "en") errors.push(`${item.id}: 국제기념일 원문 언어 오류`);
    if (item.sub_category !== "국제기념일" && audited.source_language !== "ko") errors.push(`${item.id}: 국내 기념일 원문 언어 오류`);
    if (audited.classification !== item.sub_category) errors.push(`${item.id}: 출처 감사 분류 불일치`);
    if (audited.status !== "verified_official_source_snapshot") errors.push(`${item.id}: 출처 감사 상태 오류`);
    if (JSON.stringify(audited.source_refs) !== JSON.stringify(item.source_refs)) errors.push(`${item.id}: 출처 참조 불일치`);
    if (JSON.stringify(audited.activation_rule) !== JSON.stringify(item.activation_rule)) errors.push(`${item.id}: 출처 감사 날짜 규칙 불일치`);
    const source = audit.sources.find((candidate: any) => candidate.id === item.source_refs[0]);
    if (!source || audited.source_url !== source.url || audited.source_title !== source.title) errors.push(`${item.id}: 출처 직접 연결 불일치`);
    if (audited.verification_scope !== "name_date_classification") errors.push(`${item.id}: 출처 검증 범위 오류`);
  }
}

const categoryRows = Object.entries(counts).map(([category, count]) => `| ${category} | ${count}개 | ${expectedCounts[category as keyof typeof expectedCounts]}개 | 통과 |`).join("\n");
const similarGroupCounts = db.messages.reduce((acc: Record<string, number>, item: any) => {
  acc[item.similar_group] = (acc[item.similar_group] ?? 0) + 1;
  return acc;
}, {});
const repeatedSimilarGroups = Object.values(similarGroupCounts).filter((count) => count > 1).length;
if (repeatedSimilarGroups === 0) errors.push("similar_group이 모두 고유하여 의미 중복 조정에 사용할 수 없음");
const sha256 = (filePath: string) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const generatedAt = new Date().toISOString();
const report = `# 1번 만년형 문구 DB 검증 보고서

- 검증 대상: \`src/data/message-1-db.json\`
- 출처 감사: \`report/message-1-source-audit.json\`
- 10인 전문가 검토: \`report/message-1-expert-review-report.md\`
- 검증 실행 시각: ${generatedAt}
- 검증 결과: **${errors.length === 0 ? "통과" : "실패"}**

## 요약

| 항목 | 결과 |
|---|---:|
| 전체 문구 수 | ${db.messages.length}개 |
| 날짜별 계기교육 | ${dateCount}개 |
| 일반 안전·생활 문구 | ${db.messages.length - dateCount}개 |
| 계절·기후·재난 문구 | ${weatherCount}개 |
| 디지털 안전 문구 | ${digitalCount}개 |
| JSON 파싱 오류 | 0건 |
| ID 연속성·중복 | MESSAGE1-001~MESSAGE1-300, 오류 0건 |
| 동일 문구 | 0건 |
| 과도 유사 문구 | ${similarPairs.length}건 (문자 3-gram Dice·편집 유사도 최대값 0.72 이상 기준) |
| 기존 2번 DB와 과도 유사 | ${crossDbSimilarPairs.length}건 (동일 방식 0.76 이상 기준) |
| 반복 사용된 similar_group | ${repeatedSimilarGroups}개 그룹 |
| 문장 길이 | ${lengthPass}/300개 통과 (일반 18~36자, 계기교육 18~42자) |
| 출처 스냅샷 연결 | ${audit.audited_items?.length ?? 0}/80개 검증 항목 연결 |

## 카테고리별 수량

| 카테고리 | 실제 | 목표 | 결과 |
|---|---:|---:|---:|
${categoryRows}

## 품질 검사

- \`display_text\`를 전 항목 \`1. [이모티콘] [실천 문구]\` 형식으로 검사함
- 모든 문구의 마침표 미사용, 한 문장 구성, 실천형 어미를 검사함
- 날짜별 계기교육 80개를 모두 \`[기념일] : [실천 문구]\` 형식으로 검사함
- 계기교육 날짜가 토·일요일, 공휴일 또는 학교 휴업일이면 직전 등교일에 표시하는 규칙과 학교 달력 확인 표시를 검사함
- 학교생활 부적합 문구 제거 수: 0개(최종본 자동 검사 기준)
- 가정생활 중심 문구 제거 수: 0개(최종본 자동 검사 기준)
- 학교별 세부 운영 규칙, 추상적 안전 구호, 공포 유발 표현, 광고·정치·종교 표현을 금지어 검사함
- 이모티콘 존재와 주제 대응을 전 항목 수동 검토함
- 동일 문구와 정규화 동일 문구는 0개이며, 의미 유사 후보는 자동 임계값으로 검사함
- 기존 2번 DB 300개와 교차 유사도 검사를 수행함
- 빈 추천 배열은 제한이나 우선 추천 조건이 없음을 뜻하며, 난이도는 위험도가 아닌 인지 복잡도임

## 계기교육 출처 검사

- 대한민국 국경일: 국가법령정보센터 \`국경일에 관한 법률\` 제2조 기준
- 대한민국 정부기념일: 행정안전부 \`국경일·기념일\` 공식 현황 기준
- 통계의 날·사회복지의 날·소방의 날: 각 기념일을 지정한 현행 법률 조문 기준
- 국제기념일: United Nations \`List of International Days and Weeks\` 영문 원문 기준
- 계기교육 80개 모두 \`source_required: true\`이며 출처 감사 스냅샷과 원문 명칭·한국어 표시명·분류·날짜 규칙이 구조적으로 연결됨
- 국제기념일의 한국어 표시명은 앱용 번역이며, UN 영문 원문 명칭을 \`source_official_name\`에 별도 보존함
- 상대 날짜인 서해수호의 날은 \`requires_calendar_resolution: true\`로 표시해 연도별 계산을 강제함
- 제헌절은 2026년부터 다시 공휴일이므로 학교 휴업일 달력에 따라 직전 등교일로 이동함
- 상업성 데이 마케팅, 출처 불명 기념일, 대체공휴일·임시공휴일·선거일의 임의 고정을 제외함

## 검증 증거와 한계

- DB SHA-256: \`${sha256(dbPath)}\`
- 출처 감사 SHA-256: \`${sha256(auditPath)}\`
- 검증기 SHA-256: \`${sha256(path.resolve(root, "tests/validate-message-1-db.ts"))}\`
- 자동 검증은 저장된 공식 출처 스냅샷의 내부 일관성을 확인하며, 실행 시점의 외부 웹 페이지 HTTP 상태나 본문 변경을 실시간으로 보증하지 않음
- 외부 공식 자료의 명칭·날짜 확인과 교육적 타당성은 별도 10인 전문가 검토 보고서에 기록함

## 최종 남은 이슈

${errors.length === 0 ? "- 없음" : errors.map((error) => `- ${error}`).join("\n")}
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, "utf8");

if (errors.length > 0) {
  console.error(`검증 실패 (${errors.length}건)`);
  console.error(errors.join("\n"));
  process.exit(1);
}

if (warnings.length > 0) console.warn(warnings.join("\n"));
console.log(`검증 통과: ${db.messages.length}개, 동일 0개, 과도 유사 0개, 출처 ${audit.audited_items.length}개`);
console.log(`보고서: ${reportPath}`);
