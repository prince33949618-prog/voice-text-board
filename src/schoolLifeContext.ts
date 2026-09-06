export type SchoolLifeConflictMode = "everyday" | "bullying_or_violence";
export type SchoolLifeContextDimension = "places" | "times" | "activities" | "situations" | "channels";

export function deriveSchoolLifeSelectionContext(month: number, source: string) {
  const activeTriggers = ["any_school_day"];
  const activeContexts: Partial<Record<SchoolLifeContextDimension, string[]>> = {};
  if (month === 3 || month === 9) activeTriggers.push("term_start");
  if (month === 6 || month === 7) {
    activeTriggers.push("rainy_day");
    activeContexts.situations = ["비 오는 날"];
  }

  if (/현장\s*체험|체험\s*학습|수학여행/u.test(source)) {
    activeTriggers.push("field_trip");
    activeContexts.activities = ["현장 체험"];
  }
  if (/온라인|학급\s*(?:누리집|게시판|채팅)|디지털/u.test(source)) {
    activeTriggers.push("online");
    activeContexts.channels = ["온라인 소통", "학급 온라인 공간"];
  }
  if (/발표|공연|연주/u.test(source)) {
    activeTriggers.push("presentation");
    activeContexts.activities = [...(activeContexts.activities ?? []), "발표"];
  }
  if (/안전|비상|대피|재난/u.test(source)) {
    activeTriggers.push("safety");
    const safetySituation = /비상|대피|재난/u.test(source) ? "비상 상황" : "안전 교육";
    activeContexts.situations = [...(activeContexts.situations ?? []), safetySituation];
  }

  let conflictMode: SchoolLifeConflictMode | undefined;
  if (/폭력|괴롭힘|따돌림|협박|해로운\s*소문|반복.*제외/u.test(source)) {
    activeTriggers.push("conflict");
    conflictMode = "bullying_or_violence";
  } else if (/갈등|다툼|오해/u.test(source)) {
    activeTriggers.push("conflict");
    conflictMode = "everyday";
  }
  if (activeTriggers.includes("conflict")) {
    activeContexts.situations = [...(activeContexts.situations ?? []), "갈등 상황"];
  }
  return { activeTriggers: [...new Set(activeTriggers)], activeContexts, conflictMode };
}
