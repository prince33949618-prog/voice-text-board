import "./styles.css";
import dailyNoticeMessages from "./data/dailyNoticeMessages.json";
import message1Db from "./data/message-1-db.json";
import schoolCalendar from "./data/school-calendar.json";
import schoolLifeMessageDb from "./data/school-life-message-db.json";
import { isNonSchoolDateKey, selectMessage1Message, type Message1Entry } from "./message1Selector";
import { selectSchoolLifeMessage } from "./schoolLifeSelector";
import { deriveSchoolLifeSelectionContext } from "./schoolLifeContext";

type AppMode = "idle" | "editing" | "recording" | "converting" | "reading" | "paused" | "saving" | "completed" | "error";
type BoardMode = "notice" | "board";
type DateFormat = "full" | "short";
type Speed = "slow" | "normal" | "fast";
type Theme = "dark-green" | "classic-green" | "dark-blue" | "dark-gray";
type LanguageCode = "ko" | "en" | "zh" | "vi" | "fil" | "uz" | "ru" | "km" | "mn" | "th" | "ne" | "id" | "my" | "ja";
type KoreanVoiceGender = "male" | "female";
type TranslationStatus = "idle" | "checking" | "downloadable" | "downloading" | "translating" | "success" | "unsupported" | "error";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface TranslatorLike {
  translate(text: string): Promise<string>;
}

interface TranslatorConstructorLike {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorLike>;
}

type WindowWithTranslator = typeof globalThis & {
  Translator?: TranslatorConstructorLike;
};

interface Settings {
  dateFormat: DateFormat;
  autoSave: boolean;
  alwaysOnTop: boolean;
  defaultFontSize: number;
  noticeAutoFit: boolean;
  defaultColor: string;
  lineHeight: number;
  voiceURI: string;
  koreanVoiceGender: KoreanVoiceGender;
  readingLanguage: LanguageCode;
  speed: Speed;
  repeat: number;
  volume: number;
  theme: Theme;
  startFullScreen: boolean;
  aiEnabled: boolean;
  geminiApiKey: string;
  geminiModel: string;
  geminiVerified: boolean;
  rememberGeminiApiKey: boolean;
  aiPolishSpeech: boolean;
  aiTranslate: boolean;
}

interface SavedDocument {
  version: 1;
  dateKey: string;
  contentHtml: string;
  plainText: string;
  updatedAt: string;
}

interface NoticeDayData {
  date: string;
  items: string[];
  initialized: boolean;
  defaultMessageApplied: boolean;
  defaultMessageModified: boolean;
  updatedAt: string;
  version: 1 | 2 | 3;
}

interface DailyNoticeMessage {
  text: string;
  display_text?: string;
  message_1?: string;
  message_2?: string;
  event?: string | null;
  source?: string;
}

type DailyNoticeMessages = {
  daily_messages?: Record<string, DailyNoticeMessage>;
  dynamic_overrides?: Record<string, DailyNoticeMessage>;
};

interface SchoolLifeMessage {
  id: string;
  display_text: string;
  category: string;
  similar_group: string;
  conflict_type: "not_applicable" | "everyday_peer_conflict" | "bullying_or_violence";
  safety_priority: 1 | 2 | 3;
  requires_adult_support: boolean;
  recommended_weekdays: string[];
  recommended_months: number[];
  trigger_tags: string[];
  context_tags: Record<"places" | "times" | "activities" | "situations" | "channels", string[]>;
  active: boolean;
}

interface SchoolLifeMessageDb {
  messages: SchoolLifeMessage[];
  selection_policy: {
    recent_message_cooldown: number;
    similar_group_cooldown: number;
    category_balance_window: number;
  };
}

interface SchoolCalendarData {
  years: Record<string, {
    official_non_school_dates: string[];
    school_specific_non_school_dates: string[];
  }>;
}

interface SchoolMessageHistoryEntry {
  date: string;
  id: string;
  category: string;
  similarGroup: string;
}

type DefaultMessageLike = {
  active: boolean;
  display_text?: string;
  message?: string;
};

interface SchoolMessageHistoryState {
  version: 2;
  entries: SchoolMessageHistoryEntry[];
}

const STORAGE_SETTINGS = "voice-text-board-settings";
const STORAGE_SESSION_GEMINI_KEY = "voice-text-board-session-gemini-key";
const STORAGE_LEGACY_DOCUMENT = "voice-text-board-document";
const DOCUMENT_PREFIX = "voice-text-board-document-";
const STORAGE_ACTIVE_MODE = "textboard:activeMode";
const STORAGE_GENERAL_BOARD = "textboard:generalBoard";
const STORAGE_SELECTED_NOTICE_DATE = "textboard:selectedNoticeDate";
const NOTICE_PREFIX = "textboard:notice:";
const STORAGE_SCHOOL_MESSAGE_HISTORY = "textboard:schoolMessageHistory:v2";
const STORAGE_LEGACY_SCHOOL_MESSAGE_HISTORY = "textboard:schoolMessageHistory:v1";

const defaultSettings: Settings = {
  dateFormat: "full",
  autoSave: true,
  alwaysOnTop: false,
  defaultFontSize: 100,
  noticeAutoFit: true,
  defaultColor: "#FFFFFF",
  lineHeight: 1.35,
  voiceURI: "",
  koreanVoiceGender: "male",
  readingLanguage: "ko",
  speed: "normal",
  repeat: 1,
  volume: 0.9,
  theme: "dark-green",
  startFullScreen: false,
  aiEnabled: false,
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash-lite",
  geminiVerified: false,
  rememberGeminiApiKey: true,
  aiPolishSpeech: true,
  aiTranslate: true
};

const geminiModels = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const retiredGeminiModels = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash"
]);

const colors = [
  { name: "흰색", value: "#FFFFFF" },
  { name: "노랑", value: "#F6D95B" },
  { name: "빨강", value: "#EF5350" },
  { name: "파랑", value: "#42A5F5" },
  { name: "초록", value: "#66BB6A" },
  { name: "주황", value: "#FFA726" },
  { name: "보라", value: "#AB47BC" },
  { name: "검정", value: "#111111" }
];

const themes: Record<Theme, string> = {
  "dark-green": "#214F3F",
  "classic-green": "#2D5D46",
  "dark-blue": "#263C52",
  "dark-gray": "#343638"
};

const holidayNamesByDate: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "삼일절 대체공휴일",
  "2026-05-01": "근로자의 날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "부처님오신날 대체공휴일",
  "2026-06-03": "전국동시지방선거일",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "광복절 대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "개천절 대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절"
};

const languages: Array<{ code: LanguageCode; label: string; menuLabel: string; koName: string; nativeName: string; translateCode: string; speechCode: string }> = [
  { code: "ko", label: "한국어", menuLabel: "한국어", koName: "한국어", nativeName: "한국어", translateCode: "ko", speechCode: "ko-KR" },
  { code: "en", label: "영어 English", menuLabel: "영어 · English", koName: "영어", nativeName: "English", translateCode: "en", speechCode: "en-US" },
  { code: "zh", label: "중국어 中文", menuLabel: "중국어 · 中文", koName: "중국어", nativeName: "中文", translateCode: "zh", speechCode: "zh-CN" },
  { code: "vi", label: "베트남어 Tiếng Việt", menuLabel: "베트남어 · Tiếng Việt", koName: "베트남어", nativeName: "Tiếng Việt", translateCode: "vi", speechCode: "vi-VN" },
  { code: "fil", label: "Filipino", menuLabel: "필리핀어 · Filipino", koName: "필리핀어", nativeName: "Filipino", translateCode: "fil", speechCode: "fil-PH" },
  { code: "uz", label: "O‘zbekcha", menuLabel: "우즈베크어 · O‘zbekcha", koName: "우즈베크어", nativeName: "O‘zbekcha", translateCode: "uz", speechCode: "uz-UZ" },
  { code: "ru", label: "Русский", menuLabel: "러시아어 · Русский", koName: "러시아어", nativeName: "Русский", translateCode: "ru", speechCode: "ru-RU" },
  { code: "km", label: "ខ្មែរ", menuLabel: "캄보디아어 · ខ្មែរ", koName: "캄보디아어", nativeName: "ខ្មែរ", translateCode: "km", speechCode: "km-KH" },
  { code: "mn", label: "Монгол", menuLabel: "몽골어 · Монгол", koName: "몽골어", nativeName: "Монгол", translateCode: "mn", speechCode: "mn-MN" },
  { code: "th", label: "ไทย", menuLabel: "태국어 · ไทย", koName: "태국어", nativeName: "ไทย", translateCode: "th", speechCode: "th-TH" },
  { code: "ne", label: "नेपाली", menuLabel: "네팔어 · नेपाली", koName: "네팔어", nativeName: "नेपाली", translateCode: "ne", speechCode: "ne-NP" },
  { code: "id", label: "Bahasa Indonesia", menuLabel: "인도네시아어 · Bahasa Indonesia", koName: "인도네시아어", nativeName: "Bahasa Indonesia", translateCode: "id", speechCode: "id-ID" },
  { code: "my", label: "မြန်မာ", menuLabel: "미얀마어 · မြန်မာ", koName: "미얀마어", nativeName: "မြန်မာ", translateCode: "my", speechCode: "my-MM" },
  { code: "ja", label: "日本語", menuLabel: "일본어 · 日本語", koName: "일본어", nativeName: "日本語", translateCode: "ja", speechCode: "ja-JP" }
];

const translatorCache = new Map<LanguageCode, TranslatorLike>();
const translationSupport = new Map<LanguageCode, TranslationStatus>(
  languages.map((language) => [language.code, language.code === "ko" ? "success" : "checking"])
);

let settings = loadSettings();
let mode: AppMode = "idle";
let activeBoardMode: BoardMode = loadActiveBoardMode();
let todayDateKey = getKoreanToday();
let currentDateKey = localStorage.getItem(STORAGE_SELECTED_NOTICE_DATE) || todayDateKey;
let isApplyingEditorContent = false;
let saveTimer = 0;
let autoFitFrame = 0;
let recordingTimer = 0;
let recordingSeconds = 0;
let readingLines: string[] = [];
let readingHighlightRoot: HTMLElement | null = null;
let currentLineIndex = -1;
let currentRepeat = 1;
let isPaused = false;
let toastTimer = 0;
let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let recordedChunks: BlobPart[] = [];
let speechRecognition: SpeechRecognitionLike | null = null;
let recognitionFinalText = "";
let recognitionInterimText = "";
let speechRawText = "";
let translatedText = "";
let translationStatus: TranslationStatus = "idle";
let translationRequestId = 0;
let readingLang = "ko-KR";
let readingVoiceURI = "";
let isRestartingSpeech = false;
let isStoppingSpeech = false;
let pendingConfirmAction: (() => void) | null = null;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <main class="app-shell" data-mode="idle">
    <header class="top-toolbar">
      <div class="brand">
        <span class="brand-full">음성·문자 번역 알림장&칠판</span>
        <span class="brand-short">번역 알림장&칠판</span>
      </div>
      <nav class="toolbar-actions" aria-label="주요 기능">
        <div class="action-cluster primary-actions">
          <button class="tool-button primary" id="micButton" type="button">음성 입력</button>
          <button class="tool-button primary" id="readAllButton" type="button">전체 읽기</button>
        </div>
        <div class="action-cluster secondary-actions">
          <button class="tool-button neutral" id="pauseButton" type="button" disabled>일시정지</button>
          <button class="tool-button neutral" id="stopButton" type="button" disabled>중지</button>
          <button class="tool-button neutral" id="clearContentButton" type="button">전체 삭제</button>
        </div>
        <button class="ai-status-badge" id="aiStatusBadge" type="button">API 테스트 필요</button>
        <button class="icon-button menu-icon-button" id="moreButton" type="button" aria-label="메뉴 열기" aria-haspopup="menu" aria-expanded="false">☰</button>
      </nav>

      <section class="control-strip" aria-label="서식 도구">
      <div class="mode-switcher" role="tablist" aria-label="보드 모드">
        <button class="mode-button" id="noticeModeButton" type="button" role="tab" data-board-mode="notice" aria-selected="false">알림장</button>
        <button class="mode-button" id="boardModeButton" type="button" role="tab" data-board-mode="board" aria-selected="false">일반 칠판</button>
      </div>
      <div class="control-group text-tools" aria-label="글자 조정">
        <span class="group-label">글자</span>
        <div class="stepper" aria-label="글자 크기">
          <button type="button" id="fontMinus" aria-label="글자 작게">−</button>
          <output id="fontSizeValue">56</output>
          <button type="button" id="fontPlus" aria-label="글자 크게">+</button>
        </div>
        <button class="format-button auto-fit-button" id="autoFitToggle" type="button" aria-pressed="true">자동 맞춤</button>
        <div class="color-picker">
          <button class="color-trigger" id="colorMenuButton" type="button" aria-haspopup="true" aria-expanded="false">
            글자색 <span class="current-color-dot" id="currentColorDot"></span>
          </button>
          <div class="color-popover" id="colorPopover" hidden>
            ${colors.map((color) => `<button class="swatch" type="button" data-color="${color.value}" title="${color.name}" aria-label="${color.name}" style="--swatch:${color.value}"></button>`).join("")}
          </div>
        </div>
        <button class="format-button" type="button" data-command="bold" aria-label="굵게"><b>B</b></button>
        <button class="format-button" type="button" data-command="underline" aria-label="밑줄"><u>U</u></button>
        <label class="inline-field">줄 간격
          <select id="lineHeightSelect" aria-label="줄 간격">
            <option value="1.15">좁게</option>
            <option value="1.35">보통</option>
            <option value="1.6">넓게</option>
          </select>
        </label>
      </div>
      <div class="control-group speech-inline-tools" aria-label="음성 및 언어 설정">
        <span class="group-label">읽기</span>
        <select id="voiceSelect" class="hidden-voice-select" aria-label="목소리 선택">
          <option value="">기본 목소리</option>
        </select>
        <select id="speedSelect" aria-label="읽기 속도">
          <option value="slow">느리게</option>
          <option value="normal">보통</option>
          <option value="fast">빠르게</option>
        </select>
        <label class="inline-field voice-gender-field">목소리
          <span class="segmented voice-gender-segments" id="voiceGenderButtons" role="group" aria-label="읽는 사람 성별">
            <button class="segment-button" type="button" data-voice-gender="male">남자</button>
            <button class="segment-button" type="button" data-voice-gender="female">여자</button>
          </span>
        </label>
        <label class="inline-field">반복 <input id="repeatInput" type="number" min="1" max="5" /></label>
        <label class="inline-field volume-field">음량 <input id="volumeInput" type="range" min="0" max="100" /><output id="volumeValue">90</output></label>
        <div class="language-picker" id="languagePicker">
          <button class="segment-button language-more-button language-current-button" id="languageMoreButton" type="button" aria-haspopup="menu" aria-expanded="false">언어 선택(한국어) ▾</button>
          <div class="language-more-menu" id="languageMoreMenu" role="menu" hidden>
            ${languages
              .map((language) => `
                <button type="button" role="menuitem" data-language="${language.code}">
                  <span class="language-menu-ko">${language.koName}</span>
                  <span class="language-menu-native">${language.nativeName}</span>
                </button>
              `)
              .join("")}
          </div>
        </div>
      </div>
      </section>
    </header>

    <section class="board-area">
      <section class="notice-navigator" id="noticeNavigator" aria-label="알림장 날짜 탐색">
        <button class="format-button nav-date-button" id="prevDateButton" type="button" aria-label="이전 날짜">‹ 이전</button>
        <div class="notice-date-display">
          <div class="date-header" id="dateHeader" aria-label="선택 날짜"></div>
          <input id="noticeDateInput" class="date-input" type="date" aria-label="알림장 날짜 선택" title="날짜 선택" />
        </div>
        <button class="tool-button neutral compact-action" id="todayButton" type="button" aria-label="오늘 날짜">오늘</button>
        <button class="format-button nav-date-button" id="nextDateButton" type="button" aria-label="다음 날짜">다음 ›</button>
        <button class="tool-button neutral compact-action" id="noticeHistoryButton" type="button">기록 보기</button>
        <button class="tool-button neutral compact-action" id="noticeExportShortcutButton" type="button">내보내기</button>
        <div class="default-message-toggles" id="defaultMessageToggles" aria-label="오늘의 자동 문구 표시">
          <span class="default-message-label">오늘의 자동 문구</span>
          <label class="default-message-toggle"><input id="defaultFirstCheck" type="checkbox" /> 계기교육·안전</label>
          <label class="default-message-toggle"><input id="defaultSecondCheck" type="checkbox" /> 학교생활 실천</label>
        </div>
      </section>
      <div class="blackboard-frame">
        <article class="blackboard" id="blackboard">
          <div class="translation-wait-banner" id="translationWaitBanner" role="status" aria-live="polite" hidden>
            <span class="translation-wait-dot" aria-hidden="true"></span>
            <span id="translationWaitText">지금 번역 중입니다.<br />조금만 기다려 주세요.</span>
          </div>
          <section class="translation-panel" id="translationPanel" hidden>
            <div class="translation-source" hidden>
              <strong>원문</strong>
              <p id="translationSourceText"></p>
            </div>
            <div class="translation-result">
              <strong id="translationTargetLabel">번역</strong>
              <p id="translationResultText"></p>
            </div>
            <p class="translation-note" id="translationNotice"></p>
          </section>
          <div
            class="text-editor"
            id="editor"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            spellcheck="false"
            data-placeholder="키보드로 내용을 입력하거나 음성 입력 버튼을 눌러주세요."
          ></div>
        </article>
      </div>
    </section>

    <footer class="status-bar">
      <span id="statusText" class="sr-only"></span>
      <span id="translationStatusText" class="translation-status-text"></span>
      <span class="copyright-text">© 쏭쌤(송성근). 2026.09.15</span>
      <span id="autoSaveText">자동 저장</span>
      <span id="countText">글자 0 · 줄 0</span>
    </footer>

    <div class="more-menu" id="moreMenu" role="menu" hidden>
      <button type="button" id="polishContentButton" role="menuitem">본문 AI 정리</button>
      <button type="button" id="copyContentButton" role="menuitem">복사</button>
      <button type="button" id="exportContentButton" role="menuitem">파일로 저장</button>
      <button type="button" id="settingsButton" role="menuitem">화면·읽기 설정</button>
    </div>

    <aside class="settings-drawer" id="settingsDrawer" aria-label="설정" aria-hidden="true">
      <div class="drawer-header">
        <h2>설정</h2>
        <button class="icon-button" id="closeSettings" type="button" aria-label="설정 닫기">×</button>
      </div>
      <section>
        <h3>일반</h3>
        <label>날짜 형식
          <select id="dateFormatSelect">
            <option value="full">2026년 7월 11일 토요일</option>
            <option value="short">7월 11일 토요일</option>
          </select>
        </label>
        <label class="check-row"><input id="autoSaveCheck" type="checkbox" /> 날짜별 자동 저장</label>
        <label class="check-row"><input id="alwaysOnTopCheck" type="checkbox" /> 항상 위</label>
      </section>
      <section>
        <h3>글자 기본값</h3>
        <label>기본 글자 크기 <input id="defaultFontSizeInput" type="number" min="20" max="180" step="10" /></label>
        <label>기본 줄 간격 <input id="defaultLineHeightInput" type="number" min="1" max="2.2" step="0.10" /></label>
        <label>기본 색상
          <select id="defaultColorSelect">
            ${colors.map((color) => `<option value="${color.value}">${color.name}</option>`).join("")}
          </select>
        </label>
      </section>
      <section>
        <h3>화면</h3>
        <label>칠판 테마
          <select id="themeSelect">
            <option value="dark-green">Dark Green</option>
            <option value="classic-green">Classic Green</option>
            <option value="dark-blue">Dark Blue</option>
            <option value="dark-gray">Dark Gray</option>
          </select>
        </label>
        <label class="check-row"><input id="startFullScreenCheck" type="checkbox" /> 전체화면으로 시작</label>
      </section>
      <button class="tool-button primary full-width" id="resetSettingsButton" type="button">설정 초기화</button>
    </aside>

    <div class="modal-backdrop" id="aiConnectionDialog" hidden>
      <section class="dialog api-connection-dialog" role="dialog" aria-modal="true" aria-labelledby="aiConnectionTitle">
        <div class="drawer-header">
          <div>
            <h2 id="aiConnectionTitle">AI 연결</h2>
            <p class="dialog-lead">API 키 테스트가 성공하면 음성 정리와 외국어 번역을 Gemini로 처리합니다.</p>
          </div>
          <button class="icon-button" id="closeAiConnectionButton" type="button" aria-label="AI 연결 닫기">×</button>
        </div>
        <div class="ai-connect-card">
          <strong>Google AI Studio 무료 API 키 연결</strong>
          <p>선생님이 직접 만든 키를 붙여넣으면 이 프로그램에서만 AI 기능을 사용할 수 있습니다.</p>
          <a class="tool-button primary full-width ai-studio-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio 열기</a>
          <button class="tool-button neutral full-width" id="openApiGuideButton" type="button">사진처럼 따라 하기</button>
        </div>
        <ol class="ai-setup-steps">
          <li>Google AI Studio에서 프로젝트 만들기</li>
          <li>키 이름을 <strong>Gemini API Key</strong>로 입력하기</li>
          <li>생성된 API 키 복사하기</li>
          <li>아래 칸에 붙여넣고 <strong>API 키 테스트</strong>가 성공하는지 확인하기</li>
        </ol>
        <label class="check-row"><input id="aiEnabledCheck" type="checkbox" /> Gemini API 사용</label>
        <label>Gemini API 키
          <div class="api-key-row">
            <input id="geminiApiKeyInput" type="password" autocomplete="off" spellcheck="false" placeholder="Google AI Studio에서 복사한 API 키 붙여넣기" />
            <button class="tool-button neutral" id="pasteGeminiKeyButton" type="button">붙여넣기</button>
            <button class="tool-button neutral" id="toggleGeminiKeyButton" type="button">보기</button>
          </div>
        </label>
        <label>모델
          <select id="geminiModelSelect">
            ${geminiModels.map((model) => `<option value="${model}">${model}</option>`).join("")}
          </select>
        </label>
        <label class="check-row"><input id="rememberGeminiKeyCheck" type="checkbox" /> 개인 PC라면 이 기기에 API 키 기억하기</label>
        <label class="check-row"><input id="aiPolishSpeechCheck" type="checkbox" /> 테스트 성공 후 음성 인식 결과를 AI로 정리</label>
        <label class="check-row"><input id="aiTranslateCheck" type="checkbox" /> 테스트 성공 후 외국어 번역을 AI로 처리</label>
        <button class="tool-button neutral full-width" id="testGeminiButton" type="button">API 키 테스트</button>
        <p class="ai-key-status" id="geminiKeyStatus">API 키를 넣으면 음성 정리와 외국어 번역에 AI를 사용할 수 있습니다.</p>
        <p class="settings-note">공용 PC에서는 기억하기를 끄고 사용하세요. 학생 이름, 상담 내용 등 민감한 개인정보는 AI 정리에 넣지 않는 것을 권장합니다.</p>
      </section>
    </div>

    <div class="modal-backdrop" id="apiGuideDialog" hidden>
      <section class="dialog api-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="apiGuideTitle">
        <div class="drawer-header">
          <div>
            <h2 id="apiGuideTitle">사진처럼 API Key 연결하기</h2>
            <p class="dialog-lead">파란 번호만 순서대로 따라 하세요. 보통 2~3분이면 끝납니다.</p>
          </div>
          <button class="icon-button" id="closeApiGuideButton" type="button" aria-label="API 연결 안내 닫기">×</button>
        </div>
        <div class="free-mode-callout">
          <strong>무료 키로 먼저 테스트</strong>
          <span>기본값은 Flash 계열 모델입니다. 비용을 막으려면 Google AI Studio에서 Free 프로젝트 키를 사용하고, 무료 한도를 넘으면 잠시 기다렸다가 다시 사용하세요.</span>
        </div>
        <a class="tool-button primary full-width api-guide-primary" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">먼저 Google AI Studio 열기</a>
        <ol class="api-guide-steps">
          <li>
            <strong>프로젝트 만들기</strong>
            <span>목록 아래의 <b>+ 프로젝트 만들기</b>를 누릅니다. 프로젝트가 이미 보이면 바로 선택해도 됩니다.</span>
          </li>
          <li>
            <strong>이름 입력하기</strong>
            <span>키 이름은 예시처럼 <b>Gemini API Key</b> 또는 <b>prompt</b>처럼 짧게 적고 만듭니다.</span>
          </li>
          <li>
            <strong>키 복사하기</strong>
            <span>API 키 세부정보에서 오른쪽의 복사 버튼을 누릅니다. 키 값은 다른 사람에게 보여주지 마세요.</span>
          </li>
          <li>
            <strong>복사한 키를 여기에 붙여넣기</strong>
            <span>설정의 API 키 칸에 붙여넣고 <b>Gemini API 사용</b>을 켠 뒤 <b>API 키 테스트</b>를 누릅니다.</span>
          </li>
        </ol>
        <div class="api-guide-actions">
          <button class="tool-button neutral" id="focusGeminiInputButton" type="button">키 붙여넣으러 가기</button>
          <button class="tool-button primary" id="closeApiGuideDoneButton" type="button">확인</button>
        </div>
      </section>
    </div>

    <div class="modal-backdrop" id="infoDialog" hidden>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="infoTitle">
        <h2 id="infoTitle">안내</h2>
        <p id="infoMessage"></p>
        <div class="dialog-actions">
          <button class="tool-button primary" id="closeInfoButton" type="button">확인</button>
        </div>
      </section>
    </div>

    <div class="modal-backdrop" id="confirmDialog" hidden>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">작성한 내용을 모두 삭제하시겠습니까?</h2>
        <p>상단 날짜는 삭제되지 않습니다. 오늘 날짜 문서의 본문만 비워집니다.</p>
        <div class="dialog-actions">
          <button class="tool-button neutral" id="cancelClearButton" type="button">취소</button>
          <button class="tool-button danger" id="confirmClearButton" type="button">전체 삭제</button>
        </div>
      </section>
    </div>

    <div class="recording-overlay" id="recordingOverlay" hidden>
      <section class="recording-card">
        <strong id="recordingTitle">녹음 중</strong>
        <span id="recordingTime">00:00</span>
        <p id="recordingHelp">마이크 입력을 받고 있습니다.</p>
        <button class="tool-button danger" id="overlayStopRecording" type="button">녹음 종료</button>
      </section>
    </div>

    <div class="modal-backdrop" id="speechDialog" hidden>
      <section class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="speechTitle">
        <h2 id="speechTitle">음성 입력 결과</h2>
        <div class="speech-review">
          <label><span>1단계: 컴퓨터가 들은 원문</span>
            <textarea id="speechRawText" rows="4" readonly></textarea>
          </label>
          <label><span>2단계: 말한 내용을 살려 다듬은 문장 · 수정 및 추가가 가능합니다.</span>
            <textarea id="speechResultText" rows="7"></textarea>
          </label>
        </div>
        <p id="speechHelpText">확인한 뒤 본문에 넣어주세요.</p>
        <div class="dialog-actions">
          <button class="tool-button neutral" id="retryRecordingButton" type="button">다시 녹음</button>
          <button class="tool-button neutral" id="refineSpeechButton" type="button">다시 정리</button>
          <button class="tool-button neutral" id="cancelSpeechButton" type="button">취소</button>
          <button class="tool-button primary" id="insertSpeechButton" type="button">본문에 넣기</button>
        </div>
      </section>
    </div>

    <div class="modal-backdrop" id="exportDialog" hidden>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
        <h2 id="exportTitle">알림장 파일로 저장</h2>
        <div class="export-options">
          <label>시작 날짜 <input id="exportStartDate" type="date" /></label>
          <label>끝 날짜 <input id="exportEndDate" type="date" /></label>
          <label>파일 형식
            <select id="exportFormat">
              <option value="excel">엑셀</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
        </div>
        <p class="settings-note">PDF는 인쇄 창에서 PDF로 저장합니다. 엑셀은 날짜별 표 파일로 저장합니다.</p>
        <div class="dialog-actions">
          <button class="tool-button neutral" id="cancelExportButton" type="button">취소</button>
          <button class="tool-button primary" id="confirmExportButton" type="button">파일로 저장</button>
        </div>
      </section>
    </div>

    <div class="modal-backdrop" id="noticeHistoryDialog" hidden>
      <section class="dialog notice-history-dialog" role="dialog" aria-modal="true" aria-labelledby="noticeHistoryTitle">
        <div class="drawer-header">
          <div>
            <h2 id="noticeHistoryTitle">알림장 기록</h2>
            <p class="dialog-lead" id="noticeHistoryLead">이번 달에 저장된 알림장을 바로 열 수 있습니다.</p>
          </div>
          <button class="icon-button" id="closeNoticeHistoryButton" type="button" aria-label="알림장 기록 닫기">×</button>
        </div>
        <div class="notice-history-list" id="noticeHistoryList"></div>
      </section>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </main>
`;

const shell = query<HTMLElement>(".app-shell");
const editor = query<HTMLDivElement>("#editor");
const dateHeader = query<HTMLDivElement>("#dateHeader");
const statusText = query<HTMLSpanElement>("#statusText");
const autoSaveText = query<HTMLSpanElement>("#autoSaveText");
const countText = query<HTMLSpanElement>("#countText");
const settingsDrawer = query<HTMLElement>("#settingsDrawer");
const aiConnectionDialog = query<HTMLDivElement>("#aiConnectionDialog");
const noticeHistoryDialog = query<HTMLDivElement>("#noticeHistoryDialog");
const noticeHistoryList = query<HTMLDivElement>("#noticeHistoryList");
const apiGuideDialog = query<HTMLDivElement>("#apiGuideDialog");
const infoDialog = query<HTMLDivElement>("#infoDialog");
const infoTitle = query<HTMLElement>("#infoTitle");
const infoMessage = query<HTMLParagraphElement>("#infoMessage");
const confirmDialog = query<HTMLDivElement>("#confirmDialog");
const confirmTitle = query<HTMLElement>("#confirmTitle");
const confirmMessage = query<HTMLParagraphElement>("#confirmDialog p");
const confirmActionButton = query<HTMLButtonElement>("#confirmClearButton");
const recordingOverlay = query<HTMLDivElement>("#recordingOverlay");
const recordingTime = query<HTMLSpanElement>("#recordingTime");
const recordingTitle = query<HTMLElement>("#recordingTitle");
const recordingHelp = query<HTMLParagraphElement>("#recordingHelp");
const speechDialog = query<HTMLDivElement>("#speechDialog");
const speechRawTextArea = query<HTMLTextAreaElement>("#speechRawText");
const speechResultText = query<HTMLTextAreaElement>("#speechResultText");
const speechHelpText = query<HTMLParagraphElement>("#speechHelpText");
const exportDialog = query<HTMLDivElement>("#exportDialog");
const exportStartDate = query<HTMLInputElement>("#exportStartDate");
const exportEndDate = query<HTMLInputElement>("#exportEndDate");
const exportFormat = query<HTMLSelectElement>("#exportFormat");
const translationPanel = query<HTMLElement>("#translationPanel");
const translationSourceText = query<HTMLParagraphElement>("#translationSourceText");
const translationResultText = query<HTMLParagraphElement>("#translationResultText");
const translationTargetLabel = query<HTMLElement>("#translationTargetLabel");
const translationNotice = query<HTMLParagraphElement>("#translationNotice");
const translationStatusText = query<HTMLSpanElement>("#translationStatusText");
const translationWaitBanner = query<HTMLDivElement>("#translationWaitBanner");
const translationWaitText = query<HTMLSpanElement>("#translationWaitText");
const toast = query<HTMLDivElement>("#toast");
const noticeDateInput = query<HTMLInputElement>("#noticeDateInput");
const noticeNavigator = query<HTMLElement>("#noticeNavigator");
const defaultMessageToggles = query<HTMLElement>("#defaultMessageToggles");
const defaultFirstCheck = query<HTMLInputElement>("#defaultFirstCheck");
const defaultSecondCheck = query<HTMLInputElement>("#defaultSecondCheck");
const moreMenu = query<HTMLDivElement>("#moreMenu");
const languageMoreMenu = query<HTMLDivElement>("#languageMoreMenu");
const languageMoreButton = query<HTMLButtonElement>("#languageMoreButton");
const autoFitToggle = query<HTMLButtonElement>("#autoFitToggle");
const currentColorDot = query<HTMLSpanElement>("#currentColorDot");
const colorPopover = query<HTMLDivElement>("#colorPopover");
const geminiKeyInput = query<HTMLInputElement>("#geminiApiKeyInput");
const geminiKeyStatus = query<HTMLParagraphElement>("#geminiKeyStatus");
const aiStatusBadge = query<HTMLButtonElement>("#aiStatusBadge");

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}

function hydrate() {
  editor.style.fontSize = `${settings.defaultFontSize}px`;
  editor.style.color = settings.defaultColor;
  editor.style.lineHeight = String(settings.lineHeight);
  autoSaveText.textContent = "자동 저장됨";
  scheduleNoticeAutoFit();
}

function bindEvents() {
  editor.addEventListener("input", () => {
    if (isApplyingEditorContent) return;
    translationRequestId += 1;
    translatedText = "";
    if (settings.readingLanguage !== "ko") {
      translationResultText.textContent = "";
      translationNotice.textContent = "원문이 바뀌었습니다. 언어 버튼을 다시 누르면 새로 번역합니다.";
    }
    setMode("editing");
    updateCounts();
    scheduleSave();
    scheduleNoticeAutoFit();
  });
  editor.addEventListener("keydown", handleNoticeEditorKeydown);
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text);
  });

  query<HTMLButtonElement>("#fontMinus").addEventListener("click", () => changeFontSize(-10));
  query<HTMLButtonElement>("#fontPlus").addEventListener("click", () => changeFontSize(10));
  autoFitToggle.addEventListener("click", () => {
    settings.noticeAutoFit = !settings.noticeAutoFit;
    persistSettingsChange(false);
    showToast(settings.noticeAutoFit ? "알림장 글자 자동 맞춤을 켰습니다." : "알림장 글자 자동 맞춤을 껐습니다.");
  });
  query<HTMLSelectElement>("#lineHeightSelect").addEventListener("change", (event) => {
    settings.lineHeight = Number((event.target as HTMLSelectElement).value);
    editor.style.lineHeight = String(settings.lineHeight);
    saveSettings();
    scheduleSave();
    scheduleNoticeAutoFit();
  });
  query<HTMLButtonElement>("#colorMenuButton").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleColorPopover();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((button) => {
    button.addEventListener("click", () => runCommand(button.dataset.command ?? ""));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      const color = button.dataset.color ?? settings.defaultColor;
      editor.style.color = color;
      settings.defaultColor = color;
      saveSettings();
      currentColorDot.style.background = color;
      colorPopover.hidden = true;
      runCommand("foreColor", color);
    });
  });

  query<HTMLButtonElement>("#readAllButton").addEventListener("click", () => startReading(getPlainText()));
  query<HTMLButtonElement>("#pauseButton").addEventListener("click", togglePause);
  query<HTMLButtonElement>("#stopButton").addEventListener("click", () => stopReading());
  query<HTMLButtonElement>("#moreButton").addEventListener("click", toggleMoreMenu);
  languageMoreButton.addEventListener("click", toggleLanguageMoreMenu);
  aiStatusBadge.addEventListener("click", openAiConnectionSettings);
  query<HTMLButtonElement>("#clearContentButton").addEventListener("click", openClearConfirm);
  query<HTMLButtonElement>("#cancelClearButton").addEventListener("click", closeConfirmDialog);
  confirmActionButton.addEventListener("click", () => {
    const action = pendingConfirmAction;
    closeConfirmDialog();
    action?.();
  });

  query<HTMLButtonElement>("#micButton").addEventListener("click", toggleRecording);
  query<HTMLButtonElement>("#overlayStopRecording").addEventListener("click", stopRecording);
  query<HTMLButtonElement>("#retryRecordingButton").addEventListener("click", () => {
    speechDialog.hidden = true;
    startRecording();
  });
  query<HTMLButtonElement>("#refineSpeechButton").addEventListener("click", async () => {
    const source = speechRawTextArea.value.trim() || speechResultText.value.trim();
    if (!source) {
      speechHelpText.textContent = "다시 정리할 음성 인식 원문이 없습니다.";
      return;
    }
    speechHelpText.textContent = settings.aiPolishSpeech && hasGeminiApiKey()
      ? "Gemini API로 다시 정리하고 있습니다."
      : "규칙 기반으로 다시 정리하고 있습니다.";
    try {
      speechResultText.value = settings.aiPolishSpeech && hasGeminiApiKey()
        ? await polishClassroomTextWithGemini(source)
        : polishClassroomText(source);
      speechHelpText.textContent = "선생님이 말한 내용을 최대한 살려 다듬었습니다. 필요하면 직접 수정한 뒤 본문에 넣어주세요.";
    } catch (error) {
      console.info("Speech refine failed", error);
      speechResultText.value = polishClassroomText(source);
      speechHelpText.textContent = "AI 정리에 실패해 원문을 최대한 보존하는 기본 정리 방식으로 처리했습니다.";
    }
  });
  query<HTMLButtonElement>("#cancelSpeechButton").addEventListener("click", () => (speechDialog.hidden = true));
  query<HTMLButtonElement>("#insertSpeechButton").addEventListener("click", insertSpeechResult);

  query<HTMLButtonElement>("#settingsButton").addEventListener("click", () => {
    closeMoreMenu();
    openSettings();
  });
  query<HTMLButtonElement>("#closeSettings").addEventListener("click", closeSettings);
  query<HTMLButtonElement>("#closeAiConnectionButton").addEventListener("click", closeAiConnectionSettings);
  query<HTMLButtonElement>("#resetSettingsButton").addEventListener("click", () => {
    settings = { ...defaultSettings };
    saveSettings();
    applySettings();
    fillSettingsControls();
    showToast("설정이 초기화되었습니다.");
  });

  bindSettingsControl<DateFormat>("#dateFormatSelect", (value) => (settings.dateFormat = value));
  bindSettingsControl<Theme>("#themeSelect", (value) => (settings.theme = value));
  bindSettingsControl<string>("#defaultColorSelect", (value) => (settings.defaultColor = value));
  bindMainControl<Speed>("#speedSelect", (value) => {
    settings.speed = value;
    restartCurrentSpeech();
  });
  query<HTMLSelectElement>("#voiceSelect").addEventListener("change", (event) => {
    const selectedOption = (event.target as HTMLSelectElement).selectedOptions[0];
    settings.voiceURI = selectedOption?.dataset.voiceUri ?? "";
    settings.koreanVoiceGender = (selectedOption?.dataset.gender as KoreanVoiceGender) || settings.koreanVoiceGender;
    persistSettingsChange(false);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-voice-gender]").forEach((button) => {
    button.addEventListener("click", () => selectVoiceGender(button.dataset.voiceGender as KoreanVoiceGender));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    button.addEventListener("click", () => selectReadingLanguage(button.dataset.language as LanguageCode));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-board-mode]").forEach((button) => {
    button.addEventListener("click", () => switchBoardMode(button.dataset.boardMode as BoardMode));
  });
  noticeDateInput.addEventListener("change", (event) => switchNoticeDate((event.target as HTMLInputElement).value));
  query<HTMLButtonElement>("#prevDateButton").addEventListener("click", () => moveNoticeDate(-1));
  query<HTMLButtonElement>("#todayButton").addEventListener("click", () => switchNoticeDate(todayDateKey));
  query<HTMLButtonElement>("#nextDateButton").addEventListener("click", () => moveNoticeDate(1));
  query<HTMLButtonElement>("#noticeHistoryButton").addEventListener("click", openNoticeHistory);
  query<HTMLButtonElement>("#noticeExportShortcutButton").addEventListener("click", exportCurrentContent);
  defaultFirstCheck.addEventListener("change", () => toggleDefaultNoticeItem(1));
  defaultSecondCheck.addEventListener("change", () => toggleDefaultNoticeItem(2));
  query<HTMLButtonElement>("#polishContentButton").addEventListener("click", () => {
    closeMoreMenu();
    void polishCurrentContentWithGemini();
  });
  query<HTMLButtonElement>("#copyContentButton").addEventListener("click", () => {
    closeMoreMenu();
    copyCurrentContent();
  });
  query<HTMLButtonElement>("#exportContentButton").addEventListener("click", () => {
    closeMoreMenu();
    exportCurrentContent();
  });
  query<HTMLButtonElement>("#cancelExportButton").addEventListener("click", () => (exportDialog.hidden = true));
  query<HTMLButtonElement>("#confirmExportButton").addEventListener("click", exportSelectedNoticeRange);
  query<HTMLButtonElement>("#closeNoticeHistoryButton").addEventListener("click", () => (noticeHistoryDialog.hidden = true));
  query<HTMLInputElement>("#defaultFontSizeInput").addEventListener("change", (event) => {
    settings.defaultFontSize = clamp(Math.round(Number((event.target as HTMLInputElement).value) / 10) * 10, 20, 180);
    settings.noticeAutoFit = false;
    persistSettingsChange();
  });
  query<HTMLInputElement>("#defaultLineHeightInput").addEventListener("change", (event) => {
    settings.lineHeight = clamp(Number((event.target as HTMLInputElement).value), 1, 2.2);
    persistSettingsChange();
  });
  query<HTMLInputElement>("#repeatInput").addEventListener("change", (event) => {
    settings.repeat = clamp(Number((event.target as HTMLInputElement).value), 1, 5);
    persistSettingsChange(false);
  });
  query<HTMLInputElement>("#volumeInput").addEventListener("input", (event) => {
    settings.volume = Number((event.target as HTMLInputElement).value) / 100;
    persistSettingsChange(false);
    restartCurrentSpeech();
  });
  query<HTMLInputElement>("#autoSaveCheck").addEventListener("change", (event) => {
    settings.autoSave = (event.target as HTMLInputElement).checked;
    persistSettingsChange();
  });
  query<HTMLInputElement>("#alwaysOnTopCheck").addEventListener("change", (event) => {
    settings.alwaysOnTop = (event.target as HTMLInputElement).checked;
    persistSettingsChange();
    showToast("항상 위 설정은 데스크톱 앱 연결 단계에서 적용됩니다.");
  });
  query<HTMLInputElement>("#startFullScreenCheck").addEventListener("change", (event) => {
    settings.startFullScreen = (event.target as HTMLInputElement).checked;
    persistSettingsChange();
  });
  query<HTMLInputElement>("#aiEnabledCheck").addEventListener("change", (event) => {
    settings.aiEnabled = (event.target as HTMLInputElement).checked;
    if (!settings.aiEnabled) settings.geminiVerified = false;
    persistSettingsChange();
    updateLanguageButtons();
  });
  geminiKeyInput.addEventListener("change", (event) => {
    settings.geminiApiKey = (event.target as HTMLInputElement).value.trim();
    settings.geminiVerified = false;
    persistSettingsChange(false);
    updateLanguageButtons();
    updateGeminiKeyStatus();
    showToast(settings.geminiApiKey
      ? settings.rememberGeminiApiKey
        ? "Gemini API 키가 저장되었습니다. API 키 테스트를 눌러 확인해 주세요."
        : "Gemini API 키가 입력되었습니다. 현재 실행 중에만 사용됩니다."
      : "Gemini API 키가 비워졌습니다.");
  });
  query<HTMLButtonElement>("#pasteGeminiKeyButton").addEventListener("click", pasteGeminiApiKey);
  query<HTMLButtonElement>("#toggleGeminiKeyButton").addEventListener("click", toggleGeminiKeyVisibility);
  query<HTMLSelectElement>("#geminiModelSelect").addEventListener("change", (event) => {
    settings.geminiModel = normalizeGeminiModel((event.target as HTMLSelectElement).value);
    settings.geminiVerified = false;
    persistSettingsChange();
  });
  query<HTMLInputElement>("#rememberGeminiKeyCheck").addEventListener("change", (event) => {
    settings.rememberGeminiApiKey = (event.target as HTMLInputElement).checked;
    persistSettingsChange(false);
    updateGeminiKeyStatus();
    showToast(settings.rememberGeminiApiKey ? "이 기기에 API 키를 기억합니다." : "공용 PC 모드입니다. 새로 열면 API 키가 남지 않습니다.");
  });
  query<HTMLInputElement>("#aiPolishSpeechCheck").addEventListener("change", (event) => {
    settings.aiPolishSpeech = (event.target as HTMLInputElement).checked;
    persistSettingsChange();
  });
  query<HTMLInputElement>("#aiTranslateCheck").addEventListener("change", (event) => {
    settings.aiTranslate = (event.target as HTMLInputElement).checked;
    persistSettingsChange();
    updateLanguageButtons();
  });
  query<HTMLButtonElement>("#testGeminiButton").addEventListener("click", testGeminiConnection);
  query<HTMLButtonElement>("#openApiGuideButton").addEventListener("click", openApiGuide);
  query<HTMLButtonElement>("#closeApiGuideButton").addEventListener("click", closeApiGuide);
  query<HTMLButtonElement>("#closeApiGuideDoneButton").addEventListener("click", closeApiGuide);
  query<HTMLButtonElement>("#closeInfoButton").addEventListener("click", closeInfoDialog);
  query<HTMLButtonElement>("#focusGeminiInputButton").addEventListener("click", () => {
    closeApiGuide();
    openAiConnectionSettings();
    geminiKeyInput.focus();
  });

  document.addEventListener("keydown", handleShortcuts);
  document.addEventListener("click", closeFloatingUi);
  window.addEventListener("resize", scheduleNoticeAutoFit);
}

function bindSettingsControl<T extends string>(selector: string, setter: (value: T) => void) {
  query<HTMLSelectElement>(selector).addEventListener("change", (event) => {
    setter((event.target as HTMLSelectElement).value as T);
    persistSettingsChange();
  });
}

function bindMainControl<T extends string>(selector: string, setter: (value: T) => void) {
  query<HTMLSelectElement>(selector).addEventListener("change", (event) => {
    setter((event.target as HTMLSelectElement).value as T);
    persistSettingsChange(false);
  });
}

function persistSettingsChange(showSavedToast = true) {
  saveSettings();
  applySettings();
  if (showSavedToast) showToast("설정이 저장되었습니다.");
}

function loadSettings(): Settings {
  const stored = { ...defaultSettings, ...(readJson<Partial<Settings>>(STORAGE_SETTINGS) ?? {}) };
  const sessionKey = sessionStorage.getItem(STORAGE_SESSION_GEMINI_KEY) ?? "";
  return {
    ...stored,
    volume: clamp(Number(stored.volume), 0, 1),
    noticeAutoFit: stored.noticeAutoFit !== false,
    geminiApiKey: stored.geminiApiKey || sessionKey,
    geminiModel: normalizeGeminiModel(stored.geminiModel),
    geminiVerified: Boolean(stored.geminiVerified && (stored.geminiApiKey || sessionKey))
  };
}

function saveSettings() {
  if (settings.geminiApiKey) {
    sessionStorage.setItem(STORAGE_SESSION_GEMINI_KEY, settings.geminiApiKey);
  } else {
    sessionStorage.removeItem(STORAGE_SESSION_GEMINI_KEY);
  }
  const settingsToStore: Settings = {
    ...settings,
    geminiApiKey: settings.rememberGeminiApiKey ? settings.geminiApiKey : ""
  };
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settingsToStore));
}

function hasGeminiApiKey() {
  return settings.aiEnabled && settings.geminiApiKey.trim().length > 0;
}

function canUseGemini() {
  return hasGeminiApiKey() && settings.geminiVerified;
}

function normalizeGeminiModel(model?: string) {
  const normalized = (model || "").trim();
  if (!normalized || retiredGeminiModels.has(normalized)) return defaultSettings.geminiModel;
  return geminiModels.includes(normalized) ? normalized : defaultSettings.geminiModel;
}

function getGeminiModelCandidates(model?: string) {
  const preferred = normalizeGeminiModel(model);
  return [preferred, ...geminiModels.filter((candidate) => candidate !== preferred)];
}

function extractGeminiText(data: unknown): string {
  const value = data as {
    output_text?: string;
    outputText?: string;
    text?: string;
    interaction?: { output_text?: string; outputText?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    outputs?: Array<{ content?: Array<{ text?: string }> | { parts?: Array<{ text?: string }> } }>;
  };
  const directText = value.output_text || value.outputText || value.text || value.interaction?.output_text || value.interaction?.outputText;
  if (directText?.trim()) return directText.trim();
  const candidateText = value.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (candidateText) return candidateText;
  const outputText = value.outputs
    ?.flatMap((output) => Array.isArray(output.content) ? output.content : output.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return outputText || "";
}

async function callGeminiText(prompt: string, maxOutputTokens = 900, temperature = 0.25) {
  if (!hasGeminiApiKey()) throw new Error("Gemini API key is not configured");
  let lastError: unknown = null;
  for (const model of getGeminiModelCandidates(settings.geminiModel)) {
    try {
      const text = await callGeminiTextWithModel(model, prompt, maxOutputTokens, temperature);
      if (model !== settings.geminiModel || !settings.geminiVerified) {
        settings.geminiModel = model;
        settings.geminiVerified = true;
        saveSettings();
        fillSettingsControls();
      }
      return text;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (isGeminiAuthError(message)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini API request failed");
}

function isGeminiAuthError(message: string) {
  return message.includes("api key not valid")
    || message.includes("unauthenticated")
    || message.includes("permission denied")
    || message.includes("invalid api key");
}

async function fetchJsonWithTimeout(url: string, options: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function callGeminiTextWithModel(model: string, prompt: string, maxOutputTokens = 900, temperature = 0.25) {
  const apiKey = settings.geminiApiKey.trim();
  const payload = {
    model,
    prompt,
    maxOutputTokens,
    temperature
  };

  const localResult = await fetchJsonWithTimeout("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, apiKey })
  }).catch(() => null);
  if (localResult) {
    if (localResult.response.ok) {
      const text = extractGeminiText(localResult.data);
      if (text) return text;
    }
    if (localResult.response.status !== 404) {
      throw new Error(localResult.data?.error || `Gemini API 오류: ${localResult.response.status}`);
    }
  }

  const generateResult = await fetchJsonWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: payload.temperature,
        maxOutputTokens
      }
    })
  });
  if (generateResult.response.ok) {
    const text = extractGeminiText(generateResult.data);
    if (text) return text;
  }

  const interactionResult = await fetchJsonWithTimeout("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model,
      input: prompt,
      generation_config: {
        temperature: payload.temperature,
        max_output_tokens: maxOutputTokens
      }
    })
  });
  if (!interactionResult.response.ok) {
    const message = generateResult.data?.error?.message || interactionResult.data?.error?.message || `Gemini API 오류: ${interactionResult.response.status}`;
    throw new Error(message);
  }

  const text = extractGeminiText(interactionResult.data);
  if (!text) throw new Error(generateResult.data?.error?.message || "Gemini 응답이 비어 있습니다.");
  return text;
}

async function findWorkingGeminiModel(prompt: string, maxOutputTokens = 40) {
  let lastError: unknown = null;
  for (const model of getGeminiModelCandidates(settings.geminiModel)) {
    try {
      const text = await callGeminiTextWithModel(model, prompt, maxOutputTokens);
      return { model, text };
    } catch (error) {
      lastError = error;
      console.info("Gemini model test failed", model, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini API request failed");
}

async function testGeminiConnection() {
  if (!hasGeminiApiKey()) {
    settings.geminiVerified = false;
    saveSettings();
    updateGeminiKeyStatus("Gemini API 사용을 켜고 API 키를 입력해주세요.", "error");
    showToast("Gemini API 사용을 켜고 API 키를 입력해주세요.");
    return;
  }
  if (retiredGeminiModels.has(settings.geminiModel)) {
    settings.geminiModel = defaultSettings.geminiModel;
    saveSettings();
    fillSettingsControls();
  }
  updateGeminiKeyStatus("Gemini API 키를 확인하고 있습니다. 잠시만 기다려주세요.", "idle");
  showToast("사용 가능한 Gemini 모델을 확인하고 있습니다.");
  try {
    const result = await findWorkingGeminiModel("짧게 '연결 성공'이라고만 답하세요.", 40);
    settings.geminiModel = result.model;
    settings.geminiVerified = true;
    saveSettings();
    fillSettingsControls();
    updateLanguageButtons();
    updateGeminiKeyStatus(`테스트 성공. ${result.model} 모델로 음성 정리와 외국어 번역을 처리합니다.`, "success");
    showToast(result.text.includes("연결") ? `Gemini API 연결 성공: ${result.model}` : `Gemini API 응답 확인: ${result.model}`);
  } catch (error) {
    console.info("Gemini test failed", error);
    settings.geminiVerified = false;
    saveSettings();
    updateLanguageButtons();
    const message = error instanceof Error ? explainGeminiError(error.message) : "연결 실패. API 키와 인터넷 연결을 확인해주세요.";
    updateGeminiKeyStatus(message, "error");
    showToast(message);
  }
}

function explainGeminiError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("api key not valid") || lower.includes("permission") || lower.includes("unauthenticated")) {
    return "연결 실패. API 키가 유효하지 않거나 이 프로젝트에서 Gemini API 사용이 허용되지 않았습니다.";
  }
  if (lower.includes("quota") || lower.includes("rate")) {
    return "연결 실패. 무료 사용량 한도 또는 요청 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "요청 시간이 초과되었습니다. 인터넷 연결이 느리거나 Gemini 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("empty response") || lower.includes("응답이 비어")) {
    return "Gemini가 빈 응답을 보냈습니다. 다시 시도하거나 모델을 바꿔 테스트해주세요.";
  }
  if (lower.includes("model") || lower.includes("not found")) {
    return "연결 실패. 선택한 모델을 사용할 수 없습니다. 모델을 gemini-3.8-flash로 바꿔 다시 테스트해주세요.";
  }
  return "연결 실패. API 키, 무료 프로젝트 선택, 인터넷 연결을 확인해주세요.";
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function loadSchoolMessageHistory() {
  const state = readJson<SchoolMessageHistoryState>(STORAGE_SCHOOL_MESSAGE_HISTORY);
  if (state?.version === 2 && Array.isArray(state.entries)) return state.entries;
  const legacy = readJson<SchoolMessageHistoryEntry[]>(STORAGE_LEGACY_SCHOOL_MESSAGE_HISTORY);
  return Array.isArray(legacy) ? legacy : [];
}

function saveSchoolMessageHistory(entries: SchoolMessageHistoryEntry[]) {
  const state: SchoolMessageHistoryState = { version: 2, entries };
  localStorage.setItem(STORAGE_SCHOOL_MESSAGE_HISTORY, JSON.stringify(state));
}

function applySettings() {
  document.documentElement.style.setProperty("--board-bg", themes[settings.theme]);
  document.documentElement.style.setProperty("--editor-color", settings.defaultColor);
  editor.style.lineHeight = String(settings.lineHeight);
  editor.style.fontSize = `${settings.defaultFontSize}px`;
  query<HTMLOutputElement>("#fontSizeValue").value = settings.noticeAutoFit && activeBoardMode === "notice" ? "자동" : String(getEditorFontSize());
  autoFitToggle.classList.toggle("active", settings.noticeAutoFit);
  autoFitToggle.setAttribute("aria-pressed", String(settings.noticeAutoFit));
  query<HTMLSelectElement>("#lineHeightSelect").value = getLineHeightPreset(settings.lineHeight);
  query<HTMLSelectElement>("#speedSelect").value = settings.speed;
  query<HTMLInputElement>("#repeatInput").value = String(settings.repeat);
  query<HTMLInputElement>("#volumeInput").value = String(Math.round(settings.volume * 100));
  updateVolumeValue();
  currentColorDot.style.background = settings.defaultColor;
  updateGeminiKeyStatus();
  updateAiStatusBadge();
  updateLanguageButtons();
  updateVoiceGenderButtons();
  updateModeUi();
  scheduleNoticeAutoFit();
}

function fillSettingsControls() {
  settings.geminiModel = normalizeGeminiModel(settings.geminiModel);
  query<HTMLSelectElement>("#dateFormatSelect").value = settings.dateFormat;
  query<HTMLInputElement>("#autoSaveCheck").checked = settings.autoSave;
  query<HTMLInputElement>("#alwaysOnTopCheck").checked = settings.alwaysOnTop;
  query<HTMLInputElement>("#defaultFontSizeInput").value = String(settings.defaultFontSize);
  query<HTMLInputElement>("#defaultLineHeightInput").value = String(settings.lineHeight);
  query<HTMLSelectElement>("#defaultColorSelect").value = settings.defaultColor;
  query<HTMLSelectElement>("#themeSelect").value = settings.theme;
  query<HTMLInputElement>("#startFullScreenCheck").checked = settings.startFullScreen;
  query<HTMLInputElement>("#aiEnabledCheck").checked = settings.aiEnabled;
  geminiKeyInput.value = settings.geminiApiKey;
  query<HTMLSelectElement>("#geminiModelSelect").value = normalizeGeminiModel(settings.geminiModel);
  query<HTMLInputElement>("#rememberGeminiKeyCheck").checked = settings.rememberGeminiApiKey;
  query<HTMLInputElement>("#aiPolishSpeechCheck").checked = settings.aiPolishSpeech;
  query<HTMLInputElement>("#aiTranslateCheck").checked = settings.aiTranslate;
  updateGeminiKeyStatus();
}

function updateGeminiKeyStatus(message?: string, status: "idle" | "success" | "error" = "idle") {
  const hasKey = settings.geminiApiKey.trim().length > 0;
  const enabled = settings.aiEnabled;
  geminiKeyStatus.textContent = message
    ?? (hasKey && enabled
      ? settings.geminiVerified
        ? "API 키 테스트가 성공했습니다. 음성 정리와 외국어 번역에 Gemini를 사용합니다."
        : settings.rememberGeminiApiKey
          ? "API 키가 이 기기에 저장되어 있습니다. API 키 테스트가 성공해야 AI 기능을 사용합니다."
          : "API 키가 현재 실행 중에만 사용됩니다. API 키 테스트가 성공해야 AI 기능을 사용합니다."
      : hasKey
        ? "API 키가 입력되어 있습니다. Gemini API 사용을 켜면 AI 기능이 작동합니다."
        : "API 키를 넣으면 음성 정리와 외국어 번역에 AI를 사용할 수 있습니다.");
  geminiKeyStatus.dataset.status = status;
  updateAiStatusBadge();
}

function updateAiStatusBadge() {
  const configured = hasGeminiApiKey();
  const verified = canUseGemini();
  aiStatusBadge.textContent = verified ? "AI 사용 가능" : configured ? "API 테스트 필요" : "API 연결 필요";
  aiStatusBadge.dataset.status = verified ? "connected" : configured ? "pending" : "needed";
  aiStatusBadge.title = verified
    ? "API 키 테스트가 성공했습니다. AI 정리와 번역을 사용할 수 있습니다."
    : configured
      ? "API 키가 입력되었습니다. API 키 테스트를 눌러 연결을 확인해주세요."
      : "Gemini API 키를 연결하면 AI 정리와 번역을 사용할 수 있습니다.";
}

async function pasteGeminiApiKey() {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
      updateGeminiKeyStatus("클립보드에 붙여넣을 API 키가 없습니다.", "error");
      return;
    }
    geminiKeyInput.value = text;
    settings.geminiApiKey = text;
    settings.geminiVerified = false;
    if (!settings.aiEnabled) settings.aiEnabled = true;
    saveSettings();
    fillSettingsControls();
    updateLanguageButtons();
    updateGeminiKeyStatus(settings.rememberGeminiApiKey
      ? "API 키를 붙여넣고 이 기기에 저장했습니다. 이제 API 키 테스트를 눌러주세요."
      : "API 키를 붙여넣었습니다. 현재 실행 중에만 사용됩니다. 이제 API 키 테스트를 눌러주세요.", "success");
  } catch (error) {
    console.info("Clipboard paste failed", error);
    updateGeminiKeyStatus("브라우저가 자동 붙여넣기를 막았습니다. Ctrl+V로 직접 붙여넣어 주세요.", "error");
  }
}

function toggleGeminiKeyVisibility() {
  const button = query<HTMLButtonElement>("#toggleGeminiKeyButton");
  const isHidden = geminiKeyInput.type === "password";
  geminiKeyInput.type = isHidden ? "text" : "password";
  button.textContent = isHidden ? "숨기기" : "보기";
}

function getLineHeightPreset(value: number) {
  if (value <= 1.2) return "1.15";
  if (value >= 1.5) return "1.6";
  return "1.35";
}

function populateVoices() {
  const select = query<HTMLSelectElement>("#voiceSelect");
  const current = settings.voiceURI;
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const koreanChoices = pickKoreanVoiceChoices(voices);
  const options: string[] = [];
  if (koreanChoices.male) {
    options.push(`<option value="male:${escapeHtml(koreanChoices.male.voiceURI)}" data-voice-uri="${escapeHtml(koreanChoices.male.voiceURI)}" data-gender="male">남자 선생님</option>`);
  }
  if (koreanChoices.female) {
    options.push(`<option value="female:${escapeHtml(koreanChoices.female.voiceURI)}" data-voice-uri="${escapeHtml(koreanChoices.female.voiceURI)}" data-gender="female">여자 선생님</option>`);
  }
  if (!options.length) {
    options.push(`<option value="default:" data-voice-uri="" data-gender="${settings.koreanVoiceGender}">기본 선생님 목소리</option>`);
  }

  select.innerHTML = options.join("");
  select.hidden = options.length <= 1;
  const currentOption = Array.from(select.options).find((option) =>
    option.dataset.voiceUri === current && option.dataset.gender === settings.koreanVoiceGender
  );
  if (currentOption) {
    select.value = currentOption.value;
  } else {
    const preferred = select.querySelector<HTMLOptionElement>(`option[data-gender="${settings.koreanVoiceGender}"]`) ?? select.options[0];
    select.value = preferred?.value ?? "";
    settings.voiceURI = preferred?.dataset.voiceUri ?? "";
    settings.koreanVoiceGender = (preferred?.dataset.gender as KoreanVoiceGender) || settings.koreanVoiceGender;
  }
  updateVoiceGenderButtons();
}

function pickKoreanVoiceChoices(voices: SpeechSynthesisVoice[]) {
  const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ko"));
  const male = pickBestVoiceByGender(koreanVoices, "male");
  const female = pickBestVoiceByGender(koreanVoices, "female")
    ?? pickBestLikelyKoreanFemaleVoice(koreanVoices, male);
  return { male, female };
}

function selectVoiceGender(gender: KoreanVoiceGender) {
  settings.koreanVoiceGender = gender;
  const voice = pickVoiceForLanguage("ko");
  settings.voiceURI = voice?.voiceURI ?? "";
  persistSettingsChange(false);
  restartCurrentSpeech();
  if (!voice) showToast(`${voiceGenderLabel(gender)} 한국어 목소리가 이 기기에 없어 기본 목소리로 읽습니다.`);
}

function updateVoiceGenderButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-voice-gender]").forEach((button) => {
    const gender = button.dataset.voiceGender as KoreanVoiceGender;
    button.classList.toggle("active", gender === settings.koreanVoiceGender);
    button.title = `${voiceGenderLabel(gender)} 목소리로 읽기`;
  });
  const selectedVoice = pickVoiceForLanguage("ko");
  const voiceSelect = query<HTMLSelectElement>("#voiceSelect");
  if (selectedVoice) voiceSelect.value = `${settings.koreanVoiceGender}:${selectedVoice.voiceURI}`;
}

function voiceGenderLabel(gender: KoreanVoiceGender) {
  return gender === "male" ? "남자" : "여자";
}

function speechVolumeFromSlider(value: number) {
  const ratio = clamp(value, 0, 100) / 100;
  if (ratio <= 0) return 0;
  return clamp(0.08 + Math.pow(ratio, 0.52) * 0.92, 0, 1);
}

function updateVolumeValue() {
  const sliderValue = Number(query<HTMLInputElement>("#volumeInput").value);
  query<HTMLOutputElement>("#volumeValue").value = String(Math.round(sliderValue));
  query<HTMLOutputElement>("#volumeValue").textContent = String(Math.round(sliderValue));
}

function loadActiveBoardMode(): BoardMode {
  return localStorage.getItem(STORAGE_ACTIVE_MODE) === "board" ? "board" : "notice";
}

function loadLegacyBoardHtml() {
  const saved = readJson<SavedDocument>(documentKey(currentDateKey)) ?? readJson<SavedDocument>(STORAGE_LEGACY_DOCUMENT);
  return saved?.contentHtml ?? "";
}

async function checkTranslationSupport() {
  const Translator = (globalThis as WindowWithTranslator).Translator;
  if (!Translator) {
    for (const language of languages) {
      translationSupport.set(language.code, language.code === "ko" ? "success" : "unsupported");
    }
    updateLanguageButtons();
    return;
  }

  await Promise.all(languages.filter((language) => language.code !== "ko").map(async (language) => {
    try {
      const availability = await Translator.availability({ sourceLanguage: "ko", targetLanguage: language.translateCode });
      if (availability === "available") translationSupport.set(language.code, "success");
      else if (availability === "downloadable") translationSupport.set(language.code, "downloadable");
      else if (availability === "downloading") translationSupport.set(language.code, "downloading");
      else translationSupport.set(language.code, "unsupported");
    } catch (error) {
      console.info("Translation support check failed", language.code, error);
      translationSupport.set(language.code, "unsupported");
    }
  }));
  updateLanguageButtons();
}

function updateLanguageButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    const code = button.dataset.language as LanguageCode;
    const status = translationSupport.get(code) ?? "checking";
    button.classList.toggle("active", code === settings.readingLanguage);
    const geminiReady = code !== "ko" && settings.aiTranslate && hasGeminiApiKey();
    const needsTest = code !== "ko" && settings.aiTranslate && hasGeminiApiKey() && !settings.geminiVerified;
    button.disabled = code !== "ko" && status === "unsupported" && !geminiReady && !needsTest;
    button.title = geminiReady
      ? settings.geminiVerified ? "Gemini API로 번역 가능" : "Gemini API로 번역을 시도합니다"
      : needsTest
        ? "API 키 테스트가 성공하면 Gemini로 번역합니다"
        : languageStatusLabel(status);
  });
  languageMoreButton.classList.toggle("has-active-language", settings.readingLanguage !== "ko");
  languageMoreButton.textContent = `언어 선택(${languageLabel(settings.readingLanguage)}) ▾`;
  languageMoreButton.title = `${languageLabel(settings.readingLanguage)} 선택됨`;
}

function languageStatusLabel(status: TranslationStatus) {
  const labels: Record<TranslationStatus, string> = {
    idle: "대기",
    checking: "지원 확인 중",
    downloadable: "처음 사용할 때 준비가 필요합니다",
    downloading: "준비 중",
    translating: "번역 중",
    success: "사용 가능",
    unsupported: "이 기기에서 지원하지 않음",
    error: "한국어로 표시"
  };
  return labels[status];
}

function setTranslationStatusMessage(message = "", status: "idle" | "busy" | "success" | "error" = "idle") {
  translationStatusText.textContent = message;
  translationStatusText.dataset.status = status;
  const isWaiting = status === "busy" && Boolean(message);
  translationWaitBanner.hidden = !isWaiting;
  translationWaitText.innerHTML = isWaiting ? escapeHtml(message).replace(/\s*\|\s*/g, "<br />") : "";
}

function setProcessingStatusMessage(message = "") {
  const isWaiting = Boolean(message);
  translationWaitBanner.hidden = !isWaiting;
  translationWaitText.innerHTML = isWaiting ? escapeHtml(message).replace(/\s*\|\s*/g, "<br />") : "";
}

function prepareTextForTranslation(text: string) {
  return text
    .replace(/\s+(\d+\.\s*)/g, "\n$1")
    .replace(/([.!?。！？])\s*(\d+\.\s*)/g, "$1\n$2")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function selectReadingLanguage(code: LanguageCode) {
  stopReading();
  closeLanguageMoreMenu();
  const requestId = ++translationRequestId;
  settings.readingLanguage = code;
  saveSettings();
  updateLanguageButtons();

  if (code === "ko") {
    translatedText = "";
    translationPanel.hidden = true;
    translationNotice.textContent = "";
    setTranslationStatusMessage("");
    showToast("한국어로 표시합니다.");
    return;
  }

  const sourceText = prepareTextForTranslation(getPlainText());
  if (!sourceText) {
    fallbackToKorean("번역할 한국어 문장이 없습니다.");
    return;
  }

  const supported = translationSupport.get(code);
  const useGeminiTranslation = settings.aiTranslate && hasGeminiApiKey();
  if (supported === "unsupported" && !useGeminiTranslation) {
    fallbackToKorean("이 기기에서는 선택한 언어 번역을 사용할 수 없어 한국어로 표시합니다.");
    return;
  }

  try {
    translationStatus = supported === "downloadable" ? "downloadable" : "translating";
    const processingMessage = supported === "downloadable"
      ? `${languageLabel(code)} 번역 기능을 준비하고 있습니다. | 조금만 기다려 주세요.`
      : `지금 ${languageLabel(code)} 번역 중입니다. | 조금만 기다려 주세요.`;
    setTranslationStatusMessage(processingMessage, "busy");
    showToast(useGeminiTranslation ? `${languageLabel(code)} Gemini 번역 중입니다.` : `${languageLabel(code)} 자동 번역 중입니다.`);
    translationPanel.hidden = true;
    translationSourceText.textContent = sourceText;
    translationResultText.textContent = "";
    translationTargetLabel.textContent = useGeminiTranslation ? `${languageLabel(code)} Gemini 번역` : `${languageLabel(code)} 자동 번역`;

    let result = "";
    if (useGeminiTranslation) {
      result = await translateWithGemini(sourceText, code);
    } else {
      const translator = await getTranslator(code);
      const chunks = splitForTranslation(sourceText);
      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        translatedChunks.push(await translator.translate(chunk));
      }
      result = translatedChunks.join("\n\n").trim();
    }
    if (requestId !== translationRequestId) return;

    translatedText = refineClassroomTranslation(sourceText, result, code);
    if (!translatedText) throw new Error("empty translation");
    if (useGeminiTranslation && !settings.geminiVerified) {
      settings.geminiVerified = true;
      saveSettings();
      updateAiStatusBadge();
      updateGeminiKeyStatus("Gemini 번역이 성공했습니다. 이제 AI 기능을 사용할 수 있습니다.", "success");
    }
    translationResultText.textContent = formatTranslationForDisplay(translatedText);
    translationPanel.hidden = false;
    translationNotice.textContent = useGeminiTranslation
      ? "Gemini API로 교실 안내문 말투에 맞춰 번역했습니다. 필요하면 교사가 확인해 주세요."
      : code === "en"
      ? "API 미연결 상태입니다. 브라우저 자동 번역이라 어색할 수 있으며, 교실 활동 용어만 일부 보정했습니다."
      : "API 미연결 상태입니다. 브라우저 자동 번역이라 일부 표현이 자연스럽지 않을 수 있습니다.";
    setTranslationStatusMessage(`${languageLabel(code)} 번역 완료`, "success");
    translationStatus = "success";
    readTranslatedText(code);
  } catch (error) {
    console.info("Translation failed", error);
    const message = error instanceof Error ? error.message : "";
    if (useGeminiTranslation && isGeminiAuthError(message.toLowerCase())) {
      settings.geminiVerified = false;
      saveSettings();
      updateAiStatusBadge();
    }
    fallbackToKorean(useGeminiTranslation
      ? explainGeminiError(message)
      : "API가 연결되지 않아 브라우저 자동 번역을 시도했지만 실패했습니다.");
  }
}

async function getTranslator(code: LanguageCode) {
  const cached = translatorCache.get(code);
  if (cached) return cached;
  const Translator = (globalThis as WindowWithTranslator).Translator;
  if (!Translator) throw new Error("Translator is unavailable");
  const language = languages.find((item) => item.code === code);
  if (!language) throw new Error("Unknown language");
  const translator = await Translator.create({ sourceLanguage: "ko", targetLanguage: language.translateCode });
  translatorCache.set(code, translator);
  return translator;
}

async function translateWithGemini(sourceText: string, code: LanguageCode) {
  const items = getNumberedTranslationItems(sourceText);
  const sourceItems = items.length ? items : [sourceText];
  const prompt = buildTranslationPrompt(sourceItems, code, false);
  const raw = await callGeminiText(prompt, 1500, 0.02);
  let translatedItems = applyKnownTranslationOverrides(sourceItems, parseGeminiTranslationItems(raw), code);
  if (!isAcceptableTranslationResult(sourceItems, translatedItems, code)) {
    const retryPrompt = buildTranslationPrompt(sourceItems, code, true);
    const retryRaw = await callGeminiText(retryPrompt, 1800, 0);
    translatedItems = applyKnownTranslationOverrides(sourceItems, parseGeminiTranslationItems(retryRaw), code);
  }
  if (!isAcceptableTranslationResult(sourceItems, translatedItems, code)) {
    const repairPrompt = buildTranslationRepairPrompt(sourceItems, translatedItems, code);
    const repairRaw = await callGeminiText(repairPrompt, 1800, 0);
    translatedItems = applyKnownTranslationOverrides(sourceItems, parseGeminiTranslationItems(repairRaw), code);
  }
  return translatedItems.join("\n");
}

function buildTranslationPrompt(items: string[], code: LanguageCode, strictRetry: boolean) {
  const target = languagePromptName(code);
  return [
    "당신은 초등학교 교실 안내문을 번역하는 전문 번역가이자 원어민 교정자입니다.",
    `아래 한국어 교실 안내문을 ${target}로 번역하세요.`,
    "번역 전 반드시 각 항목의 핵심 의미와 문법을 내부적으로 검수한 뒤, 최종 번역만 출력하세요.",
    "규칙:",
    "1. 항목 수, 번호, 순서를 그대로 유지합니다.",
    "2. 원문의 의미를 빠뜨리거나 요약하지 않습니다. 한 항목 안의 장소, 대상, 시간, 행동, 이유를 모두 보존합니다.",
    "3. 원문에 없는 활동, 이유, 대상, 예시를 새로 만들지 않습니다.",
    "4. 목표 언어 원어민이 보기에 문법 오류와 번역투가 없도록 자연스럽게 씁니다.",
    "5. 초등학생이 바로 이해할 수 있는 교실 안내문 말투로 씁니다. 너무 딱딱한 행정 문장이나 성인용 표현은 피합니다.",
    "6. 한국어 어순을 그대로 따라 쓰지 말고 목표 언어의 자연스러운 어순과 관용 표현으로 바꿉니다.",
    "7. 생활수칙의 '-하기', '-하지 않기'는 목표 언어에서도 지시문/실천 문구처럼 자연스럽게 옮깁니다.",
    "8. '친구에게 약속한 일'은 '친구와 함께 한 일'이 아니라 '친구에게 한 약속'이라는 뜻입니다.",
    "9. '말이나 행동으로 친구를 깜짝 놀라게 하지 않기'는 갑작스러운 말·행동으로 놀라게 하지 않는다는 뜻입니다. 폭력, 위협, 장난 등으로 과장하지 않습니다.",
    "10. '풀'은 문맥상 접착제이면 glue/胶水/keo dán에 해당하는 말로 번역하고, 잔디로 번역하지 않습니다.",
    "11. '네임펜'은 permanent marker처럼 교실 활동에 맞는 표현으로 번역합니다.",
    "12. 기념일 이름은 가능한 공식·통용 명칭을 쓰고, 뒤의 실천 문구는 원문의 실천 행동을 그대로 옮깁니다.",
    "13. 설명, 인사말, 마크다운, 별표, 코드블록을 절대 쓰지 않습니다.",
    "14. 반드시 입력 배열과 같은 개수의 JSON 배열 하나만 출력합니다. 예: [\"1. 번역\", \"2. 번역\"]",
    strictRetry ? "15. 이전 응답은 의미 누락, 문법 오류, 번역투, 언어 혼입 가능성이 있습니다. 이번에는 원어민 교정까지 마친 완성 번역만 출력합니다." : "",
    "용어 기준:",
    "- 국제 평화의 날: International Day of Peace / 国际和平日 / Ngày Quốc tế Hòa bình",
    "- 사회복지의 날: Social Welfare Day / 社会福利日 / Ngày Phúc lợi xã hội / Нийгмийн халамжийн өдөр",
    "- 우리 약속: our shared agreement / 我们共同的约定 / thỏa thuận chung của chúng ta",
    "- 친구에게 약속한 일: what we promised our friends / 答应朋友的事情 / những việc đã hứa với bạn bè / найзууддаа амласан зүйл",
    ...translationStyleGuide(code),
    ...targetLanguageRules(code),
    "",
    JSON.stringify(items, null, 2)
  ].filter(Boolean).join("\n");
}

function buildTranslationRepairPrompt(sourceItems: string[], draftItems: string[], code: LanguageCode) {
  const target = languagePromptName(code);
  return [
    "당신은 초등학교 교실 안내문 번역을 최종 검수하는 원어민 교정자입니다.",
    `아래 한국어 원문과 ${target} 초안을 비교해, 의미 누락·문법 오류·번역투·다른 언어 혼입을 모두 고친 최종 번역만 출력하세요.`,
    "검수 기준:",
    "- 원문 항목 수와 번호를 그대로 유지합니다.",
    "- 원문의 장소, 대상, 시간, 행동, 이유를 빠뜨리지 않습니다.",
    "- 목표 언어 원어민이 교실에서 실제로 쓰는 자연스러운 표현으로 고칩니다.",
    "- 한국어, 영어 설명, 마크다운, 주석을 섞지 않습니다.",
    "- 반드시 JSON 배열 하나만 출력합니다.",
    ...targetLanguageRules(code),
    "",
    "원문:",
    JSON.stringify(sourceItems, null, 2),
    "",
    "초안:",
    JSON.stringify(draftItems, null, 2)
  ].join("\n");
}

function languagePromptName(code: LanguageCode) {
  const language = languages.find((item) => item.code === code);
  if (!language) return languageLabel(code);
  return `${language.koName}(${language.nativeName})`;
}

function translationStyleGuide(code: LanguageCode) {
  const guides: Partial<Record<LanguageCode, string[]>> = {
    en: [
      "- 영어 생활수칙은 명사구보다 가능한 명확한 동명사구 또는 짧은 명령형을 사용합니다.",
      "- '친구에게 약속한 일'은 'what we promised our friends'로 옮기고 'with our friends'로 의미를 바꾸지 않습니다."
    ],
    zh: [
      "- 중국어는 간체 중국어로 번역합니다.",
      "- '우리 약속'은 '我们共同的约定'처럼 공동의 약속이라는 의미를 분명히 합니다."
    ],
    vi: [
      "- 베트남어는 자연스러운 학교 안내문 말투로 번역합니다.",
      "- '잊지 않고 실천하기'는 'Nhớ thực hiện...'처럼 자연스럽게 표현합니다."
    ],
    mn: [
      "- 몽골어는 자연스러운 학교 안내문 말투로 번역합니다.",
      "- '친구에게 약속한 일'은 'тохиролцсон'보다 'амласан'을 사용해 약속의 의미를 분명히 합니다."
    ]
  };
  return guides[code] ?? [];
}

function targetLanguageRules(code: LanguageCode) {
  const rules: Partial<Record<LanguageCode, string[]>> = {
    en: [
      "- 출력은 영어만 사용합니다.",
      "- 교실 지시는 짧고 자연스러운 영어로 씁니다. 어색한 한국어식 명사 나열을 피합니다."
    ],
    zh: [
      "- 출력은 간체 중국어만 사용합니다. 영어 문장이나 한국어를 섞지 않습니다.",
      "- 초등학생 안내문에 맞게 짧고 분명한 중국어 문장으로 씁니다."
    ],
    vi: [
      "- 출력은 베트남어만 사용합니다. 영어 문장이나 한국어를 섞지 않습니다.",
      "- 베트남어 성조와 띄어쓰기를 자연스럽게 유지합니다."
    ],
    fil: [
      "- 출력은 Filipino/Tagalog만 사용합니다. 영어가 꼭 필요한 고유명사가 아니면 영어 문장을 섞지 않습니다."
    ],
    uz: [
      "- 출력은 O‘zbekcha만 사용합니다. 가능하면 라틴 문자 우즈베크어로 씁니다."
    ],
    ru: [
      "- 출력은 러시아어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    km: [
      "- 출력은 크메르어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    mn: [
      "- 출력은 몽골어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    th: [
      "- 출력은 태국어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    ne: [
      "- 출력은 네팔어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    id: [
      "- 출력은 Bahasa Indonesia만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    my: [
      "- 출력은 미얀마어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ],
    ja: [
      "- 출력은 일본어만 사용합니다. 한국어와 영어 설명을 섞지 않습니다."
    ]
  };
  return rules[code] ?? [];
}

async function polishCurrentContentWithGemini() {
  const sourceText = getPlainText();
  if (!sourceText) {
    showToast("AI로 정리할 본문이 없습니다.");
    return;
  }
  if (!hasGeminiApiKey()) {
    showToast("AI 연결에서 Gemini API 키를 연결한 뒤 사용할 수 있습니다.");
    openAiConnectionSettings();
    updateGeminiKeyStatus("Gemini API 사용을 켜고 API 키를 입력해 주세요.", "error");
    return;
  }

  stopCurrentAction();
  setMode("converting");
  setProcessingStatusMessage("본문을 AI로 다듬는 중입니다. | 조금만 기다려 주세요.");
  showToast("Gemini API로 본문을 정리하고 있습니다.");
  try {
    const polished = await polishClassroomTextWithGemini(sourceText);
    if (!polished) throw new Error("empty polished text");
    applyPlainTextToEditor(polished);
    resetTranslationState();
    updateCounts();
    scheduleSave();
    setMode("completed");
    showToast("본문을 AI로 정리했습니다. 필요하면 바로 수정할 수 있습니다.");
  } catch (error) {
    console.info("Content polish failed", error);
    const message = error instanceof Error ? error.message : "";
    if (isGeminiAuthError(message.toLowerCase())) {
      settings.geminiVerified = false;
      saveSettings();
      updateAiStatusBadge();
    }
    setMode("error");
    updateGeminiKeyStatus(explainGeminiError(message), "error");
    showToast(explainGeminiError(message));
  } finally {
    setProcessingStatusMessage("");
  }
}

function splitForTranslation(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (paragraph.length <= 800) {
      chunks.push(paragraph);
      continue;
    }
    const sentences = paragraph.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [paragraph];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > 800 && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks;
}

function refineClassroomTranslation(sourceText: string, translated: string, code: LanguageCode) {
  const normalized = normalizeTranslatedLineBreaks(cleanTranslationMetaText(translated));
  if (code !== "en") return normalized;

  let text = normalized
    .replace(/\bname pen\b/gi, "permanent marker")
    .replace(/\bmarker pen\b/gi, "permanent marker")
    .replace(/\bgrass\b/gi, sourceText.includes("풀") ? "glue" : "grass")
    .replace(/\bwith glue\b/gi, "with glue")
    .replace(/wherever you are with glue/gi, "the designated place")
    .replace(/wherever there is glue/gi, "the designated place")
    .replace(/where you can paste it with glue/gi, "the designated place")
    .replace(/\bColoring\./gi, "Color it.");

  if (/세계\s*평화의\s*날/.test(sourceText)) {
    text = text
      .replace(/Remembering those who worked hard for our community/gi, "Remembering people who worked for peace")
      .replace(/Remember those who worked hard for our community/gi, "Remember people who worked for peace");
  }

  const hasPictureActivity = /원하는\s*그림|그림을\s*선택/.test(sourceText) && /연필로\s*그/.test(sourceText) && /색칠/.test(sourceText);
  if (hasPictureActivity) {
    text = text
      .replace(/I picked the picture I wanted\.?\s*/gi, "")
      .replace(/I chose the picture I wanted\.?\s*/gi, "")
      .replace(/Choose the picture I want\.?\s*/gi, "")
      .replace(/Color it\./gi, "Choose one picture you like, draw it in pencil, and color it.");
    if (!/choose one picture you like/i.test(text)) {
      text = `${text.replace(/[.\s]*$/g, "")}. Choose one picture you like, draw it in pencil, and color it.`;
    }
  }

  if (/풀로\s*붙|붙일\s*수\s*있는\s*곳|붙이면/.test(sourceText)) {
    text = text
      .replace(/You can paste it.*?(?:\.|$)/gi, "Finally, glue it in the designated place.")
      .replace(/Paste it.*?(?:\.|$)/gi, "Finally, glue it in the designated place.")
      .replace(/Glue it.*?(?:\.|$)/gi, "Finally, glue it in the designated place.");
    if (!/glue it in the designated place/i.test(text)) {
      text = `${text.replace(/[.\s]*$/g, "")}. Finally, glue it in the designated place.`;
    }
  }

  return text
    .replace(/Finally,\s+Finally,/gi, "Finally,")
    .split("\n")
    .map((line) => line
      .replace(/\s+([,.!?])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .trim())
    .join("\n")
    .replace(/(?:\.\s*){2,}/g, ". ")
    .trim();
}

function getNumberedTranslationItems(text: string) {
  const normalized = prepareTextForTranslation(text);
  const numbered = normalized.match(/\d{1,2}\.\s*[\s\S]*?(?=\n\d{1,2}\.\s*|$)/g);
  if (numbered?.length) return numbered.map((item) => item.replace(/\s+/g, " ").trim());
  return normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function parseGeminiTranslationItems(raw: string) {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      const lines = parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
      if (lines.length) return lines.map(cleanTranslationMetaText);
    }
  } catch {
    // Gemini sometimes returns plain text despite the requested JSON format.
  }
  return normalizeTranslatedLineBreaks(cleaned).split("\n").map(cleanTranslationMetaText).filter(Boolean);
}

function isAcceptableTranslationResult(sourceItems: string[], translatedItems: string[], code: LanguageCode) {
  if (sourceItems.length > 0 && translatedItems.length !== sourceItems.length) return false;
  return translatedItems.every((item, index) => {
    const source = stripNoticeNumber(sourceItems[index] ?? "");
    const translated = stripNoticeNumber(item);
    if (!translated) return false;
    if (/Let's refine|Here(?:'s| is)|번역\s*:|Translation\s*:/i.test(translated)) return false;
    if (hasWrongLanguageLeakage(translated, code)) return false;
    if (source.length >= 24 && translated.length < 14) return false;
    if (/교실\s*규칙|우리\s*약속/.test(source) && !hasSharedAgreementMeaning(translated)) return false;
    if (/평화/.test(source) && /cộng đồng|community|共同体/i.test(translated) && !/peace|和平|hòa bình/i.test(translated)) return false;
    if (/친구.*약속|약속.*친구/.test(source) && !hasPromiseToFriendMeaning(translated, code)) return false;
    if (/깜짝\s*놀라게|놀라게\s*하지/.test(source) && !hasStartleMeaning(translated, code)) return false;
    return true;
  });
}

function hasWrongLanguageLeakage(text: string, code: LanguageCode) {
  const withoutNumbers = text.replace(/^\s*\d{1,2}\.\s*/, "").trim();
  if (code !== "ko" && /[가-힣]/.test(withoutNumbers)) return true;
  if (/[{}[\]`*_#]/.test(withoutNumbers)) return true;
  if (code !== "en" && /\b(?:translation|translate|here is|let's|refine|korean|english)\b/i.test(withoutNumbers)) return true;
  const latinLetterCount = (withoutNumbers.match(/[A-Za-z]/g) ?? []).length;
  const totalLetterCount = (withoutNumbers.match(/\p{L}/gu) ?? []).length || withoutNumbers.length;
  if (["zh", "ru", "km", "mn", "th", "ne", "my", "ja"].includes(code) && latinLetterCount / Math.max(totalLetterCount, 1) > 0.35) {
    return true;
  }
  return false;
}

function hasSharedAgreementMeaning(text: string) {
  return /agreement|promise|约定|約定|thỏa thuận|cam kết|lời hứa|약속/i.test(text);
}

function hasPromiseToFriendMeaning(text: string, code: LanguageCode) {
  const normalized = text.toLowerCase();
  const patterns: Partial<Record<LanguageCode, RegExp>> = {
    en: /promised\s+(?:our\s+)?friends|promise(?:s)?\s+to\s+(?:our\s+)?friends|what\s+we\s+promised/i,
    zh: /答应.*朋友|向朋友.*承诺|给朋友.*承诺|朋友.*约定/,
    vi: /hứa\s+với\s+bạn|đã\s+hứa\s+với\s+bạn|lời\s+hứa\s+với\s+bạn/i,
    mn: /амласан|амлалт/i
  };
  const pattern = patterns[code];
  if (pattern) return pattern.test(text);
  return /promise|promised|约|約|hứa|амласан|амлалт/i.test(normalized);
}

function hasStartleMeaning(text: string, code: LanguageCode) {
  const normalized = text.toLowerCase();
  const patterns: Partial<Record<LanguageCode, RegExp>> = {
    en: /startl|surpris|scare/i,
    zh: /吓|驚|惊|受惊/,
    vi: /giật\s*mình|làm\s+bạn.*sợ|làm\s+bạn.*hoảng/i,
    mn: /цочроох|айлган|гайхшруулах/i
  };
  const pattern = patterns[code];
  if (pattern) return pattern.test(text);
  return /startl|surpris|scare|吓|惊|驚|giật|цочроох|айлган/i.test(normalized);
}

function applyKnownTranslationOverrides(sourceItems: string[], translatedItems: string[], code: LanguageCode) {
  const next = translatedItems.slice();
  sourceItems.forEach((sourceItem, index) => {
    const source = stripNoticeNumber(sourceItem);
    const override = knownTranslationOverride(source, code);
    if (override) next[index] = `${index + 1}. ${override}`;
  });
  return next;
}

function knownTranslationOverride(source: string, code: LanguageCode) {
  const normalized = source.replace(/\s+/g, " ").trim();
  if (/국제\s*평화의\s*날/.test(normalized) && /평화/.test(normalized)) {
    const peaceTranslations: Partial<Record<LanguageCode, string>> = {
      en: "International Day of Peace: Remember people who worked for peace.",
      zh: "国际和平日：铭记为和平而努力的人们。",
      vi: "Ngày Quốc tế Hòa bình: Ghi nhớ những người đã nỗ lực vì hòa bình.",
    };
    return peaceTranslations[code];
  }
  if (/교실\s*규칙은\s*선생님만의\s*규칙이\s*아니라\s*우리\s*약속으로\s*생각하기/.test(normalized)) {
    const ruleTranslations: Partial<Record<LanguageCode, string>> = {
      en: "Think of classroom rules as our shared agreement, not just the teacher's rules.",
      zh: "把班级规则看作我们共同的约定，而不只是老师的规定。",
      vi: "Hãy xem nội quy lớp học là thỏa thuận chung của chúng ta, chứ không chỉ là quy định của giáo viên.",
    };
    return ruleTranslations[code];
  }
  if (/사회\s*복지의\s*날/.test(normalized) && /친구.*놀라게|놀라게.*친구/.test(normalized)) {
    const socialWelfareTranslations: Partial<Record<LanguageCode, string>> = {
      en: "Social Welfare Day: Not startling our friends with our words or actions.",
      zh: "社会福利日：不因自己的言语或行为吓到朋友。",
      vi: "Ngày Phúc lợi xã hội: Không làm bạn bè giật mình bằng lời nói hay hành động.",
      mn: "Нийгмийн халамжийн өдөр: Үг, үйлдлээрээ найзуудаа цочроохгүй байх."
    };
    return socialWelfareTranslations[code];
  }
  if (/친구.*약속.*잊지.*실천|약속.*잊지.*실천.*친구/.test(normalized)) {
    const promiseTranslations: Partial<Record<LanguageCode, string>> = {
      en: "Remembering to do what we promised our friends.",
      zh: "记得做到答应朋友的事情。",
      vi: "Nhớ thực hiện những việc đã hứa với bạn bè.",
      mn: "Найзууддаа амласан зүйлээ марталгүй биелүүлэх."
    };
    return promiseTranslations[code];
  }
  return "";
}

function cleanTranslationMetaText(text: string) {
  return text
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/^Let's\s+refine.*$/gim, "")
    .replace(/^Here(?:'s| is).*$/gim, "")
    .replace(/^Translation\s*:?\s*$/gim, "")
    .replace(/^번역\s*:?\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTranslatedLineBreaks(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+(\d{1,2}\.\s*)/g, "\n$1")
    .replace(/([.!?。！？])\s*(\d{1,2}\.\s*)/g, "$1\n$2")
    .replace(/([A-Za-zÀ-ỹА-Яа-я])(\d{1,2}\.\s*)/g, "$1\n$2")
    .replace(/([가-힣一-龥ぁ-んァ-ン])(\d{1,2}\.\s*)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function formatTranslationForDisplay(text: string) {
  return normalizeTranslatedLineBreaks(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function fallbackToKorean(message: string) {
  settings.readingLanguage = "ko";
  saveSettings();
  translationStatus = "error";
  translatedText = "";
  translationPanel.hidden = true;
  setTranslationStatusMessage(message, "error");
  updateLanguageButtons();
  showToast(message);
}

function languageLabel(code: LanguageCode) {
  return languages.find((language) => language.code === code)?.koName ?? "한국어";
}

function readTranslatedText(code: LanguageCode) {
  if (!translatedText) return;
  const language = languages.find((item) => item.code === code);
  const voice = pickVoiceForLanguage(code);
  if (code !== "ko" && !voice) {
    showToast(`${languageLabel(code)} 목소리가 이 기기에 없어 번역문만 표시합니다.`);
    return;
  }
  speakLines(translatedText, language?.speechCode ?? "ko-KR", voice, translationResultText);
}

function pickVoiceForLanguage(code: LanguageCode) {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (code === "ko") {
    const koreanChoices = pickKoreanVoiceChoices(voices);
    return (settings.koreanVoiceGender === "male" ? koreanChoices.male : koreanChoices.female)
      ?? voices.find((voice) => voice.voiceURI === settings.voiceURI);
  }
  const language = languages.find((item) => item.code === code);
  const preferred = language?.speechCode.toLowerCase() ?? "";
  const prefix = preferred.split("-")[0];
  const languageVoices = voices.filter((voice) =>
    voice.lang.toLowerCase() === preferred || voice.lang.toLowerCase().startsWith(prefix)
  );
  return pickVoiceByGender(languageVoices, settings.koreanVoiceGender)
    ?? languageVoices[0];
}

function pickVoiceByGender(voices: SpeechSynthesisVoice[], gender: KoreanVoiceGender) {
  return pickBestVoiceByGender(voices, gender);
}

function pickBestVoiceByGender(voices: SpeechSynthesisVoice[], gender: KoreanVoiceGender) {
  return voices
    .filter((voice) => inferVoiceGender(voice) === gender)
    .sort((a, b) => scoreVoicePreference(b, gender) - scoreVoicePreference(a, gender))[0];
}

function pickBestLikelyKoreanFemaleVoice(voices: SpeechSynthesisVoice[], male?: SpeechSynthesisVoice) {
  return voices
    .filter((voice) => voice.voiceURI !== male?.voiceURI)
    .filter((voice) => !isClearlyMaleVoice(voice))
    .sort((a, b) => scoreVoicePreference(b, "female") - scoreVoicePreference(a, "female"))[0];
}

function scoreVoicePreference(voice: SpeechSynthesisVoice, gender: KoreanVoiceGender) {
  const value = `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase();
  let score = 0;
  if (value.includes("natural")) score += 110;
  if (value.includes("neural")) score += 100;
  if (value.includes("online")) score += 90;
  if (value.includes("microsoft")) score += 42;
  if (value.includes("google")) score += 38;
  if (!voice.localService) score += 30;
  if (gender === "female") {
    if (/sunhi|sun hi|sun-hi|선희|서현|서연|유미|yumi|seohyeon|seo hyeon|seoyeon|seo yeon|jimin|ji min|yujin|yu jin|soonbok|soon bok|소연|민서|수진|지민|유진/i.test(value)) score += 95;
    if (/heami|haemi|혜미/i.test(value)) score -= 85;
    if (isClearlyMaleVoice(voice)) score -= 220;
  } else {
    if (/injoon|in joon|bongjin|bong jin|gookmin|gook min|민준|준서|지훈|현우/i.test(value)) score += 90;
    if (isClearlyFemaleVoice(voice)) score -= 220;
  }
  return score;
}

function isClearlyFemaleVoice(voice: SpeechSynthesisVoice) {
  return inferVoiceGender(voice) === "female";
}

function isClearlyMaleVoice(voice: SpeechSynthesisVoice) {
  return inferVoiceGender(voice) === "male";
}

function inferVoiceGender(voice: SpeechSynthesisVoice): KoreanVoiceGender | "unknown" {
  const value = `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase();
  const femalePattern = [
    "female", "woman", "여", "여성", "zira", "susan", "samantha", "victoria", "karen",
    "heami", "sunhi", "hana", "ari", "유미", "서연", "xiaoxiao", "xiaoyi", "xiaobei",
    "xiaoni", "xiaorou", "xiaoqiu", "hsiaochen", "hsiaoyu", "jenny", "aria", "michelle",
    "emma", "ava", "libby", "sonia", "natasha", "clara", "hoaimy", "hoài my",
    "madina", "svetlana", "dariya", "sreymom", "yesui", "premwadee", "achara",
    "suthida", "gadis", "nanami", "aoi", "mayu", "ayumi", "haruka", "blessica",
    "seohyeon", "seo hyeon", "seoyeon", "seo yeon", "jimin", "ji min", "yujin",
    "yu jin", "soonbok", "soon bok", "선희", "서현", "지민", "유진", "소연", "민서", "수진"
  ];
  const malePattern = [
    "male", "man", "남", "남성", "mark", "david", "george", "daniel", "alex", "fred",
    "injoon", "hoon", "jun", "yong", "민준", "준", "yunxi", "yunyang", "yunjian",
    "yunye", "yunfeng", "yunhao", "guy", "ryan", "brian", "christopher", "eric",
    "roger", "tony", "namminh", "nam minh", "sardor", "dmitry", "maxim", "piseth",
    "bataa", "niwat", "ardi", "keita", "ichiro", "naoki", "angelo", "bongjin",
    "bong jin", "gookmin", "gook min", "준서", "지훈", "현우"
  ];
  if (femalePattern.some((token) => value.includes(token))) return "female";
  if (malePattern.some((token) => value.includes(token))) return "male";
  return "unknown";
}

function switchBoardMode(nextMode: BoardMode) {
  if (nextMode === activeBoardMode) return;
  saveDocument();
  stopReading();
  resetTranslationState();
  activeBoardMode = nextMode;
  localStorage.setItem(STORAGE_ACTIVE_MODE, activeBoardMode);
  loadActiveBoardContent();
}

function loadActiveBoardContent() {
  isApplyingEditorContent = true;
  if (activeBoardMode === "notice") {
    const data = loadOrInitializeNoticeData(currentDateKey);
    editor.innerText = composeNoticeText(data.items);
    autoSaveText.textContent = "자동 저장됨";
  } else {
    editor.innerHTML = localStorage.getItem(STORAGE_GENERAL_BOARD) || loadLegacyBoardHtml();
    autoSaveText.textContent = "자동 저장됨";
  }
  isApplyingEditorContent = false;
  updateModeUi();
  updateCounts();
  scheduleNoticeAutoFit();
}

function switchNoticeDate(dateKey: string) {
  const normalizedDate = normalizeDateKey(dateKey);
  if (!normalizedDate || normalizedDate === currentDateKey) {
    updateModeUi();
    return;
  }
  saveDocument();
  stopReading();
  resetTranslationState();
  currentDateKey = normalizedDate;
  localStorage.setItem(STORAGE_SELECTED_NOTICE_DATE, currentDateKey);
  loadActiveBoardContent();
  showToast(`${currentDateKey} 알림장을 열었습니다.`);
}

function moveNoticeDate(delta: number) {
  const date = parseDateKey(currentDateKey);
  date.setDate(date.getDate() + delta);
  switchNoticeDate(getDateKey(date));
}

function updateModeUi() {
  shell.dataset.boardMode = activeBoardMode;
  document.querySelectorAll<HTMLButtonElement>("[data-board-mode]").forEach((button) => {
    const selected = button.dataset.boardMode === activeBoardMode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  const isNotice = activeBoardMode === "notice";
  noticeDateInput.value = currentDateKey;
  noticeNavigator.hidden = !isNotice;
  const firstDefaultItem = getDefaultNoticeItem(currentDateKey, 1);
  const secondDefaultItem = getDefaultNoticeItem(currentDateKey, 2);
  const noticeItems = getNoticeItemsFromEditor();
  defaultMessageToggles.hidden = !isNotice || (!firstDefaultItem && !secondDefaultItem);
  defaultFirstCheck.disabled = !isNotice || !firstDefaultItem;
  defaultSecondCheck.disabled = !isNotice || !secondDefaultItem;
  defaultFirstCheck.checked = Boolean(firstDefaultItem) && noticeItems.includes(firstDefaultItem);
  defaultSecondCheck.checked = Boolean(secondDefaultItem) && noticeItems.includes(secondDefaultItem);
  editor.dataset.placeholder = isNotice
    ? getNonSchoolDayBoardText(currentDateKey) || "알림장 내용을 번호로 입력하세요."
    : "자유롭게 칠판 내용을 입력하세요.";
  updateDate();
}

function resetTranslationState() {
  translationRequestId += 1;
  translatedText = "";
  translationPanel.hidden = true;
  translationResultText.textContent = "";
  translationNotice.textContent = "";
  setTranslationStatusMessage("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getMonthDayKey(date: string | Date) {
  const parsed = typeof date === "string" ? parseDateKey(date) : date;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function normalizeDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "";
  const parsed = parseDateKey(dateKey);
  return getDateKey(parsed) === dateKey ? dateKey : "";
}

function getConfiguredNonSchoolDates(year: number) {
  const calendar = schoolCalendar as SchoolCalendarData;
  const entry = calendar.years[String(year)];
  return new Set([
    ...(entry?.official_non_school_dates ?? []),
    ...(entry?.school_specific_non_school_dates ?? []),
  ]);
}

function getDefaultNoticeMessage(dateKey: string) {
  const year = parseDateKey(dateKey).getFullYear();
  const selection = selectMessage1Message(
    (message1Db as { messages: Message1Entry[] }).messages,
    dateKey,
    getConfiguredNonSchoolDates(year),
  );
  return selection.selected?.display_text ?? "";
}

function getDailyNoticeEntry(dateKey: string) {
  const data = dailyNoticeMessages as DailyNoticeMessages;
  const monthDay = getMonthDayKey(dateKey);
  const repeatedYearKey = `2026-${monthDay}`;
  return data.dynamic_overrides?.[dateKey]
    ?? data.daily_messages?.[dateKey]
    ?? data.daily_messages?.[repeatedYearKey]
    ?? data.daily_messages?.[monthDay];
}

function stripNoticeNumber(value: string) {
  return value
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

function normalizeNoticeItemText(value: string) {
  let text = stripNoticeNumber(value).replace(/\s+/g, " ").trim();
  const prefixPattern = /^(차분하게|오늘의 안전 약속|우리 반 안전 습관|함께 지키기|하루 동안 기억하기|스스로 확인하기|쉬는 시간에도|이동할 때|필요할 때 기억하기|오늘의 실천|우리 반 약속|스스로 해보기|말과 행동으로)\s*[:：]\s*/u;
  while (prefixPattern.test(text)) text = text.replace(prefixPattern, "").trim();
  const replacements: Record<string, string> = {
    "친구와 한 약속은 끝까지 지키기": "함께 정한 차례를 서로 확인하기",
    "친구와 한 약속을 지키기": "함께 정한 차례를 서로 확인하기",
    "도움이 필요할 때 차분하게 요청하기": "도움이 필요하면 필요한 부분을 말하기",
    "서운한 마음은 직접 차분하게 말하기": "속상한 마음은 이유와 함께 말하기",
    "자전거나 킥보드 이용 시 안전모 쓰기": "교실과 복도에서는 앞을 보며 걷기",
    "경기 중 넘어졌거나 다치면 바로 손을 들고 알리기": "놀이하다 다치면 참지 말고 바로 선생님께 알리기",
    "학교 밖에서도 우리 반을 대표하는 마음 갖기": "함께 쓰는 물건은 사용한 뒤 제자리에 두기",
    "행사가 끝나면 사용한 자리를 함께 정리하기": "활동이 끝나면 사용한 자리를 스스로 정리하기",
    "행사 준비는 맡은 역할을 확인하고 참여하기": "활동 준비는 맡은 역할을 확인하고 참여하기",
    "새로 온 친구에게 교실 사용 방법 알려주기": "친구에게 교실 물건 사용 방법 친절하게 알려주기",
    "다른 사람 물건을 볼 때 먼저 허락 구하기": "다른 사람의 물건은 먼저 허락받고 사용하기"
  };
  return replacements[text] ?? text;
}

function getBlockedDefaultNoticeItems() {
  const blocked = new Set<string>();
  const collect = (items: DefaultMessageLike[]) => {
    items.forEach((item) => {
      if (item.active) return;
      const text = stripNoticeNumber(item.message || item.display_text || "");
      if (text) blocked.add(text);
    });
  };
  collect((message1Db as { messages: DefaultMessageLike[] }).messages);
  collect((schoolLifeMessageDb as { messages: DefaultMessageLike[] }).messages);
  return blocked;
}

const blockedDefaultNoticeItems = getBlockedDefaultNoticeItems();

function normalizeLoadedNoticeItems(items: string[]) {
  return items
    .map((item) => normalizeNoticeItemText(item))
    .filter((item) => item && !blockedDefaultNoticeItems.has(item));
}

function normalizeLoadedNoticeData(data: NoticeDayData, dateKey: string) {
  const normalizedItems = isNonSchoolDate(dateKey) && data.items.every((item) => !item)
    ? []
    : normalizeLoadedNoticeItems(data.items);
  const items = data.defaultMessageModified
    ? normalizedItems
    : [
      ...buildInitialNoticeItems(getDefaultNoticeItem(dateKey, 1), getDefaultNoticeItem(dateKey, 2)),
      ...normalizedItems.slice(2),
    ];
  const changed = items.length !== data.items.length || items.some((item, index) => item !== data.items[index]);
  if (!changed) return data;
  const migrated: NoticeDayData = {
    ...data,
    items,
    updatedAt: new Date().toISOString(),
    version: 3,
  };
  saveNoticeData(migrated, false);
  return migrated;
}

function getDefaultNoticeItem(dateKey: string, slot: 1 | 2) {
  if (isNonSchoolDate(dateKey)) return "";
  const text = slot === 1 ? getDefaultNoticeMessage(dateKey) : getSocialRelationshipMessage(dateKey);
  return stripNoticeNumber(text);
}

function isNonSchoolDate(dateKey: string) {
  const year = parseDateKey(dateKey).getFullYear();
  return isNonSchoolDateKey(dateKey, getConfiguredNonSchoolDates(year));
}

function getHolidayName(dateKey: string) {
  if (holidayNamesByDate[dateKey]) return holidayNamesByDate[dateKey];
  const calendar = schoolCalendar as SchoolCalendarData;
  const year = String(parseDateKey(dateKey).getFullYear());
  const entry = calendar.years[year];
  if (entry?.school_specific_non_school_dates.includes(dateKey)) return "학교 휴업일";
  if (entry?.official_non_school_dates.includes(dateKey)) return "공휴일";
  return "";
}

function getDateLabelParts(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  const weekday = getKoreanWeekday(dateKey);
  const holiday = getHolidayName(dateKey);
  const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;
  return {
    weekday,
    holiday,
    isWeekend,
    specialLabel: [weekday, holiday].filter(Boolean).join(" · ")
  };
}

function getNonSchoolDayBoardText(dateKey: string) {
  if (!isNonSchoolDate(dateKey)) return "";
  const { specialLabel } = getDateLabelParts(dateKey);
  return specialLabel ? `오늘은 ${specialLabel}입니다.` : "오늘은 학교 쉬는 날입니다.";
}

function getSocialRelationshipMessage(dateKey: string) {
  const message = getDailyNoticeEntry(dateKey);
  if (message?.message_2) return message.message_2;
  const data = schoolLifeMessageDb as SchoolLifeMessageDb;
  const history = loadSchoolMessageHistory();
  const weekday = getKoreanWeekday(dateKey);
  const month = parseDateKey(dateKey).getMonth() + 1;
  const contextNotice = getDailyNoticeEntry(dateKey);
  const contextSource = [contextNotice?.event, contextNotice?.text, contextNotice?.message_1]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const { activeTriggers, activeContexts, conflictMode } = deriveSchoolLifeSelectionContext(month, contextSource);
  const selection = selectSchoolLifeMessage({
    messages: data.messages,
    policy: data.selection_policy,
    history,
    dateKey,
    weekday,
    month,
    activeTriggers,
    activeContexts,
    conflictMode
  });
  if (!selection.selected) return "";
  saveSchoolMessageHistory(selection.history);
  return selection.selected.display_text;
}

function buildInitialNoticeItems(firstDefaultItem: string, secondDefaultItem: string) {
  if (!firstDefaultItem && !secondDefaultItem) return [];
  return [firstDefaultItem, secondDefaultItem].filter((item, index) => index === 0 || item);
}

function noticeKey(dateKey: string) {
  return `${NOTICE_PREFIX}${dateKey}`;
}

function loadNoticeData(dateKey: string) {
  return readJson<NoticeDayData>(noticeKey(dateKey));
}

function loadOrInitializeNoticeData(dateKey: string) {
  const saved = loadNoticeData(dateKey);
  if (saved?.initialized) {
    if (saved.version === 3) return normalizeLoadedNoticeData(saved, dateKey);
    if (saved.version === 2) {
      const migrated: NoticeDayData = {
        ...saved,
        items: isNonSchoolDate(dateKey) && saved.items.every((item) => !item)
          ? []
          : normalizeLoadedNoticeItems(saved.items),
        updatedAt: new Date().toISOString(),
        version: 3,
      };
      saveNoticeData(migrated, false);
      return migrated;
    }
    const migrated: NoticeDayData = {
      ...saved,
      items: saved.defaultMessageModified
        ? normalizeLoadedNoticeItems(saved.items)
        : [...buildInitialNoticeItems(getDefaultNoticeItem(dateKey, 1), getDefaultNoticeItem(dateKey, 2)), ...saved.items.slice(2)],
      updatedAt: new Date().toISOString(),
      version: 3,
    };
    saveNoticeData(migrated, false);
    return migrated;
  }
  const firstDefaultItem = getDefaultNoticeItem(dateKey, 1);
  const secondDefaultItem = getDefaultNoticeItem(dateKey, 2);
  const data: NoticeDayData = {
    date: dateKey,
    items: buildInitialNoticeItems(firstDefaultItem, secondDefaultItem),
    initialized: true,
    defaultMessageApplied: Boolean(firstDefaultItem || secondDefaultItem),
    defaultMessageModified: false,
    updatedAt: new Date().toISOString(),
    version: 3
  };
  saveNoticeData(data, false);
  if (!firstDefaultItem && !secondDefaultItem && !isNonSchoolDate(dateKey)) {
    showToast("오늘의 자동 문구를 불러오지 못했습니다.");
  }
  return data;
}

function getNoticeItemsFromEditor() {
  const text = getPlainText();
  if (!text) return [""];
  return text.split(/\n+/).map(stripNoticeNumber);
}

function composeNoticeText(items: string[]) {
  if (items.length === 0) return "";
  return items.map((item, index) => `${index + 1}. ${item}`.trimEnd()).join("\n");
}

function applyPlainTextToEditor(text: string) {
  const lines = text.split(/\n+/).map((line) => stripNoticeNumber(line)).filter(Boolean);
  if (activeBoardMode === "notice") {
    editor.innerText = composeNoticeText(lines);
    return;
  }
  editor.innerText = lines.join("\n");
}

function saveNoticeData(data: NoticeDayData, updateStatus = true) {
  localStorage.setItem(noticeKey(data.date), JSON.stringify(data));
  if (updateStatus) {
    const savedAt = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    autoSaveText.textContent = `자동 저장됨 · ${savedAt}`;
  }
}

function documentKey(dateKey: string) {
  return `${DOCUMENT_PREFIX}${dateKey}`;
}

function loadDocumentForDate(dateKey: string) {
  return readJson<SavedDocument>(documentKey(dateKey)) ?? readJson<SavedDocument>(STORAGE_LEGACY_DOCUMENT);
}

function checkDateRollover() {
  const nextDateKey = getKoreanToday();
  updateDate();
  if (nextDateKey === todayDateKey) return;
  const wasShowingToday = currentDateKey === todayDateKey;
  todayDateKey = nextDateKey;
  if (wasShowingToday && activeBoardMode === "notice") {
    saveDocument();
    currentDateKey = todayDateKey;
    localStorage.setItem(STORAGE_SELECTED_NOTICE_DATE, currentDateKey);
    loadActiveBoardContent();
  }
  updateModeUi();
}

function updateDate() {
  const now = parseDateKey(currentDateKey);
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const { specialLabel } = getDateLabelParts(currentDateKey);
  dateHeader.textContent = settings.dateFormat === "full"
    ? `${now.getFullYear()}년 ${month}월 ${date}일 ${specialLabel}`
    : `${month}월 ${date}일 ${specialLabel}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function setMode(next: AppMode) {
  mode = next;
  shell.dataset.mode = next;
  statusText.textContent = next === "idle" ? "" : statusLabel(next);
  const isReading = next === "reading" || next === "paused";
  const pauseButton = query<HTMLButtonElement>("#pauseButton");
  pauseButton.disabled = !isReading;
  pauseButton.textContent = next === "paused" ? "계속 읽기" : "일시정지";
  query<HTMLButtonElement>("#stopButton").disabled = !isReading;
  query<HTMLButtonElement>("#readAllButton").disabled = isReading;
  const micButton = query<HTMLButtonElement>("#micButton");
  micButton.textContent = next === "recording" ? "녹음 종료" : "음성 입력";
  micButton.classList.toggle("danger", next === "recording");
  if (next === "completed") window.setTimeout(() => setMode("idle"), 900);
}

function statusLabel(value: AppMode) {
  const map: Record<AppMode, string> = {
    idle: "준비",
    editing: "입력 중",
    recording: "녹음 중",
    converting: "변환 중",
    reading: currentLineIndex >= 0 ? `읽는 중 · ${currentLineIndex + 1} / ${readingLines.length}줄` : "읽는 중",
    paused: "일시정지",
    saving: "저장 중",
    completed: "완료",
    error: "오류 발생"
  };
  return map[value];
}

function getPlainText() {
  return editor.innerText.replace(/\u00a0/g, " ").trim();
}

function updateCounts() {
  const text = getPlainText();
  const lines = text ? text.split(/\n+/).filter((line) => line.trim()).length : 0;
  countText.textContent = activeBoardMode === "notice" ? `${lines}개 문구` : `글자 ${text.length} · 줄 ${lines}`;
}

function scheduleSave() {
  if (!settings.autoSave) return;
  window.clearTimeout(saveTimer);
  autoSaveText.textContent = "저장 중...";
  saveTimer = window.setTimeout(saveDocument, 700);
}

function saveDocument() {
  setMode("saving");
  try {
    if (activeBoardMode === "notice") {
      const firstDefaultItem = getDefaultNoticeItem(currentDateKey, 1);
      const secondDefaultItem = getDefaultNoticeItem(currentDateKey, 2);
      const editorItems = getNoticeItemsFromEditor();
      const items = isNonSchoolDate(currentDateKey) && editorItems.every((item) => !item) ? [] : editorItems;
      const data: NoticeDayData = {
        date: currentDateKey,
        items,
        initialized: true,
        defaultMessageApplied: Boolean(firstDefaultItem || secondDefaultItem),
        defaultMessageModified: (Boolean(firstDefaultItem) && (items[0] ?? "") !== firstDefaultItem)
          || (Boolean(secondDefaultItem) && (items[1] ?? "") !== secondDefaultItem),
        updatedAt: new Date().toISOString(),
        version: 3
      };
      saveNoticeData(data);
    } else {
      localStorage.setItem(STORAGE_GENERAL_BOARD, editor.innerHTML);
      const savedAt = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      autoSaveText.textContent = `자동 저장됨 · ${savedAt}`;
    }
    setMode("completed");
  } catch (error) {
    console.error("Save failed", error);
    autoSaveText.textContent = "저장 실패";
    setMode("error");
    showToast("저장에 실패했습니다. 작성 내용은 화면에 유지됩니다.");
  }
}

function changeFontSize(delta: number) {
  const size = clamp(Math.round((getEditorFontSize() + delta) / 10) * 10, 20, 180);
  settings.noticeAutoFit = false;
  runCommand("fontSize", "7");
  document.querySelectorAll<HTMLElement>("font[size='7']").forEach((node) => {
    node.removeAttribute("size");
    node.style.fontSize = `${size}px`;
  });
  editor.style.fontSize = `${size}px`;
  settings.defaultFontSize = size;
  saveSettings();
  query<HTMLOutputElement>("#fontSizeValue").value = String(size);
  scheduleSave();
  updateModeUi();
}

function getEditorFontSize() {
  return Number.parseInt(window.getComputedStyle(editor).fontSize, 10) || settings.defaultFontSize;
}

function changeLineHeight(delta: number) {
  settings.lineHeight = clamp(Number((Math.round((settings.lineHeight + delta) * 10) / 10).toFixed(2)), 1, 2.2);
  editor.style.lineHeight = String(settings.lineHeight);
  query<HTMLSelectElement>("#lineHeightSelect").value = getLineHeightPreset(settings.lineHeight);
  saveSettings();
  scheduleSave();
}

function runCommand(command: string, value?: string) {
  editor.focus();
  document.execCommand(command, false, value);
  updateCounts();
  scheduleSave();
  scheduleNoticeAutoFit();
}

function startReading(text: string) {
  if (settings.readingLanguage !== "ko") {
    selectReadingLanguage(settings.readingLanguage);
    return;
  }
  const voice = pickVoiceForLanguage("ko");
  speakLines(text, "ko-KR", voice, editor);
}

function speakLines(text: string, lang: string, voice?: SpeechSynthesisVoice, highlightRoot: HTMLElement = editor) {
  const lines = splitReadableLines(text, lang);
  if (!lines.length) {
    showToast("읽을 내용이 없습니다.");
    return;
  }
  if (!("speechSynthesis" in window)) {
    showToast("사용 가능한 읽기 음성을 찾지 못했습니다.");
    return;
  }
  stopReading();
  readingLines = lines;
  currentLineIndex = -1;
  currentRepeat = 1;
  isPaused = false;
  readingLang = lang;
  readingVoiceURI = voice?.voiceURI ?? "";
  readingHighlightRoot = highlightRoot;
  setMode("reading");
  readNextLine(true);
}

function splitReadableLines(text: string, lang = "ko-KR") {
  const normalized = text.replace(/\s+(?=\d+\.\s)/g, "\n");
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lang.toLowerCase().startsWith("ko")) {
    return lines.flatMap(splitForeignSpeechLine);
  }
  return lines.flatMap((line) => splitLongSpeechLine(line));
}

function splitForeignSpeechLine(line: string) {
  if (line.length <= 180) return [line];
  const sentenceParts = line.split(/(?<=[.!?。！？])\s+/).map((part) => part.trim()).filter(Boolean);
  if (sentenceParts.length > 1) return sentenceParts;
  const softParts = line.split(/(?<=[,;:])\s+/).map((part) => part.trim()).filter(Boolean);
  if (softParts.length > 1) return mergeSpeechParts(softParts, 150);
  return [line];
}

function splitLongSpeechLine(line: string) {
  const prepared = line
    .replace(/\s+(그리고|그다음|다음|먼저|마지막으로|또|이후에는|그 이후에는)\s+/g, "\n$1 ")
    .replace(/\s+(그 이후|이후)\s+/g, "\n$1 ");
  const sentences = prepared.split(/\n+|(?<=[.!?。！？])\s+/).map((part) => part.trim()).filter(Boolean);
  const result: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= 54) {
      result.push(sentence);
      continue;
    }
    let current = "";
    for (const word of sentence.split(/\s+/)) {
      if ((current + " " + word).trim().length > 54 && current) {
        result.push(current.trim());
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) result.push(current.trim());
  }
  return result;
}

function mergeSpeechParts(parts: string[], maxLength: number) {
  const merged: string[] = [];
  let current = "";
  for (const part of parts) {
    const next = `${current} ${part}`.trim();
    if (next.length > maxLength && current) {
      merged.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) merged.push(current);
  return merged;
}

function readNextLine(advance = true) {
  if (isPaused) return;
  if (advance) currentLineIndex += 1;
  if (currentLineIndex >= readingLines.length) {
    currentRepeat += 1;
    if (currentRepeat > settings.repeat) {
      stopReading(true);
      return;
    }
    currentLineIndex = 0;
  }
  highlightLine(readingLines[currentLineIndex]);
  const voice = getReadingVoice();
  const utterance = new SpeechSynthesisUtterance(readingLines[currentLineIndex]);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || readingLang;
  const tuning = getVoiceTuning(voice);
  utterance.rate = getSpeechRate() * tuning.rateMultiplier;
  utterance.pitch = tuning.pitch;
  utterance.volume = speechVolumeFromSlider(settings.volume * 100);
  utterance.onend = () => {
    if (isRestartingSpeech) return;
    window.setTimeout(() => readNextLine(true), 280);
  };
  utterance.onerror = () => {
    if (isRestartingSpeech || isStoppingSpeech || isPaused) return;
    clearHighlights();
    setMode("error");
    showToast("읽기 중 오류가 발생했습니다.");
  };
  window.speechSynthesis.speak(utterance);
  setMode("reading");
}

function getSpeechRate() {
  return { slow: 0.68, normal: 0.88, fast: 1.05 }[settings.speed];
}

function getVoiceTuning(voice?: SpeechSynthesisVoice) {
  const value = voice ? `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase() : "";
  const isKorean = readingLang.toLowerCase().startsWith("ko") || value.includes("ko-");
  if (isKorean && settings.koreanVoiceGender === "female") {
    return { pitch: 0.92, rateMultiplier: 0.94 };
  }
  return { pitch: 1.02, rateMultiplier: 1 };
}

function getReadingVoice() {
  if (!readingVoiceURI) return undefined;
  return (window.speechSynthesis?.getVoices?.() ?? []).find((voice) => voice.voiceURI === readingVoiceURI);
}

function restartCurrentSpeech() {
  if (mode !== "reading" || currentLineIndex < 0 || !readingLines.length) return;
  isRestartingSpeech = true;
  window.speechSynthesis.cancel();
  window.setTimeout(() => {
    isRestartingSpeech = false;
    if (mode === "reading") readNextLine(false);
  }, 80);
}

function highlightLine(text: string) {
  clearHighlights();
  const root = readingHighlightRoot ?? editor;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = node.textContent ?? "";
    const index = value.indexOf(text);
    if (index >= 0) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      const mark = document.createElement("mark");
      mark.className = "reading-highlight";
      range.surroundContents(mark);
      mark.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    node = walker.nextNode();
  }
}

function clearHighlights() {
  [editor, translationResultText].forEach((root) => root.querySelectorAll("mark.reading-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
    parent?.removeChild(mark);
    parent?.normalize();
  }));
}

function togglePause() {
  if (mode === "paused") {
    isPaused = false;
    window.speechSynthesis.resume();
    setMode("reading");
    return;
  }
  if (mode === "reading") {
    isPaused = true;
    window.speechSynthesis.pause();
    setMode("paused");
  }
}

function stopReading(completed = false) {
  isStoppingSpeech = true;
  window.speechSynthesis?.cancel();
  clearHighlights();
  readingLines = [];
  readingHighlightRoot = null;
  currentLineIndex = -1;
  isPaused = false;
  readingLang = "ko-KR";
  readingVoiceURI = "";
  isRestartingSpeech = false;
  setMode(completed ? "completed" : "idle");
  window.setTimeout(() => {
    isStoppingSpeech = false;
  }, 120);
}

function toggleRecording() {
  if (mode === "recording") {
    stopRecording();
    return;
  }
  startRecording();
}

async function startRecording() {
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
  if (!navigator.mediaDevices?.getUserMedia && !SpeechRecognitionConstructor) {
    showRecordingFallback("이 브라우저에서는 마이크 녹음이나 음성 인식을 시작할 수 없습니다.");
    return;
  }
  try {
    recordedChunks = [];
    recognitionFinalText = "";
    recognitionInterimText = "";

    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      });
      mediaRecorder.start();
    }

    if (SpeechRecognitionConstructor) {
      speechRecognition = new SpeechRecognitionConstructor();
      speechRecognition.lang = "ko-KR";
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.maxAlternatives = 1;
      speechRecognition.onresult = handleSpeechRecognitionResult;
      speechRecognition.onerror = (event) => {
        recordingHelp.textContent = `음성 인식 오류가 발생했습니다: ${event.error ?? "알 수 없음"}`;
      };
      speechRecognition.onend = () => {
        if (mode === "recording") recordingHelp.textContent = "음성 인식이 잠시 멈췄습니다. 녹음을 종료하면 현재까지 인식한 내용을 정리합니다.";
      };
      speechRecognition.start();
    }

    recordingSeconds = 0;
    recordingOverlay.hidden = false;
    recordingTitle.textContent = "녹음 중";
    recordingHelp.textContent = SpeechRecognitionConstructor
      ? "마이크 입력을 받으며 말소리를 글자로 변환하고 있습니다."
      : "마이크 녹음은 진행되지만, 이 브라우저에는 음성 인식 기능이 없어 자동 변환은 어렵습니다.";
    setMode("recording");
    tickRecording();
    recordingTimer = window.setInterval(tickRecording, 1000);
  } catch (error) {
    const message = error instanceof DOMException && error.name === "NotAllowedError"
      ? "마이크 권한이 허용되지 않았습니다. 브라우저 주소창 또는 Windows 설정에서 마이크 권한을 허용해주세요."
      : "마이크를 시작하지 못했습니다. 다른 프로그램이 마이크를 사용 중인지 확인해주세요.";
    showRecordingFallback(message);
  }
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as WindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function handleSpeechRecognitionResult(event: SpeechRecognitionEventLike) {
  let interim = "";
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result[0]?.transcript ?? "";
    if (result.isFinal) recognitionFinalText += ` ${transcript}`;
    else interim += ` ${transcript}`;
  }
  recognitionInterimText = interim;
  const preview = polishClassroomText(`${recognitionFinalText} ${recognitionInterimText}`);
  recordingHelp.textContent = preview ? `인식 중: ${preview.slice(0, 80)}` : "말소리를 듣고 있습니다.";
}

function showRecordingFallback(message: string) {
  setMode("error");
  speechRawText = "";
  speechRawTextArea.value = "";
  speechResultText.value = "";
  speechHelpText.textContent = message;
  speechDialog.hidden = false;
  showToast(message);
}

function tickRecording() {
  const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, "0");
  const seconds = (recordingSeconds % 60).toString().padStart(2, "0");
  recordingTime.textContent = `${minutes}:${seconds}`;
  recordingSeconds += 1;
}

function stopRecording() {
  window.clearInterval(recordingTimer);
  speechRecognition?.stop();
  speechRecognition = null;
  mediaRecorder?.stop();
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  mediaStream = null;
  setMode("converting");
  recordingOverlay.hidden = true;
  recordingTitle.textContent = "녹음 완료";
  recordingHelp.textContent = "음성을 텍스트로 변환하고 있습니다.";
  setProcessingStatusMessage("음성을 텍스트로 변환 중입니다. | 조금만 기다려 주세요.");
  window.setTimeout(() => {
    void processSpeechAfterRecording();
  }, 700);
}

async function processSpeechAfterRecording() {
    speechRawText = `${recognitionFinalText} ${recognitionInterimText}`.replace(/\s+/g, " ").trim();
    setProcessingStatusMessage(settings.aiPolishSpeech && hasGeminiApiKey() && speechRawText
      ? "AI로 문장을 다듬는 중입니다. | 조금만 기다려 주세요."
      : "말한 내용을 다듬는 중입니다. | 조금만 기다려 주세요.");
    let recognizedText = polishClassroomText(speechRawText);
    let usedAi = false;
    if (settings.aiPolishSpeech && hasGeminiApiKey() && speechRawText) {
      speechHelpText.textContent = "Gemini API로 음성 인식 결과를 교실 안내문으로 정리하고 있습니다.";
      try {
        recognizedText = await polishClassroomTextWithGemini(speechRawText);
        usedAi = Boolean(recognizedText);
      } catch (error) {
        console.info("Gemini speech polish failed", error);
        recognizedText = polishClassroomText(speechRawText);
      }
    }
    recordingOverlay.hidden = true;
    setProcessingStatusMessage("");
    speechRawTextArea.value = speechRawText;
    speechResultText.value = recognizedText;
    speechHelpText.textContent = recognizedText
      ? usedAi
        ? "Gemini API로 선생님이 말한 내용을 최대한 살려 다듬었습니다. 필요하면 직접 수정한 뒤 본문에 넣어주세요."
        : "1차 인식 원문을 최대한 살려 다듬었습니다. 필요하면 직접 수정한 뒤 본문에 넣어주세요."
      : recordedChunks.length
        ? "녹음은 되었지만 이 브라우저에서 음성 인식 결과를 받지 못했습니다. 더 크게 말하거나 브라우저 음성 인식 지원을 확인해주세요."
        : "녹음 데이터가 없습니다. 마이크 권한을 확인한 뒤 다시 시도해주세요.";
    speechDialog.hidden = false;
    setMode("completed");
}

function polishClassroomText(rawText: string) {
  let text = rawText
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+([,.!?。！？])/g, "$1")
    .trim();

  if (!text) return "";

  text = refineKoreanSpeechCore(text);

  text = text
    .replace(/(\d+)\s*번\s*/g, "$1. ")
    .replace(/\s{2,}/g, " ")
    .trim();

  text = addSpeechSentenceBreaks(text);

  const sentenceParts = text
    .split(/(?<=[.!?。！？])\s+|(?<=\s후)\s+(?=다|친구|선생님|모둠|각자|함께)|(?:\s*(?:그리고|그다음|다음|마지막으로|또|그 이후에는|이후에는|그 이후|이후)\s*)/g)
    .map((part) => formatSentence(part))
    .filter(Boolean);

  return sentenceParts
    .flatMap((part) => splitLongSpeechLine(part))
    .map((part, index) => normalizeNumberedSentence(part, index))
    .join("\n");
}

async function polishClassroomTextWithGemini(rawText: string) {
  const prompt = [
    "당신은 초등학교 교사의 음성 메모와 칠판 문구를 알림장/칠판 안내문으로 정리하는 교정 도우미입니다.",
    "아래 내용은 브라우저 음성 인식 결과이거나 교사가 급하게 적은 문구라 오타, 잘못 들은 단어, 반복어가 섞여 있을 수 있습니다.",
    "목표는 요약이 아니라 보존입니다. 선생님이 말한 정보와 의도를 최대한 그대로 살리세요.",
    "",
    "정리 규칙:",
    "1. 내용을 줄이거나 요약하지 않습니다. 원문에 있는 장소, 대상, 시간, 순서, 행동, 부탁, 안내 멘트를 보존합니다.",
    "2. 삭제할 수 있는 것은 명백한 말더듬, 반복어, 시작/종료 안내, 음성 인식 잡음뿐입니다.",
    "3. 원문에 있는 문장이 여러 개면 결과도 여러 문장으로 유지합니다. 서로 다른 지시를 하나로 합치지 않습니다.",
    "4. 교실에서 학생에게 안내하는 자연스러운 한국어 문장으로만 오타와 조사, 어순을 고칩니다.",
    "5. 문장별로 줄을 나누고, 각 줄 끝에는 마침표를 붙입니다.",
    "6. 필요하면 1., 2., 3. 번호 목록으로 정리하되, 원문 정보량은 줄이지 않습니다.",
    "7. 교과서, 학습지, 공책, 연필, 네임펜, 풀, 색칠, 오리기, 붙이기 같은 교실 활동 문맥을 우선 고려합니다.",
    "8. 뜻이 불확실한 내용은 새로 지어내지 말고 원문에 가장 가까운 교실 표현으로만 다듬습니다.",
    "9. 학생 이름, 개인정보, 민감한 내용은 그대로 확장하지 않습니다.",
    "10. 결과 문장만 출력하고 설명은 쓰지 않습니다.",
    "",
    "나쁜 예:",
    "- 원문: '지금부터 녹음을 시작합니다. 녹음한 내용대로 행동으로 바로 옮겨 주기 바랍니다.'",
    "- 나쁜 결과: '안내하는 내용대로 바로 행동합니다.'",
    "- 이유: '지금부터', '녹음한 내용대로', '바로 옮겨 주기 바랍니다'의 말투와 정보가 과하게 삭제되었습니다.",
    "",
    "좋은 예:",
    "- 원문: '지금부터 녹음을 시작합니다. 녹음한 내용대로 행동으로 바로 옮겨 주기 바랍니다.'",
    "- 좋은 결과: '지금부터 안내를 시작합니다. 안내한 내용대로 바로 행동으로 옮겨 주세요.'",
    "",
    "자주 틀리는 예:",
    "- '습지를 해결합니다'는 보통 '학습지를 풉니다'입니다.",
    "- '교과서를 팝니다'는 보통 '교과서를 폅니다'입니다.",
    "- '종이를 다 뜯은 후'는 활동지나 종이를 떼어낸다는 뜻일 수 있습니다.",
    "- '풀'은 잔디가 아니라 접착제일 수 있습니다.",
    "- '나서 나서 나서' 같은 반복어는 제거합니다.",
    "",
    "원문:",
    rawText
  ].join("\n");
  const result = await callGeminiText(prompt, 1600, 0.1);
  const normalized = normalizeAiClassroomResult(result);
  return keepPolishedTextIfComplete(rawText, normalized);
}

function keepPolishedTextIfComplete(rawText: string, polishedText: string) {
  if (!polishedText.trim()) return polishClassroomText(rawText);
  const rawMeaningfulLength = rawText.replace(/\s+/g, "").length;
  const polishedMeaningfulLength = polishedText.replace(/\s+/g, "").length;
  if (rawMeaningfulLength >= 45 && polishedMeaningfulLength < rawMeaningfulLength * 0.55) {
    const fallback = polishClassroomText(rawText);
    return fallback.replace(/\s+/g, "").length > polishedMeaningfulLength ? fallback : polishedText;
  }
  return polishedText;
}

function normalizeAiClassroomResult(value: string) {
  const cleaned = value
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r/g, "")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean)
    .map((line, index) => normalizeNumberedSentence(line, index))
    .join("\n");
}

function refineKoreanSpeechCore(text: string) {
  const corrections: Array<[RegExp, string]> = [
    [/안녕하십니까\s*/g, ""],
    [/지금\s*바로\s*/g, ""],
    [/(\d+)\s*쪽을\s*교과서를\s*(?:팝니다|폅니다|펴세요|펴십시오)/g, "교과서 $1쪽을 폅니다"],
    [/교과서를\s*(\d+)\s*쪽(?:을)?\s*(?:팝니다|폅니다|펴세요|펴십시오)/g, "교과서 $1쪽을 폅니다"],
    [/(\d+)\s*쪽(?:을)?\s*(?:팝니다|폅니다|펴세요|펴십시오)/g, "$1쪽을 폅니다"],
    [/교과서를\s*(?:팝니다|폅니다)/g, "교과서를 폅니다"],
    [/습지를\s*해결합니다/g, "학습지를 풉니다"],
    [/학습지를\s*해결합니다/g, "학습지를 풉니다"],
    [/학습지를\s*풉니다/g, "학습지를 풉니다"]
  ];

  for (const [pattern, replacement] of corrections) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/(^|\s)(나서[.!?。！？]?\s*)+/g, "$1").replace(/\s{2,}/g, " ").trim();

  const parts = text
    .split(/(?<=[.!?。！？])\s+|\s+(?=교과서|학습지|책|공책|활동지|문제|먼저|다음|그리고|마지막으로)/g)
    .map((part) => part.replace(/[.!?。！？]+$/g, "").trim())
    .filter(Boolean)
    .filter((part) => !/^(나서|그리고 나서|그다음|다음)$/g.test(part));

  const uniqueParts: string[] = [];
  for (const part of parts) {
    if (uniqueParts[uniqueParts.length - 1] !== part) uniqueParts.push(part);
  }

  return uniqueParts.join(". ");
}

function addSpeechSentenceBreaks(text: string) {
  const endings = /(습니다|습니까|입니다|입니까|합니다|합니까|됩니다|됩니까|갑니다|옵니다|봅니다|씁니다|읽습니다|그립니다|붙입니다|냅니다|받습니다|주세요|해 주세요|하세요|됩니다|했어요|해요|돼요|나요|게요|겠습니다|되겠습니다)/g;
  return text
    .replace(new RegExp(`${endings.source}(?![.!?。！？])\\s+(?=[가-힣0-9])`, "g"), "$1.\n")
    .replace(/([.!?。！？])\s+/g, "$1\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function formatSentence(sentence: string) {
  let text = sentence
    .replace(/[.!?。！？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return `${text}.`;
}

function normalizeNumberedSentence(sentence: string, index: number) {
  const trimmed = sentence.trim();
  if (/^\d+\.\s*/.test(trimmed)) return trimmed.replace(/^(\d+)\.\s*/, "$1. ");
  if (index === 0 || !/^\d/.test(trimmed)) return trimmed;
  return trimmed;
}

function insertSpeechResult() {
  const text = speechResultText.value.trim();
  if (!text) {
    showToast("넣을 음성 입력 결과가 없습니다.");
    return;
  }
  const targetLanguage = settings.readingLanguage;
  const previousText = getPlainText();
  editor.focus();
  document.execCommand("insertText", false, text);
  if (getPlainText() === previousText) {
    editor.innerText = [previousText, text].filter(Boolean).join("\n");
  }
  speechDialog.hidden = true;
  speechHelpText.textContent = "현재 커서 위치에 추가됩니다.";
  resetTranslationState();
  updateCounts();
  scheduleSave();
  scheduleNoticeAutoFit();
  if (targetLanguage !== "ko") {
    window.setTimeout(() => {
      void selectReadingLanguage(targetLanguage);
    }, 0);
  }
}

function handleNoticeEditorKeydown(event: KeyboardEvent) {
  if (activeBoardMode !== "notice" || event.key !== "Enter") return;
  event.preventDefault();
  const lineCount = getPlainText().split(/\n+/).filter((line) => line.trim()).length;
  document.execCommand("insertText", false, `\n${lineCount + 1}. `);
  scheduleNoticeAutoFit();
}

function toggleDefaultNoticeItem(slot: 1 | 2) {
  if (activeBoardMode !== "notice") return;
  const activeCheck = slot === 1 ? defaultFirstCheck : defaultSecondCheck;
  const defaultItem = getDefaultNoticeItem(currentDateKey, slot);
  if (!defaultItem) {
    activeCheck.checked = false;
    showToast("이 날짜에는 오늘의 자동 문구가 없습니다.");
    return;
  }
  const items = getNoticeItemsFromEditor();
  const index = slot - 1;
  const existingIndex = items.indexOf(defaultItem);

  if (activeCheck.checked) {
    if (existingIndex >= 0) {
      showToast(`${slot}번 자동 문구가 이미 들어가 있습니다.`);
      updateModeUi();
      return;
    }
    while (items.length <= index) items.push("");
    if ((items[index] ?? "").trim()) items.splice(index, 0, defaultItem);
    else items[index] = defaultItem;
    applyNoticeItems(items);
    showToast(`${slot}번 자동 문구를 표시했습니다.`);
    return;
  }

  const removeIndex = items.indexOf(defaultItem);
  if (removeIndex >= 0) {
    items.splice(removeIndex, 1);
    applyNoticeItems(items.length ? items : [""]);
    showToast(`${slot}번 자동 문구를 숨겼습니다.`);
  } else {
    activeCheck.checked = false;
    showToast(`수정한 ${slot}번 문구는 자동으로 지우지 않습니다.`);
  }
}

function applyNoticeItems(items: string[]) {
  isApplyingEditorContent = true;
  editor.innerText = composeNoticeText(items);
  isApplyingEditorContent = false;
  updateCounts();
  scheduleSave();
  updateModeUi();
  scheduleNoticeAutoFit();
}

function shouldUseNoticeAutoFit() {
  return activeBoardMode === "notice" && settings.noticeAutoFit;
}

function scheduleNoticeAutoFit() {
  window.cancelAnimationFrame(autoFitFrame);
  autoFitFrame = window.requestAnimationFrame(applyNoticeAutoFit);
}

function applyNoticeAutoFit() {
  if (!shouldUseNoticeAutoFit()) {
    editor.style.fontSize = `${settings.defaultFontSize}px`;
    editor.style.lineHeight = String(settings.lineHeight);
    query<HTMLOutputElement>("#fontSizeValue").value = String(settings.defaultFontSize);
    return;
  }
  const text = getPlainText();
  const itemCount = Math.max(1, text ? text.split(/\n+/).filter((line) => line.trim()).length : 1);
  const maxSize = itemCount <= 1 ? 116 : itemCount === 2 ? 96 : itemCount === 3 ? 76 : 64;
  const minSize = itemCount <= 2 ? 42 : 34;
  let low = minSize;
  let high = Math.min(settings.defaultFontSize, maxSize);
  let best = low;
  editor.style.lineHeight = itemCount <= 2 ? "1.28" : String(settings.lineHeight);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    editor.style.fontSize = `${mid}px`;
    const fitsHeight = editor.scrollHeight <= editor.clientHeight + 2;
    const fitsWidth = editor.scrollWidth <= editor.clientWidth + 2;
    if (fitsHeight && fitsWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  editor.style.fontSize = `${best}px`;
  query<HTMLOutputElement>("#fontSizeValue").value = "자동";
}

function openConfirmDialog(title: string, message: string, actionLabel: string, action: () => void) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmActionButton.textContent = actionLabel;
  pendingConfirmAction = action;
  confirmDialog.hidden = false;
}

function closeConfirmDialog() {
  confirmDialog.hidden = true;
  pendingConfirmAction = null;
}

async function copyCurrentContent() {
  const text = getExportText(false);
  if (!text.trim()) {
    showToast("복사할 내용이 없습니다.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("내용을 복사했습니다.");
}

function exportCurrentContent() {
  if (activeBoardMode === "notice") {
    openExportDialog();
    return;
  }
  const dateLabel = getKoreanToday();
  const text = getExportText(true);
  downloadTextFile(`${dateLabel}_일반칠판.txt`, text);
  showToast("파일로 저장했습니다.");
}

function openNoticeHistory() {
  saveDocument();
  const base = parseDateKey(currentDateKey);
  const year = base.getFullYear();
  const month = base.getMonth();
  const rows: Array<{ date: string; label: string; content: string; isCurrent: boolean }> = [];
  const cursor = new Date(year, month, 1);

  while (cursor.getMonth() === month) {
    const dateKey = getDateKey(cursor);
    const data = loadNoticeData(dateKey);
    const content = (data?.items ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" / ");
    if (content) {
      const { specialLabel } = getDateLabelParts(dateKey);
      rows.push({
        date: dateKey,
        label: `${cursor.getDate()}일 ${specialLabel}`,
        content,
        isCurrent: dateKey === currentDateKey
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  noticeHistoryList.innerHTML = rows.length
    ? rows.map((row) => `
      <button class="notice-history-row${row.isCurrent ? " active" : ""}" type="button" data-history-date="${row.date}">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.content)}</strong>
      </button>
    `).join("")
    : `<p class="notice-history-empty">이번 달에 저장된 알림장이 없습니다.</p>`;
  noticeHistoryList.querySelectorAll<HTMLButtonElement>("[data-history-date]").forEach((button) => {
    button.addEventListener("click", () => {
      noticeHistoryDialog.hidden = true;
      switchNoticeDate(button.dataset.historyDate ?? currentDateKey);
    });
  });
  noticeHistoryDialog.hidden = false;
}

function openExportDialog() {
  saveDocument();
  exportStartDate.value = currentDateKey;
  exportEndDate.value = currentDateKey;
  exportFormat.value = "excel";
  exportDialog.hidden = false;
}

function exportSelectedNoticeRange() {
  const start = normalizeDateKey(exportStartDate.value);
  const end = normalizeDateKey(exportEndDate.value);
  if (!start || !end) {
    showToast("내보낼 날짜를 선택해주세요.");
    return;
  }
  if (parseDateKey(start).getTime() > parseDateKey(end).getTime()) {
    showToast("끝 날짜는 시작 날짜보다 빠를 수 없습니다.");
    return;
  }
  const rows = getNoticeExportRows(start, end);
  if (!rows.length) {
    showToast("선택한 기간에 내보낼 알림장 내용이 없습니다.");
    return;
  }
  const label = start === end ? start : `${start}_${end}`;
  if (exportFormat.value === "pdf") exportNoticePdf(label, rows);
  else exportNoticeExcel(label, rows);
  exportDialog.hidden = true;
  showToast("선택한 날짜의 알림장을 내보냈습니다.");
}

function getNoticeExportRows(start: string, end: string) {
  saveDocument();
  const rows: Array<{ date: string; weekday: string; content: string }> = [];
  const cursor = parseDateKey(start);
  const last = parseDateKey(end);
  while (cursor.getTime() <= last.getTime()) {
    const dateKey = getDateKey(cursor);
    const data = loadNoticeData(dateKey);
    const items = data?.items ?? [];
    const content = composeNoticeText(items).split("\n").filter((line) => stripNoticeNumber(line)).join("\n").trim();
    if (content) rows.push({ date: dateKey, weekday: getKoreanWeekday(dateKey), content });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

function exportNoticeExcel(label: string, rows: Array<{ date: string; weekday: string; content: string }>) {
  const tableRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.weekday)}</td>
      <td style="white-space:pre-wrap">${escapeHtml(row.content)}</td>
    </tr>`).join("");
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:8px;vertical-align:top}th{background:#e8f0ea}</style></head>
<body>
<table>
  <thead><tr><th>날짜</th><th>요일</th><th>알림장 내용</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body>
</html>`;
  downloadTextFile(`${label}_알림장.xls`, html, "application/vnd.ms-excel");
}

function exportNoticePdf(label: string, rows: Array<{ date: string; weekday: string; content: string }>) {
  const sections = rows.map((row) => `
    <section class="notice-day">
      <h2>${escapeHtml(formatDateForExport(row.date))} ${escapeHtml(row.weekday)}</h2>
      <pre>${escapeHtml(row.content)}</pre>
    </section>`).join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(label)} 알림장</title>
  <style>
    body{font-family:Malgun Gothic,Arial,sans-serif;margin:32px;color:#1f2a24}
    h1{font-size:24px;margin:0 0 24px}
    .notice-day{page-break-inside:avoid;margin:0 0 24px;padding:16px;border:1px solid #cfd8d3;border-radius:8px}
    h2{font-size:18px;margin:0 0 12px}
    pre{white-space:pre-wrap;font:inherit;line-height:1.6;margin:0}
    @media print{button{display:none}.notice-day{border-color:#999}}
  </style>
</head>
<body>
  <button onclick="window.print()">PDF로 저장/인쇄</button>
  <h1>${escapeHtml(label)} 알림장</h1>
  ${sections}
  <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));</script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

function getExportText(includeDate: boolean) {
  if (activeBoardMode === "notice") {
    const body = composeNoticeText(getNoticeItemsFromEditor()).split("\n").filter((line) => stripNoticeNumber(line)).join("\n");
    return includeDate ? `${formatDateForExport(currentDateKey)}\n\n${body}` : body;
  }
  return getPlainText();
}

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDateForExport(dateKey: string) {
  const date = parseDateKey(dateKey);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getKoreanWeekday(dateKey: string) {
  return ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][parseDateKey(dateKey).getDay()];
}

function openClearConfirm() {
  if (isBusy()) stopCurrentAction();
  openConfirmDialog(
    "작성한 내용을 모두 삭제하시겠습니까?",
    "현재 모드의 본문과 화면에 표시된 번역 결과를 함께 비웁니다. 다른 날짜와 다른 모드의 데이터는 유지됩니다.",
    "전체 삭제",
    clearEditor
  );
}

function clearEditor() {
  editor.innerHTML = "";
  resetTranslationState();
  confirmDialog.hidden = true;
  editor.focus();
  updateCounts();
  scheduleSave();
  showToast(activeBoardMode === "notice" ? "현재 날짜의 알림장 본문과 번역 결과가 삭제되었습니다." : "일반 칠판 본문과 번역 결과가 삭제되었습니다.");
}

function openSettings() {
  fillSettingsControls();
  settingsDrawer.classList.add("open");
  settingsDrawer.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsDrawer.classList.remove("open");
  settingsDrawer.setAttribute("aria-hidden", "true");
}

function openAiConnectionSettings() {
  fillSettingsControls();
  aiConnectionDialog.hidden = false;
  window.setTimeout(() => geminiKeyInput.focus(), 120);
}

function closeAiConnectionSettings() {
  aiConnectionDialog.hidden = true;
}

function openApiGuide() {
  apiGuideDialog.hidden = false;
  query<HTMLButtonElement>("#focusGeminiInputButton").focus();
}

function closeApiGuide() {
  apiGuideDialog.hidden = true;
}

function openInfoDialog(title: string, message: string) {
  infoTitle.textContent = title;
  infoMessage.textContent = message;
  infoDialog.hidden = false;
  query<HTMLButtonElement>("#closeInfoButton").focus();
}

function closeInfoDialog() {
  infoDialog.hidden = true;
}

function toggleMoreMenu(event: MouseEvent) {
  event.stopPropagation();
  const button = query<HTMLButtonElement>("#moreButton");
  moreMenu.hidden = !moreMenu.hidden;
  button.setAttribute("aria-expanded", String(!moreMenu.hidden));
  closeLanguageMoreMenu();
}

function closeMoreMenu() {
  moreMenu.hidden = true;
  query<HTMLButtonElement>("#moreButton").setAttribute("aria-expanded", "false");
}

function toggleLanguageMoreMenu(event: MouseEvent) {
  event.stopPropagation();
  languageMoreMenu.hidden = !languageMoreMenu.hidden;
  languageMoreButton.setAttribute("aria-expanded", String(!languageMoreMenu.hidden));
  closeMoreMenu();
}

function closeLanguageMoreMenu() {
  languageMoreMenu.hidden = true;
  languageMoreButton.setAttribute("aria-expanded", "false");
}

function toggleColorPopover() {
  colorPopover.hidden = !colorPopover.hidden;
  query<HTMLButtonElement>("#colorMenuButton").setAttribute("aria-expanded", String(!colorPopover.hidden));
}

function closeFloatingUi(event: MouseEvent) {
  const target = event.target as Node;
  if (!moreMenu.contains(target) && !query<HTMLButtonElement>("#moreButton").contains(target)) closeMoreMenu();
  if (!languageMoreMenu.contains(target) && !languageMoreButton.contains(target)) closeLanguageMoreMenu();
  if (!colorPopover.contains(target) && !query<HTMLButtonElement>("#colorMenuButton").contains(target)) {
    colorPopover.hidden = true;
    query<HTMLButtonElement>("#colorMenuButton").setAttribute("aria-expanded", "false");
  }
}

function handleShortcuts(event: KeyboardEvent) {
  const editorHasFocus = document.activeElement === editor || editor.contains(document.activeElement);
  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveDocument();
    showToast("오늘 날짜 문서가 저장되었습니다.");
  }
  if (event.ctrlKey && event.key.toLowerCase() === "o") {
    event.preventDefault();
    showToast("TXT 열기는 데스크톱 파일 대화상자 연결 단계에서 활성화됩니다.");
  }
  if (event.key === "Escape") {
    stopCurrentAction();
    closeSettings();
    closeAiConnectionSettings();
    closeMoreMenu();
    closeLanguageMoreMenu();
    colorPopover.hidden = true;
    closeConfirmDialog();
    closeApiGuide();
    closeInfoDialog();
    noticeHistoryDialog.hidden = true;
    speechDialog.hidden = true;
    recordingOverlay.hidden = true;
  }
  if (event.code === "Space" && !editorHasFocus && (mode === "reading" || mode === "paused")) {
    event.preventDefault();
    togglePause();
  }
}

function stopCurrentAction() {
  if (mode === "reading" || mode === "paused") stopReading();
  if (mode === "recording") stopRecording();
}

function isBusy() {
  return ["recording", "converting", "reading", "paused"].includes(mode);
}

function showToast(message: string) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

window.addEventListener("beforeunload", () => {
  if (settings.autoSave) saveDocument();
});

hydrate();
bindEvents();
applySettings();
populateVoices();
void checkTranslationSupport();
loadActiveBoardContent();
updateCounts();
setMode("idle");
window.setInterval(checkDateRollover, 60_000);
window.speechSynthesis?.addEventListener("voiceschanged", populateVoices);
