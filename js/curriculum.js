// 17주차 커리큘럼 (수업 계획서 기준). 수정이 필요하면 이 파일만 고치면 됩니다.
window.CURRICULUM = [
  { week: 1,  phase: 1, eval: "–",                 activity: "OT (45분): 수업 취지, 평가 기준 공개, 사이트 가입, 성장목표 초안 작성", scaffold: "없음 (진단)", tool: "계정 생성, 성장목표 초안 등록" },
  { week: 2,  phase: 1, eval: "기능적 평가①",       activity: "기본기 진단과 개별 면담(50분)으로 성장목표 확정. 나머지 학생은 몸풀기", scaffold: "없음 (진단)", tool: "진단 영상 업로드, 확정된 성장목표를 로그인 화면에 표시", basics: true },
  { week: 3,  phase: 2, eval: "수행적 평가 (과정)", activity: "시 감상과 토론, 조 편성. 첫 낭독 영상 촬영(비교 기준점)", scaffold: "높음", tool: "교사가 서브텍스트 질문지 제공 (화자, 청자, 숨은 마음)", baseline: true },
  { week: 4,  phase: 2, eval: "수행적 평가 (과정)", activity: "화자를 인물로 바꿔 분석: 목표·장애물·전술", scaffold: "높음", tool: "교사가 전 과정 시범" },
  { week: 5,  phase: 2, eval: "수행적 평가 (과정)", activity: "조마다 다른 상황 설정을 붙임 (언제, 어디서, 누구에게 하는 말인가). 같은 시가 다른 서브텍스트를 갖게 됨", scaffold: "높음", tool: "반쯤 채운 분석지" },
  { week: 6,  phase: 2, eval: "수행적 평가①",       activity: "장면 만들기 피칭 발표 (어떻게 해석했고, 화자는 누구고, 기획을 어떻게 할 건지)", scaffold: "높음", tool: "영상 아카이빙, 일지" },
  { week: 7,  phase: 3, eval: "수행적 평가 (과정)", activity: "시의 앞뒤 상황을 상상해 장면 대본 쓰기 (국어과 시 재구성 활동 연계)", scaffold: "중간", tool: "질문만 제공" },
  { week: 8,  phase: 3, eval: "수행적 평가 (과정)", activity: "조별 대본 완성, 배역 정하기, 리허설", scaffold: "중간", tool: "교사는 질문으로만 개입" },
  { week: 9,  phase: 3, eval: "기능적 평가②",       activity: "중간 기본기 점검. 2주차와 비교, 면담에서 성장목표 수정", scaffold: "중간", tool: "비교 영상", basics: true },
  { week: 10, phase: 3, eval: "수행적 평가②",       activity: "연습 시간 및 피드백 점검", scaffold: "중간", tool: "영상, 일지" },
  { week: 11, phase: 4, eval: "수행적 평가 (과정)", activity: "연습 시간 및 피드백 점검", scaffold: "중간", tool: "영상, 일지" },
  { week: 12, phase: 4, eval: "수행적 평가 (과정)", activity: "연습 시간 및 피드백 점검", scaffold: "중간", tool: "영상, 일지" },
  { week: 13, phase: 4, eval: "수행적 평가 (과정)", activity: "연습 시간 및 피드백 점검", scaffold: "중간", tool: "영상, 일지" },
  { week: 14, phase: 4, eval: "수행적 평가 (과정)", activity: "리허설. 교사 피드백은 학생이 요청할 때만", scaffold: "거의 없음", tool: "요청 시 피드백", requestOnly: true },
  { week: 15, phase: 4, eval: "수행적 평가 (과정)", activity: "처음부터 끝까지 런스루, 최종 수정", scaffold: "없음 (독립)", tool: "독립 수행", requestOnly: true },
  { week: 16, phase: 4, eval: "기능적 평가③",       activity: "최종 기본기 평가", scaffold: "없음 (독립)", tool: "포트폴리오 정리", basics: true, requestOnly: true },
  { week: 17, phase: 4, eval: "발표",               activity: "조별 장면 쇼케이스 · 성장목표 달성 보고서 제출", scaffold: "없음 (독립)", tool: "포트폴리오 완성", report: true, requestOnly: true },
];

window.PHASES = {
  1: "진단과 목표 설정",
  2: "함께 읽기",
  3: "시를 장면으로 넓히기",
  4: "혼자 해석하기",
};

// 비계 수준 → 0~3 (막대 표시용)
window.SCAFFOLD_LEVEL = (s) =>
  s.startsWith("높음") ? 3 : s.startsWith("중간") ? 2 : s.startsWith("거의") ? 1 : 0;
