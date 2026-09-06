import fs from "node:fs";
import { selectSchoolLifeMessage } from "../src/schoolLifeSelector.ts";
import { deriveSchoolLifeSelectionContext } from "../src/schoolLifeContext.ts";

const db = JSON.parse(fs.readFileSync(new URL("../src/data/school-life-message-db.json", import.meta.url), "utf8"));
const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const extractedContext = deriveSchoolLifeSelectionContext(
  3,
  "현장 체험과 학급 게시판 발표가 있으며 비상 대피와 해로운 소문 예방을 안내합니다",
);
for (const trigger of ["term_start", "field_trip", "online", "presentation", "safety", "conflict"]) {
  if (!extractedContext.activeTriggers.includes(trigger)) throw new Error(`Notice context extractor missed ${trigger}`);
}
if (extractedContext.conflictMode !== "bullying_or_violence") throw new Error("Serious conflict context extraction failed");
for (const [dimension, values] of Object.entries(extractedContext.activeContexts)) {
  if (values.some((value) => !db.context_vocabularies[dimension].includes(value))) throw new Error(`Extractor emitted unknown ${dimension} context`);
}
const everydayExtractedContext = deriveSchoolLifeSelectionContext(4, "친구 사이의 갈등과 오해를 해결합니다");
if (everydayExtractedContext.conflictMode !== "everyday") throw new Error("Everyday conflict context extraction failed");
const emergencyContext = deriveSchoolLifeSelectionContext(4, "비상 대피 훈련을 실시합니다");
const emergencySelection = selectSchoolLifeMessage({
  messages: db.messages,
  policy: db.selection_policy,
  history: [],
  dateKey: "2030-04-04",
  weekday: "목요일",
  month: 4,
  ...emergencyContext,
});
if (!emergencySelection.selected?.context_tags.situations.includes("비상 상황")) throw new Error("Emergency context did not affect ranking");
let history = [];
let cursor = new Date(2027, 2, 1);
const selections = [];

while (selections.length < 700) {
  if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
    const month = cursor.getMonth() + 1;
    const dateKey = `${cursor.getFullYear()}-${String(month).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const activeTriggers = ["any_school_day"];
    if (month === 3 || month === 9) activeTriggers.push("term_start");
    if (month === 6 || month === 7) activeTriggers.push("rainy_day");
    const result = selectSchoolLifeMessage({
      messages: db.messages,
      policy: db.selection_policy,
      history,
      dateKey,
      weekday: weekdays[cursor.getDay()],
      month,
      activeTriggers,
    });
    if (!result.selected) throw new Error(`No selection for ${dateKey}`);
    if (result.selected.safety_priority === 3) throw new Error(`Unprompted priority-3 selection: ${result.selected.id}`);
    selections.push(result.selected);
    history = result.history;
  }
  cursor.setDate(cursor.getDate() + 1);
}

for (let index = 0; index < selections.length; index += 1) {
  const recentIds = selections.slice(Math.max(0, index - db.selection_policy.recent_message_cooldown), index).map((item) => item.id);
  if (recentIds.includes(selections[index].id)) throw new Error(`Message cooldown violation at ${index}: ${selections[index].id}`);
  const recentGroups = selections.slice(Math.max(0, index - db.selection_policy.similar_group_cooldown), index).map((item) => item.similar_group);
  if (recentGroups.includes(selections[index].similar_group)) throw new Error(`Group cooldown violation at ${index}: ${selections[index].similar_group}`);
}

for (const trigger of ["conflict", "online", "field_trip", "presentation", "safety"]) {
  const result = selectSchoolLifeMessage({
    messages: db.messages,
    policy: db.selection_policy,
    history: [],
    dateKey: "2030-04-02",
    weekday: "화요일",
    month: 4,
    activeTriggers: ["any_school_day", trigger],
  });
  if (!result.selected?.trigger_tags.includes(trigger)) throw new Error(`Trigger was not honored: ${trigger}`);
  if (trigger === "conflict" && (result.selected.conflict_type !== "bullying_or_violence" || result.selected.safety_priority !== 3)) {
    throw new Error(`Unspecified conflict did not use the safety-first route: ${result.selected.id}`);
  }
}

const everydayConflictResult = selectSchoolLifeMessage({
  messages: db.messages,
  policy: db.selection_policy,
  history: [],
  dateKey: "2030-04-03",
  weekday: "수요일",
  month: 4,
  activeTriggers: ["any_school_day", "conflict"],
  conflictMode: "everyday",
});
if (everydayConflictResult.selected?.conflict_type !== "everyday_peer_conflict") throw new Error("Everyday conflict route failed");

const reachableIds = new Set();
for (const [triggerIndex, trigger] of db.trigger_vocabulary.entries()) {
  let triggerHistory = [];
  for (let index = 0; index < 450; index += 1) {
    const date = new Date(2040 + triggerIndex, 0, index + 1);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const result = selectSchoolLifeMessage({
      messages: db.messages,
      policy: db.selection_policy,
      history: triggerHistory,
      dateKey,
      weekday: weekdays[date.getDay()],
      month: date.getMonth() + 1,
      activeTriggers: ["any_school_day", trigger],
    });
    if (!result.selected) throw new Error(`No selection in reachability run for ${trigger}`);
    reachableIds.add(result.selected.id);
    triggerHistory = result.history;
  }
}
let everydayHistory = [];
for (let index = 0; index < 450; index += 1) {
  const date = new Date(2050, 0, index + 1);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const result = selectSchoolLifeMessage({
    messages: db.messages,
    policy: db.selection_policy,
    history: everydayHistory,
    dateKey,
    weekday: weekdays[date.getDay()],
    month: date.getMonth() + 1,
    activeTriggers: ["any_school_day", "conflict"],
    conflictMode: "everyday",
  });
  if (!result.selected) throw new Error("No selection in everyday-conflict reachability run");
  reachableIds.add(result.selected.id);
  everydayHistory = result.history;
}
if (reachableIds.size !== db.total) throw new Error(`Only ${reachableIds.size} of ${db.total} messages are reachable`);

const existingDate = history.at(-1).date;
const existingResult = selectSchoolLifeMessage({
  messages: db.messages,
  policy: db.selection_policy,
  history: [...history].reverse(),
  dateKey: existingDate,
  weekday: "금요일",
  month: 10,
  activeTriggers: ["any_school_day"],
});
if (existingResult.selected.id !== history.at(-1).id) throw new Error("Existing date selection was not stable");
if (history.length > 365) throw new Error(`History retention exceeded: ${history.length}`);

const categoryCounts = selections.reduce((counts, item) => {
  counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({
  selections: selections.length,
  uniqueAutomaticMessages: new Set(selections.map((item) => item.id)).size,
  unpromptedPriority3: selections.filter((item) => item.safety_priority === 3).length,
  verifiedImmediateTriggers: 5,
  verifiedConflictRoutes: 2,
  reachableMessages: reachableIds.size,
  messageCooldown: db.selection_policy.recent_message_cooldown,
  groupCooldown: db.selection_policy.similar_group_cooldown,
  retainedHistory: history.length,
  categoryCounts,
}, null, 2));
