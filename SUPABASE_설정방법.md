# Supabase 연동 방법 (약 10분)

연동하면 학생·교사가 각자의 폰·노트북에서 같은 기록을 보게 됩니다.
코드는 이미 준비되어 있고, 아래 4단계만 하면 됩니다.

---

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 접속 → **Start your project** → **Continue with GitHub** 로 가입
2. **New project**
   - Name: `serin-archive`
   - Database Password: 아무거나 길게 (따로 적어 두기만 하면 됨, 사이트에는 안 씀)
   - Region: **Northeast Asia (Seoul)**
3. **Create new project** → 1~2분 기다리기

## 2. DB 만들기 (복사 → 붙여넣기 → Run)
1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. `supabase/setup.sql` 파일을 메모장으로 열어 **전체 복사** → 붙여넣기
3. 오른쪽 아래 **Run** → 아래에 `Success. No rows returned` 가 뜨면 완료

> 혹시 "destructive operation" 경고 창이 뜨면 **Run this query** 를 누르세요. (권한을 정리하는 줄 때문에 뜨는 경고이며, 데이터를 지우지 않습니다.)

## 3. 주소와 키 복사해서 넣기
1. 왼쪽 아래 톱니바퀴 **Project Settings** → **API** (또는 **API Keys**) 메뉴
2. 두 값을 복사
   - **Project URL** — `https://xxxxxxxx.supabase.co`
   - **anon public** 키 (긴 `eyJ...` 문자열) 또는 **Publishable key** (`sb_publishable_...`)
   - ⚠️ `service_role` / `secret` 키는 **절대** 쓰지 마세요.
3. `js/config.js` 를 열어 따옴표 안에 붙여넣기

```js
window.SERIN_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_KEY: "sb_publishable_xxxxxxxx",
};
```

## 4. GitHub에 올리기
- 이미 저장소가 있다면 **`js/config.js` 하나만** 새 파일로 바꿔 올리면 됩니다. (처음 올리는 거라면 폴더 전체 업로드 → README의 GitHub Pages 방법 참고)
- 1~2분 뒤 사이트를 새로고침 → 로그인 화면 아래에 **● 온라인 모드** 가 보이면 성공

---

## 사이트를 업데이트했을 때
새 버전을 받으면 **2단계 SQL을 한 번 더 Run** 해 주세요. 기존 기록은 그대로 두고 새 기능(평가 등)만 추가됩니다.

## 처음 사용 순서
1. **선생님 먼저 가입** — 회원가입 → "교사" 선택 → 교사 가입 코드 `SERIN2026`
2. 교사 계정 → **설정**
   - 교사 코드를 다른 것으로 바꾸기 (학생에게 알려지지 않게)
   - 1주차 시작일 설정 → '이번 주차'가 자동 계산됨
   - 평가 비율 확인 (기본: 기본기 30 · 장면 40 · 과정 20 · 보고서 10)
3. 학생들에게 사이트 주소 공유 → 각자 학생으로 가입 → 성장목표 초안 작성

## 이렇게 동작합니다
- 학생은 **자기 기록만**, 교사는 **전체 학생 기록**을 봅니다. 이 규칙은 DB가 직접 지키기 때문에 사이트 코드를 열어 봐도 남의 기록은 볼 수 없습니다.
- 성장목표 **확정·수정**, **피드백**, **평가**는 교사만 할 수 있습니다. 평가 점수는 학생에게 보이지 않습니다.
- 비밀번호는 DB에 암호화되어 저장됩니다. 로그인은 30일 유지됩니다.
- 영상은 링크만 저장하므로 무료 용량으로 충분합니다.

## 자주 생기는 문제
| 화면에 뜨는 말 | 해결 |
|---|---|
| DB 설정이 안 되어 있습니다 | 2단계 SQL을 다시 Run |
| API 키가 올바르지 않습니다 | 3단계 키를 다시 복사 (앞뒤 공백 주의, `service_role` 아님) |
| 서버에 연결할 수 없습니다 | `SUPABASE_URL` 주소 확인 / 프로젝트가 일시정지됐는지 대시보드 확인 |
| 로그인 화면에 ● 온라인 모드가 안 보임 | `config.js`가 GitHub에 반영됐는지, 브라우저 새로고침(Ctrl+Shift+R) |

- 무료 플랜은 한동안 아무도 쓰지 않으면 프로젝트가 **일시정지**될 수 있습니다. 대시보드에서 **Restore** 한 번이면 다시 켜집니다. 발표 전날 한 번 접속해 두세요.
- 비밀번호를 잊은 학생: Supabase → **Table Editor → app_users** 에서 그 학생 줄을 지우고 다시 가입시키면 됩니다. (기록도 함께 지워지니 주의)
- 기록 백업: 교사 계정 → 설정 → **JSON 내보내기** / 성적은 평가 → **CSV 내보내기**
