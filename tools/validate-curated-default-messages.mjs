import fs from "node:fs";

const files = [
  ["1번 DB", "src/data/message-1-db.json", "1"],
  ["2번 DB", "src/data/school-life-message-db.json", "2"],
];

const forbiddenVisible = [
  /^(차분하게|오늘의 안전 약속|우리 반 안전 습관|함께 지키기|하루 동안 기억하기|스스로 확인하기|쉬는 시간에도|이동할 때|필요할 때 기억하기|오늘의 실천|우리 반 약속|스스로 해보기|말과 행동으로)\s*:/u,
  /통학 차량|자전거|현장체험|현장 체험|전동 킥보드|대중교통|승강장|경기|행사|학교 밖|대표하는 마음|새로 온|새 친구|새 짝|새 모둠|물건을 볼 때/u,
  /친구와 한 약속/u,
];

function stripNumber(text) {
  return String(text ?? "").replace(/^\s*\d+\.\s*/, "").trim();
}

function normalize(text) {
  return stripNumber(text)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[\s,.!?·'"“”‘’()[\]{}:;~\-_/]/gu, "")
    .replace(/(하기|살피기|알리기|확인하기|이동하기|사용하기|기다리기|존중하기|말하기|듣기|걷기|나누기|정리하기|요청하기|실천하기)$/u, "");
}

const errors = [];

for (const [label, filePath, number] of files) {
  const db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (db.messages.length !== 300 || db.total !== 300) {
    errors.push(`${label}: 300개가 아닙니다.`);
  }
  const seen = new Map();
  db.messages.forEach((item, index) => {
    const prefix = label === "1번 DB" ? "MESSAGE1" : "SCHOOL-LIFE";
    const expectedId = `${prefix}-${String(index + 1).padStart(3, "0")}`;
    const visible = stripNumber(item.display_text || item.message);
    const key = normalize(visible);
    if (item.id !== expectedId) errors.push(`${label} ${item.id}: ID 순서 오류`);
    if (item.display_text !== `${number}. ${item.message}`) errors.push(`${label} ${item.id}: display_text 불일치`);
    if (!/기$/u.test(item.message)) errors.push(`${label} ${item.id}: 실천형 어미 아님 - ${item.message}`);
    if (item.message.length < 10 || item.message.length > 48) errors.push(`${label} ${item.id}: 길이 부적합 - ${item.message}`);
    for (const pattern of forbiddenVisible) {
      if (pattern.test(visible)) errors.push(`${label} ${item.id}: 부적합 표현 - ${visible}`);
    }
    if (seen.has(key)) errors.push(`${label} ${item.id}: 중복 의심 - ${visible} / ${seen.get(key)}`);
    seen.set(key, visible);
  });
}

const daily = JSON.parse(fs.readFileSync("src/data/dailyNoticeMessages.json", "utf8"));
for (const [dateKey, entry] of Object.entries(daily.daily_messages ?? {})) {
  for (const field of ["text", "display_text", "message_1", "message_2"]) {
    if (!entry[field]) continue;
    const visible = stripNumber(entry[field]);
    for (const pattern of forbiddenVisible) {
      if (pattern.test(visible)) errors.push(`날짜별 ${dateKey} ${field}: 부적합 표현 - ${visible}`);
    }
    if (!/기$/u.test(visible)) errors.push(`날짜별 ${dateKey} ${field}: 실천형 어미 아님 - ${visible}`);
  }
}

if (errors.length) {
  console.error(errors.slice(0, 80).join("\n"));
  console.error(`총 오류 ${errors.length}건`);
  process.exit(1);
}

console.log("curated default message DB validation passed");
