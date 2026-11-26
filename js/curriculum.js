// 수업 데이터. 문구·채점 기준·비율을 바꾸려면 이 파일만 고치면 됩니다.

// help: 선생님 도움 정도 (3 많이 · 2 보통 · 1 조금 · 0 스스로 · null 진단)
// activity: 교사용 원래 계획 (교사 화면에 작게 표시)
window.CURRICULUM = [
  { week: 1,  phase: 1, title: "OT · 나의 목표",     todo: "성장목표 초안 쓰기",          help: null, activity: "수업 취지, 평가 기준 공개, 사이트 가입, 성장목표 초안" },
  { week: 2,  phase: 1, title: "기본기 진단",        todo: "진단 영상 올리기 · 목표 면담", help: null, activity: "기본기 진단, 개별 면담(50분)으로 성장목표 확정", basics: true },
  { week: 3,  phase: 2, title: "시 읽기 · 첫 낭독",  todo: "첫 낭독 영상 올리기",          help: 3, activity: "시 감상·토론, 조 편성, 첫 낭독 촬영 / 서브텍스트 질문지", baseline: true },
  { week: 4,  phase: 2, title: "화자를 인물로",      todo: "목표 · 장애물 · 전술 찾기",    help: 3, activity: "화자 → 인물 분석 / 교사 전 과정 시범" },
  { week: 5,  phase: 2, title: "상황 붙이기",        todo: "언제 · 어디서 · 누구에게",     help: 3, activity: "조별 상황 설정, 같은 시 다른 서브텍스트 / 반쯤 채운 분석지" },
  { week: 6,  phase: 2, title: "장면 피칭",          todo: "해석과 기획 발표",             help: 3, activity: "장면 만들기 피칭 발표 (해석·화자·기획)" },
  { week: 7,  phase: 3, title: "대본 쓰기",          todo: "시의 앞뒤 상상하기",           help: 2, activity: "시의 앞뒤 상황으로 장면 대본 (국어과 연계) / 질문만 제공" },
  { week: 8,  phase: 3, title: "대본 완성 · 배역",   todo: "리허설",                       help: 2, activity: "조별 대본 완성, 배역, 리허설 / 질문으로만 개입" },
  { week: 9,  phase: 3, title: "기본기 중간 점검",   todo: "2주차와 비교 · 목표 수정",     help: 2, activity: "중간 기본기 점검, 2주차 비교, 성장목표 수정 면담", basics: true },
  { week: 10, phase: 3, title: "장면 중간 점검",     todo: "연습 영상 올리기",             help: 2, activity: "연습 및 피드백 점검" },
  { week: 11, phase: 4, title: "연습",               todo: "연습 영상 · 일지",             help: 2, activity: "연습 및 피드백 점검" },
  { week: 12, phase: 4, title: "연습",               todo: "연습 영상 · 일지",             help: 2, activity: "연습 및 피드백 점검" },
  { week: 13, phase: 4, title: "연습",               todo: "연습 영상 · 일지",             help: 2, activity: "연습 및 피드백 점검" },
  { week: 14, phase: 4, title: "리허설",             todo: "필요하면 피드백 요청",         help: 1, activity: "리허설, 피드백은 요청 시에만", requestOnly: true },
  { week: 15, phase: 4, title: "런스루",             todo: "처음부터 끝까지",              help: 0, activity: "전체 런스루, 최종 수정 / 독립 수행", requestOnly: true },
  { week: 16, phase: 4, title: "최종 기본기",        todo: "기본기 영상 올리기",           help: 0, activity: "최종 기본기 평가, 포트폴리오 정리", basics: true, requestOnly: true },
  { week: 17, phase: 4, title: "쇼케이스",           todo: "발표 · 성장 보고서 제출",      help: 0, activity: "조별 장면 쇼케이스, 성장목표 달성 보고서", report: true, requestOnly: true },
];

window.PHASES = { 1: "목표 세우기", 2: "함께 읽기", 3: "장면 만들기", 4: "혼자 해석하기" };
window.HELP_LABEL = ["스스로", "조금", "보통", "많이"];

// ---------- 평가 ----------
window.CATEGORIES = { basics: "기본기", scene: "장면", process: "과정", report: "보고서" };
window.DEFAULT_WEIGHTS = { basics: 30, scene: 40, process: 20, report: 10 }; // 합계 100

// 항목별 채점 기준 (각 1~5점)
window.CRITERIA = {
  basics: ["호흡·발성", "발음·화술", "몸·움직임", "집중·반응"],
  scene:  ["해석", "인물", "표현", "앙상블"],
  report: ["목표 성찰", "근거", "다음 목표"],
};
window.LEVELS = ["", "미흡", "노력", "보통", "우수", "탁월"];

window.ASSESSMENTS = [
  { key: "f1", cat: "basics", week: 2,  title: "기본기 ①", sub: "진단" },
  { key: "f2", cat: "basics", week: 9,  title: "기본기 ②", sub: "중간" },
  { key: "f3", cat: "basics", week: 16, title: "기본기 ③", sub: "최종" },
  { key: "p1", cat: "scene",  week: 6,  title: "장면 ①",   sub: "피칭" },
  { key: "p2", cat: "scene",  week: 10, title: "장면 ②",   sub: "중간" },
  { key: "p3", cat: "scene",  week: 17, title: "장면 ③",   sub: "쇼케이스" },
  { key: "rp", cat: "report", week: 17, title: "성장 보고서", sub: "제출" },
];

window.GRADE = (s) => (s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "E");
