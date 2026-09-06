import fs from "node:fs";
import path from "node:path";

const e = (emoji, message, sub_category, school_contexts, level, similar_group) => ({
  emoji,
  message,
  sub_category,
  school_contexts,
  level,
  similar_group,
});

const categories = {
  "친구 관계": [
    e("😊", "친구를 만나면 먼저 반갑게 인사하기", "인사", ["등교", "아침 활동"], 1, "greeting"),
    e("👋", "친구의 이름을 부르며 인사 건네기", "인사", ["등교", "쉬는 시간"], 1, "greeting"),
    e("🙂", "처음 만난 친구에게 내 이름 소개하기", "새 친구", ["새 학기", "모둠 활동"], 1, "new-friend"),
    e("🌞", "친구에게 말을 걸 때 먼저 이름 불러주기", "대화", ["교실", "쉬는 시간"], 1, "conversation-start"),
    e("🎈", "놀이에 함께하고 싶다고 친절하게 말하기", "놀이", ["쉬는 시간", "운동장"], 1, "join-play"),
    e("🤗", "혼자 있는 친구에게 함께 놀고 싶은지 물어보기", "놀이", ["쉬는 시간", "점심시간"], 1, "include-friend"),
    e("🧩", "놀이 방법을 모르는 친구에게 차근차근 설명하기", "놀이", ["쉬는 시간", "놀이 활동"], 2, "play-support"),
    e("🔄", "친구와 놀이 순서를 번갈아 지키기", "차례", ["쉬는 시간", "놀이 활동"], 1, "take-turns"),
    e("⏳", "친구가 차례를 마칠 때까지 기다리기", "차례", ["놀이 활동", "모둠 활동"], 1, "take-turns"),
    e("👏", "친구가 발표를 마치면 박수로 응원하기", "응원", ["학급 활동", "발표"], 1, "encourage"),
    e("🏆", "놀이에서 이긴 친구에게 축하한다고 말하기", "응원", ["놀이 활동", "체육 활동"], 1, "sportsmanship"),
    e("🌱", "놀이에서 아쉬워하는 친구에게 다시 해보자고 말하기", "응원", ["놀이 활동", "체육 활동"], 2, "sportsmanship"),
    e("⭐", "친구가 잘한 행동을 한 가지 말해주기", "칭찬", ["교실", "학급 활동"], 1, "praise"),
    e("💪", "끝까지 노력한 친구에게 애썼다고 말하기", "칭찬", ["수업", "학급 활동"], 2, "praise-effort"),
    e("🙏", "도움을 준 친구에게 고맙다고 바로 말하기", "감사", ["교실", "모둠 활동"], 1, "thanks"),
    e("💝", "배려해 준 친구에게 고맙다고 말하기", "감사", ["학교생활", "하교"], 1, "thanks"),
    e("🙋", "도움이 필요한 부분을 말하며 친구에게 부탁하기", "도움", ["수업", "학급 활동"], 1, "ask-help"),
    e("🫶", "무거운 준비물을 든 친구에게 도와줄지 묻기", "도움", ["교실", "이동 시간"], 2, "offer-help"),
    e("✏️", "학용품을 빌릴 때 언제 돌려줄지 약속하기", "물건", ["수업", "교실"], 1, "borrow"),
    e("📦", "빌린 물건을 약속한 때에 돌려주기", "물건", ["교실", "하교"], 1, "return-item"),
    e("🤲", "친구 물건을 사용하기 전에 주인에게 묻기", "물건", ["교실", "수업"], 1, "permission-item"),
    e("🎨", "함께 쓰는 재료는 친구와 번갈아 사용하기", "나눔", ["미술 활동", "모둠 활동"], 1, "share-materials"),
    e("👂", "친구의 말을 중간에 끊지 않고 끝까지 듣기", "경청", ["대화", "모둠 활동"], 1, "listening"),
    e("👀", "친구가 말할 때 하던 일을 잠시 멈추기", "경청", ["대화", "모둠 활동"], 1, "listening"),
    e("❓", "친구의 이야기가 궁금하면 관련된 질문하기", "대화", ["대화", "모둠 활동"], 2, "follow-up"),
    e("💬", "친구의 말을 잘못 이해했으면 다시 물어보기", "대화", ["대화", "협력 활동"], 1, "confirm-understanding"),
    e("🎤", "모둠 친구가 말하려 할 때 차례 내어주기", "참여", ["모둠 활동", "학급 회의"], 1, "invite-opinion"),
    e("🗳️", "선택을 망설이는 친구에게 생각할 시간 주기", "참여", ["모둠 활동", "놀이 활동"], 2, "decision-space"),
    e("👫", "짝 활동을 시작할 때 먼저 할 일을 함께 확인하기", "짝 활동", ["수업", "짝 활동"], 1, "partner-start"),
    e("📋", "모둠 친구에게 맡고 싶은 역할 물어보기", "모둠", ["모둠 활동", "프로젝트"], 2, "group-role"),
    e("🤝", "친구와 약속할 때 언제 지킬지 함께 정하기", "약속", ["학교생활", "놀이 활동"], 2, "promise"),
    e("🕒", "모둠 약속을 지키기 어렵다면 활동 전에 알려주기", "약속", ["모둠 활동", "학급 활동"], 2, "promise-update"),
    e("📣", "친구가 말할 준비가 될 때까지 기다려주기", "신뢰", ["교실", "쉬는 시간"], 2, "respect-silence"),
    e("🔒", "친구의 개인 이야기를 다른 사람에게 전하기 전에 허락받기", "신뢰", ["교실", "온라인 소통"], 2, "privacy-permission"),
    e("⌨️", "학급 온라인 글을 올리기 전에 상처 주는 표현이 없는지 읽어보기", "온라인 관계", ["온라인 학습", "학급 온라인 공간"], 2, "online-kindness"),
    e("🤝", "친구와 함께할 활동을 정할 때 서로의 의견 묻기", "함께하기", ["학급 활동", "모둠 활동"], 2, "mutual-choice"),
    e("🎲", "놀이에 참여하고 싶은 친구에게 차례 내어주기", "놀이", ["쉬는 시간", "놀이 활동"], 2, "share-chance"),
    e("📏", "놀이 규칙을 바꾸기 전에 친구들과 합의하기", "놀이", ["쉬는 시간", "체육 활동"], 2, "play-rules"),
    e("🛑", "친구가 멈춰 달라고 하면 장난을 바로 멈추기", "경계 존중", ["쉬는 시간", "놀이 활동"], 1, "stop-signal"),
    e("💧", "실수로 친구와 부딪히면 먼저 괜찮은지 묻기", "관심", ["이동 시간", "체육 활동"], 1, "check-injury"),
    e("🩹", "다친 친구를 보면 가까운 어른에게 알려주기", "도움", ["학교생활", "체육 활동"], 1, "report-injury"),
    e("🎉", "오랜만에 등교한 친구를 반갑게 맞아주기", "환영", ["등교", "교실"], 1, "welcome-back"),
    e("🗺️", "학교가 낯선 친구에게 필요한 장소 알려주기", "새 친구", ["새 학기", "이동 시간"], 2, "school-guide"),
    e("📚", "재미있게 읽은 책을 친구에게 소개하기", "관심 나눔", ["독서 활동", "쉬는 시간"], 1, "book-share"),
    e("📝", "내가 찾은 공부 방법을 친구와 나누기", "학습 나눔", ["수업", "자율 학습"], 2, "study-tip"),
    e("🗣️", "친구가 좋아하는 학교 활동을 물어보기", "관심 표현", ["학교생활", "대화"], 1, "friend-interest"),
    e("📨", "함께 놀자는 말을 들으면 함께할지 말해주기", "약속", ["놀이 활동", "학급 활동"], 1, "invitation-response"),
    e("🙌", "발표를 마친 친구에게 기억에 남은 내용 말해주기", "응원", ["발표", "학급 활동"], 1, "presentation-support"),
    e("🌟", "친구가 맡은 일을 마치면 수고했다고 말하기", "칭찬", ["수업", "학급 활동"], 1, "notice-growth"),
    e("💌", "하교 전에 함께한 친구에게 고마움 전하기", "감사", ["하교", "교실"], 1, "day-thanks"),
    e("🫂", "놀이에서 빠진 친구에게 함께 놀고 싶은지 물어보기", "포용", ["쉬는 시간", "놀이 활동"], 2, "include-friend"),
    e("🍀", "새 모둠이 되면 모든 친구에게 인사하기", "모둠", ["모둠 활동", "새 학기"], 1, "group-greeting"),
    e("🎁", "친구가 어려운 일을 해내면 축하한다고 말하기", "응원", ["학급 활동", "학교생활"], 1, "celebrate-effort"),
    e("👣", "함께 이동하다 친구가 보이지 않으면 선생님께 알리기", "함께하기", ["이동 시간", "학교생활"], 2, "walk-together"),
    e("🌙", "하교할 때 친구에게 잘 가라고 인사하기", "인사", ["하교", "교문"], 1, "farewell"),
  ],
  "수업 생활": [
    e("🎒", "수업 전에 필요한 준비물을 책상에 꺼내기", "수업 준비", ["수업 전", "교실"], 1, "class-prep"),
    e("🧹", "수업이 시작되면 책상 위에 필요한 준비물만 놓기", "수업 준비", ["수업 전", "교실"], 1, "desk-prep"),
    e("🔔", "수업 시작 안내를 확인하면 하던 일을 정리하기", "수업 시작", ["수업 전", "교실"], 1, "start-signal"),
    e("👁️", "설명을 들으며 중요한 낱말 찾아보기", "집중", ["수업", "교실"], 1, "class-listening"),
    e("👂", "친구의 발표를 마지막까지 조용히 들어주기", "경청", ["발표", "수업"], 1, "presentation-listening"),
    e("✋", "수업 중 질문할 때 궁금한 부분부터 말하기", "발표", ["수업", "학급 회의"], 1, "request-turn"),
    e("💡", "내 생각 한 가지를 짧게 말하기", "발표", ["수업", "모둠 활동"], 2, "clear-speaking"),
    e("❔", "모르는 내용이 나오면 궁금한 점 질문하기", "질문", ["수업", "자율 학습"], 1, "ask-question"),
    e("🎯", "어느 부분을 이해하지 못했는지 말하며 다시 묻기", "질문", ["수업", "모둠 활동"], 2, "specific-question"),
    e("🧠", "답과 함께 그렇게 생각한 까닭 말하기", "사고", ["수업", "토의"], 2, "give-reason"),
    e("📝", "설명에서 중요한 낱말을 골라 적기", "필기", ["수업", "영상 학습"], 2, "key-note"),
    e("📖", "활동 안내를 끝까지 읽기", "과제 수행", ["수업", "학습지 활동"], 1, "read-directions"),
    e("🚀", "과제를 받으면 가장 먼저 할 부분부터 시작하기", "과제 수행", ["수업", "자율 학습"], 1, "task-start"),
    e("⏱️", "활동 중간에 남은 시간을 한 번 확인하기", "시간 관리", ["수업", "모둠 활동"], 2, "time-check"),
    e("🧱", "여러 과제는 정한 순서대로 하나씩 해결하기", "과제 수행", ["수업", "자율 학습"], 2, "task-order"),
    e("🔎", "읽다가 모르는 낱말에 표시해 두기", "읽기", ["국어 수업", "독서 활동"], 1, "unknown-word"),
    e("📘", "뜻을 모르는 낱말은 사전에서 찾아보기", "읽기", ["수업", "독서 활동"], 2, "dictionary"),
    e("🪞", "새 문제를 풀 때 비슷한 예부터 찾아보기", "문제 해결", ["수업", "자율 학습"], 2, "compare-example"),
    e("➗", "계산한 과정을 순서대로 적기", "문제 해결", ["수학 수업", "자율 학습"], 1, "show-work"),
    e("📐", "답을 쓴 뒤 단위가 빠지지 않았는지 확인하기", "검토", ["수학 수업", "과학 수업"], 1, "unit-check"),
    e("✅", "과제를 마치면 빠진 문항이 없는지 살피기", "검토", ["수업", "과제 제출 전"], 1, "completion-check"),
    e("🔁", "틀린 문제를 다른 방법으로 다시 풀어보기", "오답", ["수업", "자율 학습"], 2, "retry-problem"),
    e("🕵️", "답이 틀렸다면 풀이에서 잘못된 부분 찾아보기", "오답", ["수업", "자율 학습"], 2, "error-cause"),
    e("📬", "선생님이 남긴 도움말을 천천히 다시 읽기", "피드백", ["수업", "과제 확인"], 1, "read-feedback"),
    e("🛠️", "받은 조언 한 가지를 다음 과제에 적용하기", "피드백", ["수업", "과제 수행"], 2, "apply-feedback"),
    e("🤔", "친구에게 답보다 해결 방법을 물어보기", "협력 학습", ["짝 활동", "모둠 활동"], 2, "ask-process"),
    e("🪜", "친구에게 문제를 푼 순서대로 설명하기", "협력 학습", ["짝 활동", "모둠 활동"], 2, "explain-process"),
    e("💬", "모둠 활동에서 내 생각을 친구들과 나누기", "모둠 참여", ["모둠 활동", "토의"], 1, "group-participation"),
    e("📌", "모둠에서 맡은 일을 마치면 친구들에게 알려주기", "모둠 참여", ["모둠 활동", "프로젝트"], 1, "role-update"),
    e("🔉", "모둠 친구가 들을 수 있는 목소리로 말하기", "학습 태도", ["모둠 활동", "교실"], 2, "group-volume"),
    e("📊", "모둠에서 정한 내용을 빠뜨리지 않고 적기", "협력 학습", ["모둠 활동", "프로젝트"], 1, "group-record"),
    e("🧪", "실험 도구를 사용하기 전에 안전 방법 확인하기", "실험", ["과학 수업", "실험 활동"], 1, "experiment-safety"),
    e("🔬", "실험 결과를 적기 전에 한 번 더 관찰하기", "실험", ["과학 수업", "탐구 활동"], 1, "observe-first"),
    e("⚖️", "읽은 내용의 사실과 의견을 나누어 적기", "정보 이해", ["국어 수업", "사회 수업"], 3, "fact-opinion"),
    e("🔗", "온라인 자료를 사용할 때 출처 확인하기", "디지털 학습", ["온라인 학습", "프로젝트"], 2, "source-check"),
    e("📰", "인터넷 정보는 다른 자료와 한 번 더 비교하기", "디지털 학습", ["온라인 학습", "프로젝트"], 3, "cross-check"),
    e("🏷️", "글의 제목을 보고 내용을 미리 짐작해보기", "읽기", ["국어 수업", "독서 활동"], 1, "predict-reading"),
    e("🌳", "문단에서 중요한 문장 한 가지 고르기", "읽기", ["국어 수업", "독서 활동"], 2, "main-sentence"),
    e("❓", "읽은 내용에서 궁금한 점 한 가지 말하기", "읽기", ["독서 활동", "수업"], 1, "reading-question"),
    e("🗒️", "읽은 글의 중요한 내용을 한 문장으로 말하기", "읽기", ["국어 수업", "독서 활동"], 3, "summarize"),
    e("✍️", "글을 쓰기 전에 중심 생각 한 줄 적기", "쓰기", ["국어 수업", "글쓰기"], 1, "writing-plan"),
    e("🔤", "글을 다 쓴 뒤 띄어쓰기를 한 번 살피기", "쓰기", ["국어 수업", "과제 제출 전"], 2, "spacing-check"),
    e("🗣️", "쓴 글을 다시 읽으며 어색한 곳 찾기", "쓰기", ["국어 수업", "글쓰기"], 2, "read-aloud-edit"),
    e("🎙️", "발표할 때 준비한 내용을 차례대로 전하기", "발표", ["발표", "수업"], 1, "accessible-expression"),
    e("👥", "발표할 때 중요한 내용을 먼저 말하기", "발표", ["발표", "학급 활동"], 1, "accessible-presentation"),
    e("🎬", "발표 전에 첫 내용을 미리 연습하기", "발표 준비", ["발표 전", "모둠 활동"], 1, "presentation-practice"),
    e("🙆", "발표 질문을 끝까지 들은 뒤 대답하기", "발표", ["발표", "질의응답"], 2, "answer-question"),
    e("🎼", "음악 활동에서는 시작 신호에 맞춰 연주하기", "예체능 수업", ["음악 수업", "모둠 활동"], 1, "music-signal"),
    e("🖌️", "미술 재료를 쓰기 전에 사용 방법 확인하기", "예체능 수업", ["미술 수업", "창작 활동"], 1, "art-material"),
    e("🏃", "체육 활동에서는 멈춤 신호에 바로 반응하기", "예체능 수업", ["체육 수업", "운동장"], 1, "pe-stop-signal"),
  ],
  "공동체 생활": [
    e("🙇", "학교에서 만나는 어른께 밝게 인사하기", "학교 인사", ["등교", "학교생활"], 1, "school-greeting"),
    e("🤫", "도서관에서는 작은 목소리로 말하기", "공용 공간", ["도서관", "독서 활동"], 1, "library-voice"),
    e("🚶", "복도에서는 앞을 살피며 천천히 걷기", "이동 안전", ["복도", "이동 시간"], 1, "hallway-walk"),
    e("🪜", "계단에서는 한 칸씩 앞을 보며 이동하기", "이동 안전", ["계단", "이동 시간"], 1, "stairs"),
    e("🚪", "출입문에서는 나오는 사람을 먼저 기다려주기", "이동 배려", ["출입문", "이동 시간"], 1, "doorway"),
    e("🫱", "뒤에 오는 사람을 위해 문을 잠시 잡아주기", "이동 배려", ["출입문", "학교생활"], 1, "hold-door"),
    e("👣", "줄을 설 때 앞사람과 부딪히지 않을 만큼 간격 두기", "질서", ["이동 시간", "학교 행사"], 1, "line-spacing"),
    e("↔️", "길을 막고 있으면 지나갈 공간 내어주기", "이동 배려", ["복도", "교실"], 1, "clear-path"),
    e("🏀", "함께 쓰는 물건은 사용한 뒤 깨끗하게 정리하기", "공용 물품", ["교실", "체육 활동"], 1, "shared-item-care"),
    e("✂️", "가위 날을 닫아 손잡이 쪽으로 건네기", "공용 물품", ["수업", "창작 활동"], 2, "pass-scissors"),
    e("🛠️", "고장 난 학교 물건을 발견하면 선생님께 알리기", "공용 물품", ["교실", "특별실"], 1, "report-damage"),
    e("🧤", "물건을 잃어버리면 마지막 사용 장소부터 살펴보기", "분실물", ["학교생활", "이동 시간"], 1, "find-lost-property"),
    e("📚", "함께 보는 책은 친구와 번갈아 넘기기", "공용 물품", ["도서관", "교실"], 1, "shared-book"),
    e("♻️", "버릴 물건과 같은 표시가 있는 통에 넣기", "환경", ["교실", "학교 행사"], 1, "sorting-waste"),
    e("💧", "손을 씻은 뒤 수도꼭지를 완전히 잠그기", "환경", ["화장실", "급식 전"], 1, "save-water"),
    e("📄", "메모할 때 쓰던 종이의 빈 곳 활용하기", "환경", ["수업", "창작 활동"], 1, "save-paper"),
    e("🌿", "학교의 꽃과 나무를 꺾지 않고 살펴보기", "환경", ["운동장", "학교 숲"], 1, "school-nature"),
    e("🐞", "작은 생명을 발견하면 밟지 않게 비켜가기", "환경", ["운동장", "학교 숲"], 1, "small-life"),
    e("🧽", "공동 활동 뒤 흘린 재료를 정리하기", "정리", ["모둠 활동", "창작 활동"], 1, "shared-cleanup"),
    e("🧹", "함께 정리할 때 내가 맡은 일 마치기", "정리", ["청소 시간", "학급 활동"], 2, "cleanup-role"),
    e("📣", "학교 안내가 시작되면 안내 내용 확인하기", "안내", ["교실", "학교 행사"], 1, "school-broadcast"),
    e("🚨", "비상 신호를 확인하면 대피 안내에 따라 이동하기", "비상 대피 안전", ["안전 교육", "비상 상황"], 1, "emergency-guide"),
    e("🚶‍♀️", "대피할 때 앞사람과 간격을 두고 걷기", "안전", ["안전 교육", "대피 훈련"], 1, "evacuation"),
    e("⚠️", "위험한 장소를 발견하면 가까운 어른께 알리기", "안전", ["학교생활", "이동 시간"], 1, "report-hazard"),
    e("🤧", "기침이나 재채기는 옷소매로 입과 코 가리기", "건강", ["교실", "학교생활"], 1, "cough-etiquette"),
    e("🫧", "손에 물감이나 흙이 묻으면 비누로 씻기", "건강", ["창작 활동", "운동장"], 1, "handwashing"),
    e("🥤", "물을 마신 뒤 주변에 흘린 물 닦기", "건강", ["교실", "체육 활동"], 1, "drinking-water"),
    e("🚻", "화장실을 사용한 뒤 다음 사람을 위해 물 내리기", "공용 공간", ["화장실", "학교생활"], 1, "restroom-care"),
    e("🚰", "세면대 앞에서는 차례를 기다려 사용하기", "공용 공간", ["화장실", "급식 전"], 1, "sink-turn"),
    e("🍽️", "급식을 준비해 주신 분께 감사 인사하기", "감사", ["급식 시간", "급식실"], 1, "meal-thanks"),
    e("🥄", "음식이 담긴 식판은 두 손으로 들기", "급식 안전", ["급식 시간", "급식실"], 1, "food-carrying"),
    e("📢", "여러 사람에게 안내가 시작되면 하던 대화 멈추기", "공동 활동", ["학급 활동", "학교생활"], 1, "event-attention"),
    e("⏳", "공용 물건은 앞사람이 내려놓은 뒤 사용하기", "공용 공간", ["학교생활", "특별실"], 1, "shared-space-turn"),
    e("🧭", "학교 밖 활동에서는 모둠의 위치 확인하기", "학교 행사", ["현장 체험", "이동 시간"], 2, "group-location"),
    e("🏫", "학교에서 만난 어른이 도움을 주면 고맙다고 말하기", "학교 인사", ["학교생활", "이동 시간"], 1, "visitor-greeting"),
    e("🧑‍🤝‍🧑", "학급에서 할 일을 정할 때 내 의견 한 가지 말하기", "학급 참여", ["학급 회의", "학급 활동"], 2, "class-participation"),
    e("🗳️", "함께 정한 일을 다음 활동에서 한 가지 해보기", "학급 참여", ["학급 회의", "학교생활"], 2, "class-decision"),
    e("🙋", "공동 활동에서 맡고 싶은 역할 한 가지 말하기", "학급 참여", ["학급 활동", "모둠 활동"], 1, "volunteer-role"),
    e("🧺", "여럿이 쓴 공간은 활동이 끝난 뒤 정돈하기", "정리", ["특별실", "학급 활동"], 1, "shared-space-reset"),
    e("🔇", "다른 반이 수업 중인 곳에서는 조용히 이동하기", "이동 배려", ["복도", "이동 시간"], 1, "quiet-passing"),
    e("🚌", "단체로 이동할 때 안내하는 어른의 말 듣기", "학교 행사", ["현장 체험", "학교 행사"], 1, "trip-guide"),
    e("🌂", "젖은 우산은 다른 사람에게 닿지 않게 들기", "생활 배려", ["등교", "비 오는 날"], 1, "umbrella-care"),
    e("🧯", "비상구 앞이 막혀 있으면 선생님께 알리기", "안전", ["교실", "복도"], 2, "safety-access"),
    e("💻", "글을 올리기 전에 이름·얼굴·연락처가 보이는지 확인하기", "디지털 공동체", ["온라인 학습", "학급 온라인 공간"], 2, "online-privacy"),
    e("📷", "친구 사진을 온라인에 공유하기 전에 다시 허락받기", "디지털 공동체", ["온라인 학습", "학급 온라인 공간"], 2, "photo-sharing-consent"),
  ],
  "갈등 해결": [
    e("⏸️", "화가 나거나 속상하면 대답하기 전에 잠시 멈추기", "감정 조절", ["갈등 상황", "놀이 활동"], 1, "pause-conflict"),
    e("🌬️", "화가 났을 때 천천히 세 번 숨 쉬기", "감정 조절", ["갈등 상황", "교실"], 1, "calm-breath"),
    e("🗣️", "어떤 행동 때문에 속상했는지 한 문장으로 말하기", "마음 표현", ["갈등 상황", "대화"], 2, "i-message"),
    e("📍", "무슨 일이 있었는지 차례대로 설명하기", "문제 확인", ["갈등 상황", "상담"], 1, "describe-behavior"),
    e("💬", "상대에게 멈춰 주길 바라는 행동 한 가지 말하기", "요청", ["갈등 상황", "대화"], 2, "clear-request"),
    e("👂", "친구의 설명이 끝날 때까지 기다리기", "경청", ["갈등 상황", "대화"], 1, "conflict-listening"),
    e("🔁", "친구의 설명을 들은 뒤 궁금한 점 다시 묻기", "경청", ["갈등 상황", "상담"], 2, "reflect-listening"),
    e("❓", "친구에게 무슨 일이 있었는지 먼저 물어보기", "문제 확인", ["갈등 상황", "대화"], 2, "ask-reason"),
    e("🔎", "갈등이 시작되기 직전의 행동부터 말하기", "문제 확인", ["갈등 상황", "상담"], 1, "fact-assumption"),
    e("🙋", "갈등에서 내가 한 행동을 사실대로 말하기", "책임", ["갈등 상황", "상담"], 2, "admit-part"),
    e("🙏", "잘못한 행동에 대해 미안하다고 사과하기", "사과", ["갈등 상황", "학교생활"], 2, "specific-apology"),
    e("🧰", "실수를 어떻게 고치면 좋을지 친구에게 물어보기", "회복", ["갈등 상황", "상담"], 3, "repair-question"),
    e("🩹", "망가뜨린 물건을 어떻게 고칠지 주인과 이야기하기", "회복", ["갈등 상황", "교실"], 2, "repair-item"),
    e("🤲", "사과를 들어도 마음이 불편하면 시간이 필요하다고 말하기", "사과", ["갈등 상황", "대화"], 2, "respond-apology"),
    e("🛤️", "각자 원하는 해결 방법 한 가지씩 말하기", "해결책", ["갈등 상황", "학급 회의"], 2, "solution-options"),
    e("🤝", "서로 동의하는 해결 방법 정하기", "합의", ["갈등 상황", "상담"], 2, "mutual-solution"),
    e("🧑‍🏫", "해결 방법을 정하기 어렵다면 선생님과 함께 이야기하기", "도움 요청", ["갈등 상황", "상담"], 1, "mediation"),
    e("🚨", "폭력이나 괴롭힘을 보면 바로 어른께 알리기", "도움 요청", ["학교생활", "온라인 소통", "갈등 상황"], 1, "report-bullying"),
    e("✋", "불편한 장난이 계속되면 믿을 만한 어른께 알리기", "경계", ["놀이 활동", "갈등 상황"], 1, "report-repeated-play"),
    e("🛡️", "위험한 다툼이 시작되면 안전한 곳으로 이동하기", "안전", ["갈등 상황", "학교생활"], 1, "move-safe"),
    e("🕊️", "다툼 중 목소리가 커지면 잠시 대화 멈추기", "감정 조절", ["갈등 상황", "대화"], 1, "calm-voice"),
    e("😕", "놀림이 계속되거나 무서우면 믿을 만한 어른께 알리기", "도움 요청", ["갈등 상황", "쉬는 시간"], 1, "report-teasing"),
    e("🎭", "장난이었어도 친구가 놀랐다면 괜찮은지 묻기", "경계", ["놀이 활동", "갈등 상황"], 1, "honor-stop"),
    e("📞", "괴롭힘을 당한 일을 말하기 어렵다면 선생님께 도움 요청하기", "도움 요청", ["갈등 상황", "온라인 소통"], 1, "ask-adult-help"),
    e("📣", "친구를 해치거나 불안하게 하는 소문은 선생님께 알리기", "소문", ["교실", "온라인 소통", "갈등 상황"], 1, "report-harmful-rumor"),
    e("📵", "온라인 괴롭힘 화면을 믿을 만한 어른께 보여주기", "온라인 갈등", ["온라인 소통", "학급 온라인 공간", "갈등 상황"], 1, "show-online-evidence"),
    e("👨‍🏫", "온라인 괴롭힘을 본 사람도 믿을 만한 어른께 알리기", "온라인 갈등", ["온라인 소통", "상담", "갈등 상황"], 1, "bystander-report-online"),
    e("📏", "놀이 판정이 다르면 시작 전에 정한 규칙 확인하기", "놀이 갈등", ["놀이 활동", "체육 활동"], 2, "check-play-rule"),
    e("🔄", "차례로 다투면 사용할 순서를 함께 정하기", "놀이 갈등", ["놀이 활동", "교실"], 2, "resolve-turn"),
    e("⏳", "한 물건을 함께 쓰려면 사용할 순서 정하기", "물건 갈등", ["교실", "놀이 활동"], 1, "share-time"),
    e("💥", "부딪힌 뒤 다친 곳이 있으면 가까운 어른께 알리기", "사고", ["체육 활동", "이동 시간"], 1, "collision-check"),
    e("🚪", "모둠에서 반복해서 제외되면 선생님께 도움 요청하기", "소외", ["모둠 활동", "놀이 활동", "갈등 상황"], 1, "repeated-exclusion-help"),
    e("🫂", "참여하고 싶은 친구에게 함께할 방법 한 가지 말하기", "소외", ["모둠 활동", "놀이 활동"], 2, "include-solution"),
    e("📋", "한 친구가 맡은 일이 많으면 역할 다시 나누기", "역할 갈등", ["모둠 활동", "프로젝트"], 2, "redistribute-role"),
    e("🕰️", "약속을 지키지 못했다면 그 사실을 먼저 알려주기", "약속 갈등", ["학교생활", "모둠 활동"], 1, "explain-missed-promise"),
    e("🌿", "친구가 진정할 시간이 필요하면 기다려주기", "감정 배려", ["갈등 상황", "상담"], 2, "give-calm-time"),
    e("🆘", "괴롭힘이 다시 생기면 믿을 만한 어른께 알리기", "관계 회복", ["갈등 후", "학교생활"], 1, "report-recurrence"),
    e("🏷️", "문제를 말할 때 친구가 한 행동을 한 가지 말하기", "존중 대화", ["갈등 상황", "상담"], 2, "no-label"),
    e("⏰", "대화를 이어가기 어렵다면 잠시 쉬자고 말하기", "대화 조절", ["갈등 상황", "상담"], 1, "reschedule-talk"),
    e("✅", "함께 정한 해결 행동 한 가지 해보기", "합의", ["갈등 후", "학교생활"], 1, "follow-solution"),
  ],
  "책임감": [
    e("⏰", "등교하면 오늘 해야 할 첫 활동 확인하기", "시간 관리", ["등교", "아침 활동"], 1, "arrival-time"),
    e("📅", "하루를 시작하며 오늘 시간표 확인하기", "준비", ["아침 활동", "교실"], 1, "schedule-check"),
    e("🎒", "다음 수업에 필요한 준비물을 미리 챙기기", "준비", ["쉬는 시간", "수업 전"], 1, "next-class-prep"),
    e("📝", "해야 할 과제는 잊지 않도록 기록하기", "과제", ["수업", "하교 전"], 1, "record-homework"),
    e("📆", "과제는 정해진 날까지 마치기", "과제", ["자율 학습", "과제 수행"], 1, "deadline"),
    e("🏷️", "제출물에 내 이름이 있는지 확인하기", "과제", ["과제 제출 전", "수업"], 1, "name-check"),
    e("🙋", "과제를 빠뜨렸다면 선생님께 솔직히 말씀드리기", "정직", ["수업", "상담"], 1, "admit-missing"),
    e("🪞", "내가 한 실수는 사실대로 말하기", "정직", ["학교생활", "상담"], 2, "tell-truth"),
    e("⚠️", "안전과 관련된 실수는 즉시 어른께 알리기", "안전 책임", ["학교생활", "실험 활동"], 1, "report-safety-mistake"),
    e("🤝", "친구와 한 약속은 정한 때에 실천하기", "약속", ["학교생활", "모둠 활동"], 2, "keep-promise"),
    e("📌", "학급에서 맡은 역할은 정한 시간에 시작하기", "역할", ["학급 활동", "학교생활"], 2, "class-role"),
    e("📣", "맡은 일을 하기 어렵다면 미리 도움 요청하기", "역할", ["학급 활동", "모둠 활동"], 2, "role-help"),
    e("🧽", "정리 활동이 끝나면 빠뜨린 곳이 없는지 확인하기", "역할", ["청소 시간", "학급 활동"], 2, "finish-cleanup-role"),
    e("🔤", "내 물건은 다른 물건과 구별할 수 있게 표시하기", "물건 관리", ["교실", "새 학기"], 1, "label-belonging"),
    e("🔍", "하교 전에 두고 가는 물건이 없는지 살피기", "물건 관리", ["하교 전", "교실"], 1, "leaving-check"),
    e("🧤", "주운 물건은 가까운 선생님께 가져다드리기", "분실물", ["학교생활", "하교"], 1, "hand-lost-item"),
    e("✋", "준비물을 잊었으면 수업 전에 선생님께 알리기", "물건 관리", ["교실", "수업"], 1, "manage-belonging"),
    e("📦", "빌린 물건에 이상이 생기면 주인에게 바로 알리기", "물건 관리", ["교실", "학교생활"], 1, "borrowed-damage"),
    e("🧰", "공동 물품은 필요한 친구와 차례로 사용하기", "공용 물품", ["수업", "학급 활동"], 1, "shared-item-check"),
    e("🔐", "학교 계정 비밀번호는 다른 친구가 보지 않게 입력하기", "디지털 책임", ["온라인 학습", "정보 수업"], 1, "password"),
    e("🚪", "공용 기기 사용 후 내 계정에서 로그아웃하기", "디지털 책임", ["정보 수업", "온라인 학습"], 2, "logout"),
    e("📚", "다른 사람의 글을 활용하면 출처 밝히기", "디지털 책임", ["프로젝트", "과제 수행"], 2, "cite-source"),
    e("🧑‍💻", "온라인 과제에도 내 생각을 담아 작성하기", "디지털 책임", ["온라인 학습", "과제 수행"], 2, "own-work"),
    e("🔧", "도구를 사용하다 이상이 생기면 선생님께 바로 알리기", "안전 책임", ["수업", "특별실"], 1, "report-broken-tool"),
    e("🥽", "실험과 만들기 전에 도구에 이상이 없는지 확인하기", "안전 책임", ["실험 활동", "창작 활동"], 1, "follow-safety"),
    e("🌡️", "몸이 불편하면 참지 않고 선생님께 알리기", "건강 책임", ["학교생활", "체육 활동"], 1, "report-unwell"),
    e("🫧", "식사 전에는 흐르는 물과 비누로 30초 손 씻기", "건강 책임", ["급식 전", "화장실"], 1, "wash-before-meal"),
    e("👟", "체육 활동 전에 준비운동 따라 하기", "건강 책임", ["체육 수업", "운동장"], 1, "warm-up"),
    e("🔔", "이동 수업 안내를 받으면 필요한 준비물 챙기기", "시간 관리", ["이동 수업", "수업 전"], 1, "transition-time"),
    e("⌛", "수업 시작 안내에 맞춰 수업 장소로 이동하기", "시간 관리", ["쉬는 시간", "수업 전"], 1, "return-on-time"),
    e("🚀", "해야 할 일을 확인하면 마칠 시간 정하기", "실행", ["자율 학습", "학급 활동"], 1, "start-promptly"),
    e("⏳", "활동이 일찍 끝나면 결과를 다시 살피기", "시간 활용", ["수업", "자율 학습"], 2, "use-extra-time"),
    e("🗂️", "할 일이 여러 개면 먼저 할 순서 정하기", "계획", ["자율 학습", "프로젝트"], 2, "prioritize"),
    e("🏁", "학습 중 막히면 앞에서 배운 예 다시 보기", "실행", ["수업", "자율 학습"], 1, "continue-task"),
    e("🔎", "제출하기 전에 내 답을 한 번 더 확인하기", "검토", ["과제 제출 전", "수업"], 1, "review-submit"),
    e("🪑", "학습이 끝나면 사용한 자리를 정돈하기", "정리", ["수업 후", "특별실"], 1, "reset-seat"),
    e("👜", "하교 준비 때 다음 날 준비물 확인하기", "준비", ["하교 전", "교실"], 1, "dismissal-check"),
    e("🧹", "청소 도구를 사용하기 전에 주의할 점 확인하기", "안전 책임", ["청소 시간", "교실"], 1, "cleaning-tool"),
    e("📢", "가정에 전할 안내가 있으면 잊지 않게 챙기기", "소통 책임", ["하교 전", "가정 연계"], 1, "carry-notice"),
    e("🌱", "오늘 맡은 일을 마쳤는지 하교 전에 확인하기", "자기 관리", ["하교 전", "교실"], 2, "daily-duty-check"),
  ],
  "성장과 도전": [
    e("🧗", "항상 최선을 다하는 마음으로 열심히 도전하기", "도전 태도", ["수업", "학급 활동", "학교생활"], 1, "challenge-mindset"),
    e("🚪", "어려워 보여도 첫 단계부터 시작하기", "시작", ["수업", "학급 활동"], 1, "start-despite-worry"),
    e("🧩", "큰 과제를 작은 할 일로 나누기", "전략", ["프로젝트", "자율 학습"], 2, "break-task"),
    e("🔁", "익숙하지 않은 활동은 쉬운 부분부터 연습하기", "연습", ["수업", "창작 활동"], 1, "repeat-practice"),
    e("🙋", "어려운 부분을 알려 도움 요청하기", "도움 활용", ["수업", "자율 학습"], 2, "supported-try"),
    e("🛠️", "실수한 부분을 고쳐 같은 활동 다시 해보기", "실수 활용", ["수업", "체육 활동"], 2, "correct-retry"),
    e("🛤️", "한 방법이 어렵다면 다른 방법 시도하기", "전략", ["수업", "문제 해결"], 2, "alternate-method"),
    e("📬", "받은 조언에서 고칠 점 한 가지 고르기", "피드백", ["수업", "과제 확인"], 2, "find-feedback-action"),
    e("✨", "받은 조언을 반영해 결과물 고쳐보기", "피드백", ["수업", "창작 활동"], 2, "revise-work"),
    e("🎯", "수업을 시작하기 전에 오늘 해낼 일 하나 정하기", "목표", ["수업 전", "아침 활동"], 1, "learning-goal"),
    e("✅", "목표를 정하면 첫 행동 하나 시작하기", "목표", ["수업", "자율 학습"], 2, "next-goal-action"),
    e("🌿", "어려웠던 활동을 한 번 더 연습해보기", "성장 확인", ["수업", "자율 학습"], 1, "name-attempt"),
    e("🌱", "수업에서 선택할 수 있는 새 활동 한 가지 해보기", "새 경험", ["수업", "학급 활동"], 1, "try-new-experience"),
    e("🌈", "처음 하는 활동은 안내받은 순서대로 시작하기", "새 경험", ["학급 활동", "수업"], 1, "new-activity"),
    e("🙋", "새로운 역할을 맡으면 맡은 일을 하나씩 해보기", "역할 도전", ["수업", "학급 활동"], 2, "role-challenge"),
    e("👥", "새 짝이 정해지면 먼저 반갑게 인사하기", "관계 도전", ["짝 활동", "모둠 활동"], 1, "new-partner"),
    e("💡", "새로 배운 내용을 학교생활에서 한 번 활용해보기", "배움 활용", ["수업", "학교생활"], 1, "use-new-learning"),
    e("🗣️", "배운 내용을 내 말로 설명해보기", "이해", ["수업", "짝 활동"], 2, "explain-learning"),
    e("❓", "궁금한 점의 답을 찾을 자료 한 가지 고르기", "탐구", ["수업", "탐구 활동"], 1, "ask-one-question"),
    e("🛣️", "어려운 문제의 조건을 그림으로 나타내보기", "문제 해결", ["수업", "자율 학습"], 2, "retry-another-way"),
    e("💡", "새로운 방법을 배우면 직접 따라 해보기", "적용", ["수업", "모둠 활동"], 1, "try-learned-method"),
    e("🏃", "새로운 동작은 안전 수칙을 지키며 도전하기", "신체 도전", ["체육 수업", "운동장"], 1, "new-movement"),
    e("📈", "연습할 부분 한 가지를 선생님께 물어보기", "연습", ["수업", "자율 학습"], 1, "practice-again"),
    e("📄", "해야 할 일에서 먼저 할 부분 한 가지 정하기", "집중", ["자율 학습", "수업"], 2, "choose-first-part"),
    e("🔭", "더 알고 싶은 내용은 책이나 수업 자료에서 찾아보기", "탐구", ["수업", "프로젝트"], 2, "explore-more"),
    e("🪞", "틀린 까닭을 정답이나 예시와 비교해보기", "성장 확인", ["수업", "창작 활동"], 2, "improve-once-more"),
    e("🏅", "고친 뒤 처음과 달라진 부분 확인하기", "성장 확인", ["수업", "과제 확인"], 2, "check-improvement"),
    e("🎬", "긴장되는 일은 친구와 함께 미리 연습하기", "연습", ["수업", "교실"], 1, "supported-rehearsal"),
    e("🔧", "잘되지 않은 방법에서 고칠 점 하나 정하기", "실수 활용", ["수업", "창작 활동"], 2, "change-after-failure"),
    e("🌟", "도전하는 친구에게 응원의 말 건네기", "함께 성장", ["수업", "체육 활동"], 1, "encourage-challenge"),
    e("🧪", "예상과 다른 결과가 나와도 이유 찾아보기", "탐구", ["수업", "탐구 활동"], 2, "unexpected-result"),
    e("🧭", "막히는 문제가 생기면 알고 있는 내용부터 확인하기", "전략", ["수업", "자율 학습"], 2, "review-known"),
    e("🪜", "어려운 글은 문단별로 나누어 읽기", "전략", ["독서 활동", "수업"], 2, "read-in-parts"),
    e("🔁", "연습할 시간을 정해 오늘 실천하기", "꾸준한 연습", ["수업", "학급 활동"], 1, "practice-today"),
    e("🧰", "새로운 학습 도구를 사용하기 전에 사용법 확인하기", "도구 익히기", ["수업", "창작 활동"], 1, "learn-new-tool"),
  ],
  "존중과 배려": [
    e("😊", "친구가 원하는 이름을 정확하게 불러주기", "이름 존중", ["학교생활", "대화"], 1, "name-respect"),
    e("🙇", "도움을 부탁할 때 “도와주세요”라고 말하기", "예절", ["학교생활", "대화"], 1, "polite-request"),
    e("👂", "다른 사람의 말이 끝난 뒤 내 의견 말하기", "경청", ["수업", "대화"], 1, "wait-speaking-turn"),
    e("⭐", "친구의 외모보다 행동과 노력을 칭찬하기", "말 배려", ["학교생활", "대화"], 2, "praise-action"),
    e("🌍", "친구가 가족이나 생활 이야기를 할 때 끝까지 들어주기", "다름 존중", ["수업", "학교생활"], 1, "culture-respect"),
    e("💬", "친구가 좋아하는 것을 말하면 관심 있게 들어주기", "다름 존중", ["학교생활", "대화"], 1, "preference-listening"),
    e("🔤", "처음 만난 친구에게 이름 발음을 직접 물어보기", "이름 존중", ["새 학기", "학교생활"], 1, "name-pronunciation"),
    e("🤲", "도움을 주기 전에 어떤 도움이 필요한지 묻기", "도움 배려", ["학교생활", "모둠 활동"], 2, "ask-before-help"),
    e("↔️", "누구나 편하게 이동할 수 있도록 통로 비워주기", "이동 배려", ["복도", "교실"], 1, "accessible-path"),
    e("👀", "화면이나 게시물을 볼 때 뒤 친구를 위해 옆으로 비켜주기", "관람 배려", ["수업", "학급 활동"], 1, "view-space"),
    e("🔉", "집중하는 친구 가까이에서는 목소리 낮추기", "학습 배려", ["교실", "도서관"], 1, "quiet-near-study"),
    e("✋", "친구의 몸에 닿기 전에 괜찮은지 물어보기", "경계 존중", ["학교생활", "놀이 활동"], 1, "body-permission"),
    e("🙆", "친구가 함께하지 않겠다고 하면 알겠다고 말하기", "경계 존중", ["학교생활", "놀이 활동"], 1, "accept-no"),
    e("🛑", "상대가 불편하다고 말한 행동은 바로 멈추기", "경계 존중", ["학교생활", "놀이 활동"], 1, "stop-discomfort"),
    e("📷", "친구의 사진이나 영상을 찍기 전에 허락받기", "개인정보", ["학교 행사", "학교생활"], 1, "media-permission"),
    e("🔒", "친구 연락처를 다른 사람에게 알려주기 전에 허락받기", "개인정보", ["온라인 소통", "학교생활"], 1, "privacy-respect"),
    e("🎒", "친구의 가방이나 사물은 허락받고 만지기", "물건 존중", ["교실", "학교생활"], 1, "belonging-permission"),
    e("💬", "의견이 다를 때 “나는 다르게 생각해”라고 말하기", "의견 존중", ["토의", "학급 회의"], 2, "respectful-disagreement"),
    e("🧠", "의견이 다른 친구에게 그렇게 생각한 이유 물어보기", "의견 존중", ["토의", "모둠 활동"], 2, "learn-difference"),
    e("🎤", "친구가 생각하며 말할 때 끝까지 기다려주기", "경청", ["수업", "대화"], 1, "wait-thinking-speaker"),
    e("📖", "활동 안내를 놓친 친구에게 조용히 설명해주기", "학습 배려", ["수업", "모둠 활동"], 1, "explain-directions"),
    e("📝", "결석한 친구가 돌아오면 도움이 필요한지 물어보기", "학습 배려", ["교실", "수업"], 2, "welcome-absent"),
    e("🗺️", "새로 온 친구에게 필요한 안내가 있는지 물어보기", "새 친구 배려", ["새 학기", "학교생활"], 1, "welcome-check"),
    e("🧑‍🤝‍🧑", "모둠 자료는 모든 친구가 볼 수 있게 놓기", "포용", ["모둠 활동", "학급 활동"], 2, "share-group-view"),
    e("🙂", "친구가 힘들다고 말하면 원하는 도움을 물어보기", "관심", ["교실", "쉬는 시간"], 1, "check-friend"),
    e("🫶", "친구가 위험하다고 말하면 함께 선생님께 알리기", "안전 도움", ["대화", "상담", "안전 교육"], 2, "seek-help-together"),
    e("💐", "학교를 깨끗이 관리해 주시는 분께 감사 인사하기", "감사", ["학교생활", "청소 시간"], 1, "staff-thanks"),
    e("🏫", "다른 반 친구와 같은 활동을 하면 먼저 이름 소개하기", "학교 인사", ["학급 활동", "학교생활"], 1, "greet-other-class"),
    e("🔎", "친구가 찾는 물건을 발견하면 위치 알려주기", "도움 배려", ["교실", "학교생활"], 1, "locate-item-help"),
    e("☂️", "우산이 없는 친구에게 도움이 필요한지 물어보기", "도움 배려", ["등하교", "비 오는 날"], 1, "rain-help"),
    e("🧤", "물건을 떨어뜨린 친구에게 주워 건네기", "도움 배려", ["학교생활", "이동 시간"], 1, "pick-up-help"),
    e("📦", "친구가 준비물을 정리할 때 필요한 공간 내어주기", "공간 배려", ["교실", "수업 후"], 1, "make-space"),
    e("🎨", "친구의 작품에서 마음에 드는 부분 한 가지 말하기", "작품 존중", ["미술 수업", "발표"], 1, "art-appreciation"),
    e("🏷️", "친구를 별명으로 부르기 전에 괜찮은지 물어보기", "이름 존중", ["학교생활", "대화"], 1, "nickname-consent"),
    e("🌈", "친구의 장점 한 가지를 말해주기", "다름 존중", ["학급 활동", "대화"], 2, "strength-diversity"),
  ],
};

const expectedCounts = {
  "친구 관계": 55,
  "수업 생활": 50,
  "공동체 생활": 45,
  "갈등 해결": 40,
  "책임감": 40,
  "성장과 도전": 35,
  "존중과 배려": 35,
};

const allWeekdays = ["월요일", "화요일", "수요일", "목요일", "금요일"];
const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const placeContexts = new Set(["교실", "운동장", "도서관", "급식실", "화장실", "복도", "계단", "출입문", "강당", "특별실", "학교 숲", "교문"]);
const timeContexts = new Set(["등교", "아침 활동", "수업 전", "쉬는 시간", "점심시간", "하교", "하교 전", "수업 후", "급식 전", "발표 전", "갈등 후"]);
const channelContexts = new Set(["온라인 학습", "온라인 소통", "학급 온라인 공간"]);
const situationContexts = new Set(["갈등 상황", "비상 상황", "비 오는 날", "새 학기", "안전 교육", "대피 훈련"]);

function buildContextTags(contexts) {
  const result = { places: [], times: [], activities: [], situations: [], channels: [] };
  for (const context of contexts) {
    if (placeContexts.has(context)) result.places.push(context);
    else if (timeContexts.has(context)) result.times.push(context);
    else if (channelContexts.has(context)) result.channels.push(context);
    else if (situationContexts.has(context)) result.situations.push(context);
    else result.activities.push(context);
  }
  for (const key of Object.keys(result)) if (result[key].length === 0) result[key] = ["any"];
  return result;
}

function getTriggerTags(contexts) {
  const triggers = [];
  if (contexts.includes("새 학기")) triggers.push("term_start");
  if (contexts.includes("비 오는 날")) triggers.push("rainy_day");
  if (contexts.includes("현장 체험")) triggers.push("field_trip");
  if (contexts.some((value) => channelContexts.has(value))) triggers.push("online");
  if (contexts.some((value) => value.includes("갈등"))) triggers.push("conflict");
  if (contexts.some((value) => value.includes("발표"))) triggers.push("presentation");
  if (contexts.some((value) => value.includes("비상") || value.includes("대피") || value.includes("안전"))) triggers.push("safety");
  return triggers.length > 0 ? [...new Set(triggers)] : ["any_school_day"];
}

function getRecommendedMonths(triggerTags) {
  if (triggerTags.includes("term_start")) return [3, 9];
  if (triggerTags.includes("rainy_day")) return [6, 7];
  return allMonths;
}

function getCanonicalGroup(category, entry) {
  const text = `${entry.sub_category} ${entry.message}`;
  if (entry.sub_category.includes("발표")) return "presentation-performance";
  if (/개인 물건|자기 물건|개인 준비물/u.test(text)) return "personal-belongings";
  if (/빌리|빌린|빌려/u.test(text)) return "borrowed-property";
  if (/공동 물품|학급 물품|수업 도구|함께 쓰는 물건/u.test(text)) return "shared-materials";
  if (/과제|제출/u.test(text)) return "assignment-completion";
  if (/풀이|계산|수학 문제|답을/u.test(text)) return "math-problem-solving";
  if (/인사|환영|처음 만난|새 짝/u.test(text)) return "greeting-welcome";
  if (/허락|경계|멈춰 달라|불편.*멈추/u.test(text)) return "consent-boundaries";
  if (/개인정보|비밀번호|연락처|사진|영상/u.test(text)) return "privacy-digital-safety";
  if (/비상|대피|위험|다친|안전한 곳|괴롭힘|놀림|소문/u.test(text)) return "safety-adult-help";
  if (/경청|들어주|끝까지 듣|말할 준비|기다려주/u.test(text)) return "listening-patience";
  if (/감사|고맙|칭찬|응원|축하/u.test(text)) return "encouragement-gratitude";
  if (/차례|순서|기다리기/u.test(text)) return "turn-taking";
  if (/물건|학용품|준비물|공동 물품|도구|가위/u.test(text)) return "property-materials";
  if (/도움|도와|어른께 알리|선생님께 알리|요청/u.test(text)) return "help-seeking-offering";
  if (/정리|정돈|청소|분리배출/u.test(text)) return "cleanup-environment";
  if (/손 씻|기침|재채기|몸이 불편|물 마시|체육 활동 전에/u.test(text)) return "health-hygiene";
  if (/온라인|인터넷|출처|계정|로그아웃/u.test(text)) return "digital-citizenship";
  if (/발표|공연|무대/u.test(text)) return "presentation-performance";
  if (/과제|제출|풀이|문제|답|계산/u.test(text)) return "task-problem-solving";
  if (/읽|글|낱말|문장|요약/u.test(text)) return "literacy-learning";
  if (/모둠|역할|함께 정한|학급에서 할 일/u.test(text)) return "group-cooperation";
  if (/시간|하교|수업 시작|쉬는 시간|일정|날까지/u.test(text)) return "time-routine";
  if (/준비|시간표|책상 위/u.test(text)) return "learning-preparation";
  if (/실수|사과|바로잡|해결|갈등|다툼|오해/u.test(text)) return "conflict-repair";
  if (/목표|도전|시도|연습|피드백|고친|나아진/u.test(text)) return "growth-challenge";
  if (/문화|다름|장점|이름|포용|통로|시야/u.test(text)) return "inclusion-respect";
  if (/놀이|함께 놀/u.test(text)) return "play-inclusion";
  if (/꽃|나무|생명|종이|수도꼭지/u.test(text)) return "environment-care";
  const generalGroups = {
    "친구 관계": "friend-relationship",
    "수업 생활": "class-learning",
    "공동체 생활": "community-life",
    "갈등 해결": "conflict-dialogue",
    "책임감": "responsibility-habits",
    "성장과 도전": "growth-exploration",
    "존중과 배려": "respect-care",
  };
  return generalGroups[category] ?? "school-life-general";
}

const bullyingSubIntents = new Set([
  "report-bullying", "report-repeated-play", "report-teasing", "ask-adult-help",
  "report-rumor", "save-online-evidence", "show-online-evidence", "move-safe",
  "exclusion-help", "report-recurrence",
  "report-harmful-rumor", "preserve-and-report-online", "bystander-report-online",
  "repeated-exclusion-help",
]);

function getSafetyMetadata(category, subIntent, contexts, message) {
  const conflictType = category === "갈등 해결"
    ? (bullyingSubIntents.has(subIntent) ? "bullying_or_violence" : "everyday_peer_conflict")
    : "not_applicable";
  const requiresAdultSupport = conflictType === "bullying_or_violence"
    || (/(선생님|어른)/u.test(message) && /(알리기|도움 요청하기|가져다드리기|보여주기|함께 이야기하기)$/u.test(message));
  const safetyPriority = conflictType === "bullying_or_violence"
    ? 3
    : (/비상|대피|위험|다친|안전|손 씻|비누로 씻기|기침|재채기|몸이 불편|30초|부딪|멈춤 신호|복도|계단|가위|흘린 물|식판|망가진 도구|도구를 사용하다 이상|도구에 이상|새로운 학습 도구|청소 도구|준비운동/u.test(message)
      || contexts.some((value) => /안전|비상|대피|건강/u.test(value)) ? 2 : 1);
  return { conflictType, requiresAdultSupport, safetyPriority };
}

for (const [category, count] of Object.entries(expectedCounts)) {
  if (categories[category].length !== count) {
    throw new Error(`${category}: expected ${count}, got ${categories[category].length}`);
  }
}

let index = 0;
const messages = Object.entries(categories).flatMap(([category, entries]) =>
  entries.map((entry) => {
    index += 1;
    const triggerTags = getTriggerTags(entry.school_contexts);
    const canonicalGroup = getCanonicalGroup(category, entry);
    const { conflictType, requiresAdultSupport, safetyPriority } = getSafetyMetadata(
      category,
      entry.similar_group,
      entry.school_contexts,
      entry.message,
    );
    return {
      id: `SCHOOL-${String(index).padStart(3, "0")}`,
      emoji: entry.emoji,
      message: entry.message,
      display_text: `2. ${entry.emoji} ${entry.message}`,
      category,
      sub_category: entry.sub_category,
      school_contexts: entry.school_contexts,
      context_tags: buildContextTags(entry.school_contexts),
      trigger_tags: triggerTags,
      level: entry.level,
      recommended_weekdays: allWeekdays,
      recommended_months: getRecommendedMonths(triggerTags),
      similar_group: canonicalGroup,
      sub_intent: entry.similar_group,
      conflict_type: conflictType,
      requires_adult_support: requiresAdultSupport,
      safety_priority: safetyPriority,
      active: true,
    };
  }),
);

const contextDimensions = ["places", "times", "activities", "situations", "channels"];
const contextVocabularies = Object.fromEntries(contextDimensions.map((dimension) => [
  dimension,
  [...new Set(messages.flatMap((item) => item.context_tags[dimension]))].sort(),
]));
const triggerVocabulary = [...new Set(messages.flatMap((item) => item.trigger_tags))].sort();

const output = {
  version: "1.0",
  type: "evergreen-school-life-message-db",
  total: messages.length,
  level_definitions: {
    "1": "한 번의 관찰 가능한 행동으로 바로 실천하기",
    "2": "상황을 판단하거나 다른 사람과 조율하며 실천하기",
    "3": "여러 관점을 비교하거나 해결 방법을 구성해 실천하기",
  },
  safety_priority_definitions: {
    "1": "일상에서 바로 실천하는 일반 문구",
    "2": "건강·안전 절차를 주의해서 실천하는 문구",
    "3": "학교폭력·위험 상황에서 어른의 도움이 필요한 문구",
  },
  selection_policy: {
    weekday_mode: "soft_preference",
    month_mode: "soft_preference",
    recent_message_cooldown: 30,
    similar_group_cooldown: 7,
    category_balance_window: 35,
    trigger_fallback: "any_school_day",
  },
  context_dimensions: contextDimensions,
  context_vocabularies: contextVocabularies,
  trigger_vocabulary: triggerVocabulary,
  messages,
};

const outputPath = path.resolve("src/data/school-life-message-db.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Generated ${messages.length} messages at ${outputPath}`);
