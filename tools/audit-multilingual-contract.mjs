import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mainSource = fs.readFileSync(path.resolve(root, "src/main.ts"), "utf8");
const apiSource = fs.readFileSync(path.resolve(root, "api/gemini/generate.js"), "utf8");

const languages = ["ko", "en", "zh", "vi", "fil", "uz", "ru", "km", "mn", "th", "ne", "id", "my", "ja"];
const nonLatinLanguages = ["zh", "ru", "km", "mn", "th", "ne", "my", "ja"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const code of languages) {
  assert(mainSource.includes(`code: "${code}"`), `언어 설정 누락: ${code}`);
  assert(new RegExp(`translateCode: "${code}"`).test(mainSource), `번역 코드 누락: ${code}`);
  assert(new RegExp(`speechCode: "${code === "en" ? "en-US" : code === "zh" ? "zh-CN" : code === "vi" ? "vi-VN" : code === "fil" ? "fil-PH" : code === "uz" ? "uz-UZ" : code === "ru" ? "ru-RU" : code === "km" ? "km-KH" : code === "mn" ? "mn-MN" : code === "th" ? "th-TH" : code === "ne" ? "ne-NP" : code === "id" ? "id-ID" : code === "my" ? "my-MM" : code === "ja" ? "ja-JP" : "ko-KR"}"`).test(mainSource), `음성 코드 누락: ${code}`);
}

for (const code of nonLatinLanguages) {
  assert(mainSource.includes(`case "${code}"`), `목표 문자 검증 누락: ${code}`);
}

assert(mainSource.includes("hasTranslationMetaLeakage"), "번역 해설 혼입 검증 누락");
assert(mainSource.includes("assertDisplayableTranslation"), "표시 전 번역 검증 누락");
assert(mainSource.includes("inferredGender !== settings.koreanVoiceGender"), "음성 성별 잠금 검증 누락");
assert(!/\?\?\s*pickAnyReadableVoice\((?:koreanVoices|languageVoices)/.test(mainSource), "반대 성별로 떨어질 수 있는 음성 fallback 잔존");

assert(apiSource.includes("body.apiKey"), "사용자 API 키 입력 경로 누락");
assert(!apiSource.includes("process.env.GEMINI_API_KEY"), "서버에 공유 API 키 fallback이 남아 있음");

console.log(`다국어 계약 감사 통과: ${languages.length}개 언어, 번역 검증, 음성 성별 fallback, API 키 분리`);
