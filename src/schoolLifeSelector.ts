export interface SelectableSchoolLifeMessage {
  id: string;
  display_text: string;
  category: string;
  similar_group: string;
  conflict_type: "not_applicable" | "everyday_peer_conflict" | "bullying_or_violence";
  safety_priority: 1 | 2 | 3;
  requires_adult_support: boolean;
  trigger_tags: string[];
  context_tags: Record<SchoolLifeContextDimension, string[]>;
  recommended_weekdays: string[];
  recommended_months: number[];
  active: boolean;
}

export interface SchoolLifeSelectionPolicy {
  recent_message_cooldown: number;
  similar_group_cooldown: number;
  category_balance_window: number;
}

export interface SchoolLifeSelectionHistoryEntry {
  date: string;
  id: string;
  category: string;
  similarGroup: string;
}

interface SchoolLifeSelectionInput {
  messages: SelectableSchoolLifeMessage[];
  policy: SchoolLifeSelectionPolicy;
  history: SchoolLifeSelectionHistoryEntry[];
  dateKey: string;
  weekday: string;
  month: number;
  activeTriggers: string[];
  activeContexts?: Partial<Record<SchoolLifeContextDimension, string[]>>;
  conflictMode?: "everyday" | "bullying_or_violence";
}

type SchoolLifeContextDimension = "places" | "times" | "activities" | "situations" | "channels";
const IMMEDIATE_CONTEXT_TRIGGERS = new Set(["conflict", "online", "field_trip", "presentation", "safety"]);

export function selectSchoolLifeMessage(input: SchoolLifeSelectionInput) {
  const triggerSet = new Set(["any_school_day", ...input.activeTriggers]);
  const activeMessages = input.messages.filter((item) => item.active);
  if (activeMessages.length === 0) return { selected: null, history: normalizeHistory(input.history) };

  const history = normalizeHistory(input.history);
  const existing = history.find((entry) => entry.date === input.dateKey);
  if (existing) {
    const existingMessage = activeMessages.find((item) => item.id === existing.id);
    if (existingMessage) return { selected: existingMessage, history };
  }

  const priorHistory = history.filter((entry) => entry.date < input.dateKey);
  const triggerEligible = activeMessages.filter((item) => {
    const hasActiveTrigger = item.trigger_tags.some((tag) => triggerSet.has(tag));
    if (!hasActiveTrigger) return false;
    if (item.safety_priority === 3) {
      return item.trigger_tags.some((tag) => tag !== "any_school_day" && triggerSet.has(tag));
    }
    return true;
  });
  const immediateTriggers = input.activeTriggers.filter((tag) => IMMEDIATE_CONTEXT_TRIGGERS.has(tag));
  let immediateMatches = triggerEligible.filter((item) =>
    item.trigger_tags.some((tag) => immediateTriggers.includes(tag)),
  );
  if (immediateTriggers.includes("conflict")) {
    const desiredConflictType = input.conflictMode === "everyday"
      ? "everyday_peer_conflict"
      : "bullying_or_violence";
    const conflictMatches = immediateMatches.filter((item) => item.conflict_type === desiredConflictType);
    if (conflictMatches.length > 0) immediateMatches = conflictMatches;
  }
  const selectionPool = immediateTriggers.length > 0 && immediateMatches.length > 0
    ? immediateMatches
    : triggerEligible.length > 0
      ? triggerEligible
      : activeMessages.filter((item) => item.safety_priority < 3 && item.trigger_tags.includes("any_school_day"));
  if (selectionPool.length === 0) return { selected: null, history };

  const recentMessages = priorHistory.slice(-input.policy.recent_message_cooldown);
  const recentGroups = priorHistory.slice(-input.policy.similar_group_cooldown);
  const balanceWindow = priorHistory.slice(-input.policy.category_balance_window);
  const recentIds = new Set(recentMessages.map((entry) => entry.id));
  const recentGroupIds = new Set(recentGroups.map((entry) => entry.similarGroup));
  const usageCounts = priorHistory.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.id] = (counts[entry.id] ?? 0) + 1;
    return counts;
  }, {});
  const categoryCounts = balanceWindow.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    return counts;
  }, {});
  const categorySizes = selectionPool.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});
  const groupCounts = priorHistory.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.similarGroup] = (counts[entry.similarGroup] ?? 0) + 1;
    return counts;
  }, {});
  const groupSizes = selectionPool.reduce<Record<string, number>>((counts, item) => {
    counts[item.similar_group] = (counts[item.similar_group] ?? 0) + 1;
    return counts;
  }, {});

  const cooldownEligible = selectionPool.filter((item) => !recentIds.has(item.id) && !recentGroupIds.has(item.similar_group));
  const messageEligible = selectionPool.filter((item) => !recentIds.has(item.id));
  const candidates = cooldownEligible.length > 0
    ? cooldownEligible
    : messageEligible.length > 0
      ? messageEligible
      : selectionPool;

  const ranked = candidates.map((item) => {
    const categoryExposure = (categoryCounts[item.category] ?? 0) / (categorySizes[item.category] ?? 1);
    const groupExposure = (groupCounts[item.similar_group] ?? 0) / (groupSizes[item.similar_group] ?? 1);
    const contextualMatch = item.trigger_tags.some((tag) => tag !== "any_school_day" && triggerSet.has(tag));
    const contextMatchCount = Object.entries(input.activeContexts ?? {}).reduce((count, [dimension, values]) => {
      const itemValues = item.context_tags[dimension as SchoolLifeContextDimension] ?? [];
      return count + (values?.some((value) => itemValues.includes(value)) ? 1 : 0);
    }, 0);
    const score =
      ((usageCounts[item.id] ?? 0) * 100_000)
      + (groupExposure * 5_000)
      + (categoryExposure * 1_000)
      + (item.recommended_weekdays.includes(input.weekday) ? 0 : 20)
      + (item.recommended_months.includes(input.month) ? 0 : 10)
      + (contextualMatch ? -50 : 0)
      - (contextMatchCount * 2_000)
      + (stableMessageHash(`${input.dateKey}:${item.id}`) % 100);
    return { item, score };
  }).sort((left, right) => left.score - right.score || left.item.id.localeCompare(right.item.id));

  const selected = ranked[0].item;
  const nextHistory = history
    .filter((entry) => entry.date !== input.dateKey)
    .concat({ date: input.dateKey, id: selected.id, category: selected.category, similarGroup: selected.similar_group })
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-365);
  return { selected, history: nextHistory };
}

function normalizeHistory(history: SchoolLifeSelectionHistoryEntry[]) {
  return history
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.id && entry.category && entry.similarGroup)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function stableMessageHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
