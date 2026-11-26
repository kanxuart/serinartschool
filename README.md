# 세린예고 Acting Archive

세린예술고등학교 연기과 1학년 **국어·연기 융합수업** 연습 일지 & 영상 아카이브 사이트.
Vygotsky의 근접발달영역(ZPD)·비계설정 개념에 따라, 17주 동안 교사의 도움(비계)이 줄어드는 과정을 학생 스스로 기록합니다.

## 기능

| 흐름 | 내용 |
|---|---|
| 회원가입 | 학생(이름·학번·조) / 교사(가입 코드 필요: `SERIN2026`) |
| 로그인 → 성장목표 화면 | 첫 로그인 시 성장목표 초안 작성(1주차). 이후 로그인할 때마다 현재 성장목표가 크게 표시되고, 모든 화면 상단 띠에도 계속 보임 |
| 홈 | 이번 주차 활동, 비계 곡선(17주), 17주 카탈로그(작성·피드백·요청 상태) |
| 일지 | 주차별: 한 것 / 발견 / 다음 할 것 / 자기평가(1~5) / 영상 링크 / 피드백 요청 |
| 아카이브 | 기본기 비교(2·9·16주), 낭독 비교(3주 기준점 ↔ 최근), 단계별 영상 모음 |
| 포트폴리오 | 성장목표 변화, 자기평가 곡선, 전체 기록, **성장목표 달성 보고서** → 인쇄/PDF 저장 |
| 교사 | 학생 목록, 피드백 요청 알림, 성장목표 확정(2주)·수정(9주), 주차별 피드백 작성 |

영상은 파일 대신 **링크**로 올립니다 (YouTube 일부공개, Google Drive, Vimeo 자동 재생).

## GitHub Pages로 배포하기 (5분)

1. GitHub에서 **New repository** → 이름 예: `serin-acting-archive` → Public → Create
2. **uploading an existing file** 클릭 → 이 폴더 안의 파일·폴더 전체(`index.html`, `css`, `js`, `assets`, `supabase`, `.nojekyll` 등)를 끌어다 놓기 → Commit
3. **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save
4. 1~2분 뒤 `https://<깃허브아이디>.github.io/serin-acting-archive/` 에서 열림

터미널을 쓴다면:
```bash
cd serin-acting-archive
git init && git add . && git commit -m "세린예고 Acting Archive"
git branch -M main
git remote add origin https://github.com/<아이디>/serin-acting-archive.git
git push -u origin main
```

## 시연 방법
(로컬 시연 모드) `student / 1234`(학생), `teacher / 1234`(교사)로 바로 로그인.

## 두 가지 모드
- **온라인 모드 (실제 수업용)** — `js/config.js`에 Supabase 주소·키를 넣으면 모든 기기가 같은 기록을 봅니다. → **`SUPABASE_설정방법.md`** 참고
- **로컬 시연 모드** — `config.js`를 비워 두면 이 브라우저에만 저장됩니다. 시연용 계정이 자동으로 만들어집니다.

## 수정 포인트
- 커리큘럼: `js/curriculum.js`
- 교사 가입 코드: 온라인 모드는 교사 계정 → 수업 설정 / 로컬 모드는 `js/store.js` 의 `TEACHER_CODE`
- Supabase 연결: `js/config.js`
- 로고: `assets/logo.svg`
- 색·글꼴: `css/style.css` 맨 위 `:root`
