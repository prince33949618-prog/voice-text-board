export type Message1ActivationRule = {
  type: "evergreen" | "fixed_date" | "relative_date" | "lunar_date";
  month?: number;
  day?: number;
  label?: string;
  rule?: "fourth_friday";
  non_school_day_policy?: "previous_school_day";
  requires_school_calendar_resolution?: boolean;
};

export type Message1Entry = {
  id: string;
  display_text: string;
  category: string;
  activation_rule: Message1ActivationRule;
  recommended_months: number[];
  recommended_weekdays: string[];
  weather_tags: string[];
  priority: number;
  active: boolean;
};

export type Message1Selection = {
  selected: Message1Entry | null;
  reason: "observance" | "evergreen" | "non_school_day" | "none";
  observanceDate?: string;
};

const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function fixedPublicHoliday(date: Date) {
  const year = date.getUTCFullYear();
  const key = `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  const holidays = new Set(["01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"]);
  if (year >= 2026) holidays.add("05-01");
  if (year >= 2026) holidays.add("07-17");
  return holidays.has(key);
}

export function isNonSchoolDateKey(dateKey: string, configuredNonSchoolDates: ReadonlySet<string>) {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay();
  return day === 0 || day === 6 || fixedPublicHoliday(date) || configuredNonSchoolDates.has(dateKey);
}

function fourthFriday(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const firstFriday = 1 + ((5 - date.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, month - 1, firstFriday + 21));
}

function activationDate(year: number, rule: Message1ActivationRule) {
  if (rule.type === "fixed_date" && rule.month && rule.day) return new Date(Date.UTC(year, rule.month - 1, rule.day));
  if (rule.type === "relative_date" && rule.month && rule.rule === "fourth_friday") return fourthFriday(year, rule.month);
  return null;
}

function displayDateForObservance(year: number, rule: Message1ActivationRule, nonSchoolDates: ReadonlySet<string>) {
  const original = activationDate(year, rule);
  if (!original) return null;
  const display = new Date(original);
  if (rule.non_school_day_policy === "previous_school_day") {
    let attempts = 0;
    while (isNonSchoolDateKey(toDateKey(display), nonSchoolDates) && attempts < 14) {
      display.setUTCDate(display.getUTCDate() - 1);
      attempts += 1;
    }
  }
  return { original: toDateKey(original), display: toDateKey(display) };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectMessage1Message(
  messages: Message1Entry[],
  dateKey: string,
  configuredNonSchoolDates: ReadonlySet<string>,
): Message1Selection {
  if (isNonSchoolDateKey(dateKey, configuredNonSchoolDates)) return { selected: null, reason: "non_school_day" };

  const date = parseDateKey(dateKey);
  const year = date.getUTCFullYear();
  const observances = messages
    .filter((item) => item.active && item.category === "날짜별 계기교육")
    .map((item) => ({ item, schedule: displayDateForObservance(year, item.activation_rule, configuredNonSchoolDates) }))
    .filter((candidate) => candidate.schedule?.display === dateKey)
    .sort((left, right) => right.item.priority - left.item.priority || left.item.id.localeCompare(right.item.id));

  if (observances.length > 0) {
    const index = stableHash(`${dateKey}:observance`) % observances.length;
    const match = observances[index];
    return { selected: match.item, reason: "observance", observanceDate: match.schedule?.original };
  }

  const month = date.getUTCMonth() + 1;
  const weekday = weekdays[date.getUTCDay()];
  const evergreen = messages
    .filter((item) => item.active && item.activation_rule.type === "evergreen")
    .filter((item) => item.weather_tags.length === 0)
    .filter((item) => item.recommended_months.length === 0 || item.recommended_months.includes(month))
    .filter((item) => item.recommended_weekdays.length === 0 || item.recommended_weekdays.includes(weekday))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (evergreen.length === 0) return { selected: null, reason: "none" };
  return { selected: evergreen[stableHash(`${dateKey}:evergreen`) % evergreen.length], reason: "evergreen" };
}
