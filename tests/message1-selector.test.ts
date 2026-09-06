import fs from "node:fs";
import path from "node:path";
import { selectMessage1Message, type Message1Entry } from "../src/message1Selector.ts";

const root = process.cwd();
const db = JSON.parse(fs.readFileSync(path.resolve(root, "src/data/message-1-db.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.resolve(root, "src/data/school-calendar.json"), "utf8"));
const nonSchoolDates = new Set<string>([
  ...calendar.years["2026"].official_non_school_dates,
  ...calendar.years["2026"].school_specific_non_school_dates,
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const july16 = selectMessage1Message(db.messages as Message1Entry[], "2026-07-16", nonSchoolDates);
assert(july16.selected?.id === "MESSAGE1-023", "2026년 제헌절 문구는 7월 16일에 선택되어야 함");
assert(july16.selected.display_text === "1. 🇰🇷 제헌절 : 학급 약속 한 가지를 친구와 함께 읽기", "제헌절 표시 형식 오류");
assert(july16.reason === "observance" && july16.observanceDate === "2026-07-17", "제헌절 이동 근거 오류");

const july17 = selectMessage1Message(db.messages as Message1Entry[], "2026-07-17", nonSchoolDates);
assert(july17.selected === null && july17.reason === "non_school_day", "제헌절 공휴일에는 기본 문구가 없어야 함");

const july2027 = selectMessage1Message(db.messages as Message1Entry[], "2027-07-16", new Set());
assert(july2027.selected?.id === "MESSAGE1-023", "주말 제헌절은 직전 금요일로 이동해야 함");

const ordinary = selectMessage1Message(db.messages as Message1Entry[], "2026-07-14", nonSchoolDates);
assert(ordinary.selected && ordinary.reason === "evergreen", "일반 등교일에는 만년형 문구가 선택되어야 함");

console.log("1번 문구 선택기 검증 통과: 제헌절 이동, 휴업일 비노출, 일반 문구 선택");
