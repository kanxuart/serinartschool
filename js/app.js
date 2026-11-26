(function () {
  const $app = document.getElementById("app");
  const C = window.CURRICULUM, P = window.PHASES, S = window.Store;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
  const go = (h) => (location.hash = h);
  const week = (n) => C.find((c) => c.week === +n);
  const logo = (cls = "") => `<img src="assets/logo.svg" alt="세린예고" class="logo ${cls}">`;

  function scaffoldBar(s) {
    const lv = window.SCAFFOLD_LEVEL(s);
    return `<span class="scaf" title="비계 수준: ${esc(s)}">${[1, 2, 3].map((i) => `<i class="${i <= lv ? "on" : ""}"></i>`).join("")}<em>${esc(s)}</em></span>`;
  }

  function videoEmbed(url) {
    const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
    if (yt) return `<div class="frame"><iframe src="https://www.youtube.com/embed/${yt[1]}" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    const gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (gd) return `<div class="frame"><iframe src="https://drive.google.com/file/d/${gd[1]}/preview" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `<div class="frame"><iframe src="https://player.vimeo.com/video/${vm[1]}" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return `<div class="frame"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
    return `<a class="frame link" href="${esc(url)}" target="_blank" rel="noopener">영상 링크 열기 ↗</a>`;
  }

  function entryStatus(userId, w) {
    const e = S.entry(userId, w);
    if (!e) return "empty";
    if (e.requestFeedback) return "request";
    if (e.feedback && e.feedback.length) return "feedback";
    return "written";
  }
  const STATUS_LABEL = { empty: "미작성", written: "작성", feedback: "피드백", request: "피드백 요청" };

  // ---------- shell ----------
  function shell(me, body, active) {
    const nav = me.role === "teacher"
      ? [["#/teacher", "학생 목록", "teacher"], ["#/settings", "수업 설정", "settings"]]
      : [["#/home", "홈", "home"], ["#/journal/" + S.currentWeek(), "일지", "journal"], ["#/archive", "아카이브", "archive"], ["#/portfolio", "포트폴리오", "portfolio"]];
    const goal = me.role === "student" ? S.currentGoal(me.id) : null;
    return `
      <header class="top">
        <a href="${me.role === "teacher" ? "#/teacher" : "#/home"}" class="brand">${logo("sm")}<span><b>세린예고</b><small>ACTING ARCHIVE</small></span></a>
        <nav>${nav.map(([h, t, k]) => `<a href="${h}" class="${active === k ? "on" : ""}">${t}</a>`).join("")}</nav>
        <div class="who"><span>${esc(me.name)} <small>${me.role === "teacher" ? "교사" : esc(me.group || "")}</small></span><button class="ghost" data-act="logout">로그아웃</button></div>
      </header>
      ${goal ? `<a href="#/welcome" class="ribbon"><span class="tag">${esc(goal.status)}</span> 나의 성장목표 — ${esc(goal.text)}</a>` : ""}
      <main class="wrap">${body}</main>
      <footer class="foot">세린예술고등학교 연기과 · ${esc(S.db.settings.className)} · 17주 과정</footer>`;
  }

  // ---------- views ----------
  function viewAuth(mode) {
    const signup = mode === "signup";
    return `
    <div class="auth">
      <section class="auth-cover">
        ${logo("xl")}
        <h1>ACTING<br>ARCHIVE</h1>
        <p class="kicker">세린예술고등학교 연기과 · 1학년</p>
        <p class="lead">시를 읽고, 장면을 만들고, 혼자 해석하기까지.<br>17주의 과정을 기록하는 나의 아카이브.</p>
        <ol class="phases">${Object.entries(P).map(([k, v]) => `<li><span>${pad(k)}</span>${esc(v)}</li>`).join("")}</ol>
      </section>
      <section class="auth-form">
        <div class="tabs"><a href="#/login" class="${signup ? "" : "on"}">로그인</a><a href="#/signup" class="${signup ? "on" : ""}">회원가입</a></div>
        ${signup ? `
        <form data-form="signup" class="form">
          <div class="role-pick">
            <label><input type="radio" name="role" value="student" checked> 학생</label>
            <label><input type="radio" name="role" value="teacher"> 교사</label>
          </div>
          <label>이름<input name="name" required maxlength="20" placeholder="홍길동"></label>
          <div class="row stu-only">
            <label>학번<input name="studentNo" maxlength="10" placeholder="10101"></label>
            <label>조<select name="group">${["", "1조", "2조", "3조", "4조", "5조", "6조"].map((g) => `<option value="${g}">${g || "미정"}</option>`).join("")}</select></label>
          </div>
          <label class="tch-only hidden">교사 가입 코드<input name="teacherCode" placeholder="담당 교사에게 받은 코드"></label>
          <label>아이디<input name="username" required autocomplete="username" placeholder="영문 소문자·숫자"></label>
          <label>비밀번호<input name="password" type="password" required autocomplete="new-password" minlength="4"></label>
          <label>비밀번호 확인<input name="password2" type="password" required autocomplete="new-password"></label>
          <p class="err" data-err></p>
          <button class="primary">가입하고 시작하기</button>
        </form>` : `
        <form data-form="login" class="form">
          <label>아이디<input name="username" required autocomplete="username"></label>
          <label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label>
          <p class="err" data-err></p>
          <button class="primary">로그인</button>
        </form>
        <div class="demo"><p>시연용 계정 — 학생 <code>student</code> / 교사 <code>teacher</code> (비밀번호 <code>1234</code>)</p><button class="ghost" data-act="seed">시연용 계정 만들기</button></div>`}
      </section>
    </div>`;
  }

  function viewWelcome(me) {
    const goal = S.currentGoal(me.id);
    if (!goal) {
      return `<div class="welcome">${logo("lg")}
        <p class="kicker">WEEK 01 · 진단과 목표 설정</p>
        <h2>${esc(me.name)}님, 이번 학기<br>어떤 배우가 되고 싶나요?</h2>
        <p class="muted">성장목표 초안을 적어 주세요. 2주차 기본기 진단과 개별 면담에서 선생님과 함께 확정합니다.</p>
        <form data-form="goal-draft" class="form narrow">
          <textarea name="text" rows="4" required placeholder="예) 대사를 외운 문장이 아니라 상대에게 건네는 말로 하고 싶다."></textarea>
          <button class="primary">초안 등록</button>
        </form></div>`;
    }
    const hist = S.goals(me.id);
    return `<div class="welcome">${logo("lg")}
      <p class="kicker">${esc(me.name)} · 나의 성장목표 · ${esc(goal.status)} (${goal.week}주차)</p>
      <blockquote class="goal">${nl(goal.text)}</blockquote>
      <p class="muted">이번 주는 <b>${S.currentWeek()}주차 · ${esc(P[week(S.currentWeek()).phase])}</b> 입니다.</p>
      <a href="#/home" class="primary btn">아카이브로 들어가기 →</a>
      ${hist.length > 1 ? `<details class="hist"><summary>목표 변화 기록 (${hist.length})</summary>${hist.map((g) => `<p><span class="tag">${esc(g.status)} · ${g.week}주</span> ${esc(g.text)}</p>`).join("")}</details>` : ""}
    </div>`;
  }

  function weekGrid(userId, linkFn) {
    return `<div class="catalog">${C.map((c) => {
      const st = entryStatus(userId, c.week);
      const cur = c.week === S.currentWeek();
      return `<a href="${linkFn(c.week)}" class="card st-${st} ${cur ? "cur" : ""}">
        <span class="no">No.${pad(c.week)}</span>
        <span class="ph">${esc(P[c.phase])}</span>
        <span class="act">${esc(c.activity)}</span>
        <span class="meta">${scaffoldBar(c.scaffold)}<b class="st">${STATUS_LABEL[st]}</b></span>
        ${c.eval !== "–" && !c.eval.includes("과정") ? `<span class="stamp">${esc(c.eval)}</span>` : ""}
      </a>`;
    }).join("")}</div>`;
  }

  function viewHome(me) {
    const cw = week(S.currentWeek());
    const entries = S.entries(me.id);
    const done = Object.keys(entries).length;
    const fb = Object.values(entries).reduce((n, e) => n + (e.feedback?.length || 0), 0);
    const vids = Object.values(entries).reduce((n, e) => n + (e.videos?.length || 0), 0);
    return shell(me, `
      <section class="hero">
        <div>
          <p class="kicker">THIS WEEK · No.${pad(cw.week)} · ${esc(P[cw.phase])}</p>
          <h2>${esc(cw.activity)}</h2>
          <p class="meta-line"><span>${esc(cw.eval)}</span> ${scaffoldBar(cw.scaffold)} <span>도구: ${esc(cw.tool)}</span></p>
          <a href="#/journal/${cw.week}" class="primary btn">${S.entry(me.id, cw.week) ? "이번 주 일지 이어 쓰기" : "이번 주 일지 쓰기"} →</a>
        </div>
        <dl class="stats"><div><dt>작성한 일지</dt><dd>${done}<small>/17</small></dd></div><div><dt>받은 피드백</dt><dd>${fb}</dd></div><div><dt>아카이브 영상</dt><dd>${vids}</dd></div></dl>
      </section>
      <section class="scaf-curve">
        <h3>비계 곡선 <small>도움은 점점 줄고, 해석은 점점 내 것이 됩니다</small></h3>
        <div class="curve">${C.map((c) => `<a href="#/journal/${c.week}" style="--h:${window.SCAFFOLD_LEVEL(c.scaffold) * 30 + 8}%" class="${c.week === cw.week ? "cur" : ""} st-${entryStatus(me.id, c.week)}" title="${c.week}주 · ${esc(c.scaffold)}"><span>${c.week}</span></a>`).join("")}</div>
      </section>
      <section><h3>17주 카탈로그</h3>${weekGrid(me.id, (w) => "#/journal/" + w)}</section>
    `, "home");
  }

  function weekInfo(c) {
    return `<aside class="week-info">
      <p class="no big">No.${pad(c.week)}</p>
      <p class="ph">${c.phase}단계 · ${esc(P[c.phase])}</p>
      <dl>
        <dt>평가</dt><dd>${esc(c.eval)}</dd>
        <dt>활동</dt><dd>${esc(c.activity)}</dd>
        <dt>비계</dt><dd>${scaffoldBar(c.scaffold)}</dd>
        <dt>사이트 활용</dt><dd>${esc(c.tool)}</dd>
      </dl>
      ${c.basics ? `<p class="note">기본기 평가 주차입니다. 기본기 영상을 꼭 올려 주세요 — 아카이브에서 2·9·16주차가 나란히 비교됩니다.</p>` : ""}
      ${c.baseline ? `<p class="note">오늘의 첫 낭독 영상은 학기 내내 비교 기준점이 됩니다.</p>` : ""}
      ${c.requestOnly ? `<p class="note">이 시기에는 선생님이 먼저 개입하지 않습니다. 필요할 때 ‘피드백 요청’을 켜 주세요.</p>` : ""}
      <div class="pager">${c.week > 1 ? `<a href="#/journal/${c.week - 1}">← ${c.week - 1}주</a>` : "<span></span>"}${c.week < 17 ? `<a href="#/journal/${c.week + 1}">${c.week + 1}주 →</a>` : ""}</div>
    </aside>`;
  }

  function feedbackList(e) {
    const list = e?.feedback || [];
    if (!list.length) return `<p class="muted">아직 피드백이 없습니다.</p>`;
    return list.map((f) => { const u = S.user(f.by); return `<div class="fb"><p>${nl(f.text)}</p><small>— ${esc(u?.name || "교사")} · ${fmt(f.at)}</small></div>`; }).join("");
  }

  function viewJournal(me, w) {
    const c = week(w); if (!c) return go("#/home");
    const e = S.entry(me.id, w) || {};
    const vids = e.videos?.length ? e.videos : [{ label: "", url: "" }];
    return shell(me, `
      <div class="journal">
        ${weekInfo(c)}
        <section class="sheet">
          <h2>${c.week}주차 연습 일지 <small>${e.updatedAt ? "최근 저장 " + fmt(e.updatedAt) : "새 일지"}</small></h2>
          <form data-form="entry" data-week="${w}" class="form">
            <label>오늘 한 것<textarea name="did" rows="3" placeholder="수업과 연습에서 무엇을 했나요?">${esc(e.did)}</textarea></label>
            <label>발견한 것 · 어려웠던 것<textarea name="found" rows="4" placeholder="화자, 청자, 숨은 마음… 몸과 소리에서 무엇을 발견했나요?">${esc(e.found)}</textarea></label>
            <label>다음 주까지 할 것<textarea name="next" rows="2">${esc(e.next)}</textarea></label>
            <fieldset class="score"><legend>성장목표에 얼마나 가까워졌나요?</legend>
              ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="selfScore" value="${n}" ${+e.selfScore === n ? "checked" : ""}><span>${n}</span></label>`).join("")}
            </fieldset>
            <fieldset class="videos"><legend>영상 아카이브 <small>YouTube(일부공개)·Google Drive·Vimeo 링크</small></legend>
              <div data-vids>${vids.map((v) => vidRow(v)).join("")}</div>
              <button type="button" class="ghost" data-act="add-vid">+ 영상 추가</button>
            </fieldset>
            <label class="check"><input type="checkbox" name="requestFeedback" ${e.requestFeedback ? "checked" : ""}> 선생님께 피드백 요청하기</label>
            <div class="actions"><span class="saved" data-saved></span><button class="primary">저장</button></div>
          </form>
          ${e.videos?.length ? `<div class="vid-grid">${e.videos.map((v) => `<figure>${videoEmbed(v.url)}<figcaption>${esc(v.label || "영상")}</figcaption></figure>`).join("")}</div>` : ""}
          <h3>교사 피드백</h3>${feedbackList(e)}
          ${c.report ? `<p class="note">학기 마무리: <a href="#/portfolio">포트폴리오에서 성장목표 달성 보고서 작성 →</a></p>` : ""}
        </section>
      </div>`, "journal");
  }
  const vidRow = (v = {}) => `<div class="vid-row"><input name="vlabel" placeholder="제목 (예: 첫 낭독)" value="${esc(v.label)}"><input name="vurl" type="url" placeholder="https://..." value="${esc(v.url)}"><button type="button" class="x" data-act="rm-vid" aria-label="삭제">×</button></div>`;

  function viewArchive(me, filter) {
    const entries = S.entries(me.id);
    const items = [];
    C.forEach((c) => (entries[c.week]?.videos || []).forEach((v) => items.push({ c, v })));
    const shown = filter ? items.filter((i) => i.c.phase === +filter) : items;
    const cmp = [2, 9, 16].map((w) => ({ w, v: entries[w]?.videos?.[0] }));
    const base = entries[3]?.videos?.[0];
    const last = [...items].reverse().find((i) => i.c.week >= 10);
    return shell(me, `
      <section class="arch-head"><h2>영상 아카이브</h2>
        <div class="filters"><a href="#/archive" class="${!filter ? "on" : ""}">전체 ${items.length}</a>${Object.entries(P).map(([k, v]) => `<a href="#/archive/${k}" class="${filter == k ? "on" : ""}">${pad(k)} ${esc(v)}</a>`).join("")}</div>
      </section>
      <section><h3>기본기 비교 <small>기능적 평가 ① → ② → ③</small></h3>
        <div class="compare">${cmp.map(({ w, v }) => `<figure><p class="no">No.${pad(w)}</p>${v ? videoEmbed(v.url) : `<a href="#/journal/${w}" class="frame empty">아직 없음 · ${w}주차 일지에서 올리기</a>`}<figcaption>${esc(v?.label || week(w).eval)}</figcaption></figure>`).join("")}</div>
      </section>
      <section><h3>낭독 비교 <small>3주차 기준점 ↔ 최근 장면</small></h3>
        <div class="compare two">
          <figure><p class="no">No.03</p>${base ? videoEmbed(base.url) : `<a href="#/journal/3" class="frame empty">아직 없음</a>`}<figcaption>${esc(base?.label || "첫 낭독")}</figcaption></figure>
          <figure><p class="no">${last ? "No." + pad(last.c.week) : "—"}</p>${last ? videoEmbed(last.v.url) : `<span class="frame empty">10주차 이후 영상이 올라오면 표시됩니다</span>`}<figcaption>${esc(last?.v.label || "최근 장면")}</figcaption></figure>
        </div>
      </section>
      <section><h3>모든 기록</h3>
        ${shown.length ? `<div class="vid-grid">${shown.map(({ c, v }) => `<figure>${videoEmbed(v.url)}<figcaption><a href="#/journal/${c.week}">No.${pad(c.week)}</a> · ${esc(v.label || "영상")}</figcaption></figure>`).join("")}</div>` : `<p class="muted">아직 올린 영상이 없습니다. 일지에서 영상 링크를 추가해 보세요.</p>`}
      </section>`, "archive");
  }

  function portfolioBody(u, editable) {
    const entries = S.entries(u.id);
    const goals = S.goals(u.id);
    return `
      <section class="pf-cover">${logo("lg")}<div><p class="kicker">PORTFOLIO · ${esc(S.db.settings.className)}</p><h2>${esc(u.name)}</h2><p>${esc(u.studentNo)} · ${esc(u.group)}</p></div></section>
      <section><h3>성장목표의 변화</h3><ol class="goal-tl">${goals.map((g) => `<li><span class="tag">${esc(g.status)} · ${g.week}주</span>${nl(g.text)}</li>`).join("") || "<li class='muted'>없음</li>"}</ol></section>
      <section><h3>자기평가 곡선</h3><div class="spark">${C.map((c) => { const s = +entries[c.week]?.selfScore || 0; return `<span style="--h:${s * 20}%" title="${c.week}주: ${s || "-"}"><b>${s || ""}</b><i>${c.week}</i></span>`; }).join("")}</div></section>
      <section><h3>주차별 기록</h3>${C.filter((c) => entries[c.week]).map((c) => { const e = entries[c.week]; return `
        <article class="pf-entry"><header><span class="no">No.${pad(c.week)}</span><span>${esc(P[c.phase])} · ${esc(c.eval)}</span></header>
          ${e.did ? `<p><b>한 것</b> ${nl(e.did)}</p>` : ""}${e.found ? `<p><b>발견</b> ${nl(e.found)}</p>` : ""}${e.next ? `<p><b>다음</b> ${nl(e.next)}</p>` : ""}
          ${(e.videos || []).map((v) => `<p class="vlink">▶ <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.label || v.url)}</a></p>`).join("")}
          ${(e.feedback || []).map((f) => `<p class="fbq">“${nl(f.text)}”</p>`).join("")}
        </article>`; }).join("") || "<p class='muted'>아직 기록이 없습니다.</p>"}</section>
      <section><h3>성장목표 달성 보고서 <small>17주차 제출 과제</small></h3>
        ${editable ? `<form data-form="report" class="form"><textarea name="text" rows="10" placeholder="처음 세운 목표, 무엇이 달라졌는지(영상 근거), 아직 남은 과제, 다음 학기의 목표를 써 주세요.">${esc(S.report(u.id))}</textarea><div class="actions"><span class="saved" data-saved></span><button class="primary">보고서 저장</button></div></form>`
          : `<div class="report">${nl(S.report(u.id)) || "<span class='muted'>아직 제출하지 않았습니다.</span>"}</div>`}
      </section>`;
  }

  function viewPortfolio(me) {
    return shell(me, `<div class="pf-tools noprint"><button class="ghost" data-act="print">인쇄 / PDF로 저장</button></div><div class="portfolio">${portfolioBody(me, true)}</div>`, "portfolio");
  }

  // ---------- teacher ----------
  function viewTeacher(me) {
    const list = S.students();
    const cw = S.currentWeek();
    const requests = [];
    list.forEach((u) => Object.entries(S.entries(u.id)).forEach(([w, e]) => e.requestFeedback && requests.push({ u, w })));
    return shell(me, `
      <section class="hero slim"><div><p class="kicker">TEACHER · 현재 ${cw}주차 · ${esc(P[week(cw).phase])}</p><h2>학생 ${list.length}명</h2></div>
      ${requests.length ? `<div class="req"><h4>피드백 요청 ${requests.length}</h4>${requests.map(({ u, w }) => `<a href="#/student/${u.id}#w${w}">${esc(u.name)} · ${w}주차</a>`).join("")}</div>` : ""}</section>
      <table class="tbl"><thead><tr><th>조</th><th>학번</th><th>이름</th><th>성장목표</th><th>일지</th><th>${cw}주차</th><th></th></tr></thead><tbody>
      ${list.map((u) => { const g = S.currentGoal(u.id); const n = Object.keys(S.entries(u.id)).length; const st = entryStatus(u.id, cw); return `<tr>
        <td>${esc(u.group)}</td><td>${esc(u.studentNo)}</td><td><b>${esc(u.name)}</b></td>
        <td class="goal-cell">${g ? `<span class="tag">${esc(g.status)}</span> ${esc(g.text)}` : `<span class="muted">미등록</span>`}</td>
        <td>${n}/17</td><td><span class="pill st-${st}">${STATUS_LABEL[st]}</span></td><td><a href="#/student/${u.id}">열기 →</a></td></tr>`; }).join("") || `<tr><td colspan="7" class="muted">가입한 학생이 없습니다.</td></tr>`}
      </tbody></table>`, "teacher");
  }

  function viewStudent(me, id) {
    const u = S.user(id); if (!u) return go("#/teacher");
    const entries = S.entries(id);
    const goal = S.currentGoal(id);
    return shell(me, `
      <p><a href="#/teacher">← 학생 목록</a></p>
      <section class="hero slim"><div><p class="kicker">${esc(u.group)} · ${esc(u.studentNo)}</p><h2>${esc(u.name)}</h2>
        ${goal ? `<blockquote class="goal sm">${nl(goal.text)}</blockquote><p class="muted">${esc(goal.status)} · ${goal.week}주차</p>` : `<p class="muted">성장목표 미등록</p>`}</div>
        <form data-form="goal-teacher" data-uid="${id}" class="form goal-form"><h4>성장목표 확정 / 수정 <small>2주차 확정 · 9주차 수정 면담</small></h4>
          <textarea name="text" rows="3" required>${esc(goal?.text || "")}</textarea>
          <div class="row"><select name="status"><option>확정</option><option>수정</option></select><input name="week" type="number" min="1" max="17" value="${S.currentWeek()}"><button class="primary">기록</button></div>
        </form>
      </section>
      ${weekGrid(id, (w) => `#/student/${id}#w${w}`)}
      <section>${C.map((c) => { const e = entries[c.week]; return `
        <article class="t-entry ${e?.requestFeedback ? "req-on" : ""}" id="w${c.week}">
          <header><span class="no">No.${pad(c.week)}</span><span>${esc(c.activity)}</span>${scaffoldBar(c.scaffold)}${e?.requestFeedback ? `<b class="pill st-request">피드백 요청</b>` : ""}</header>
          ${e ? `<div class="t-body">
            ${e.did ? `<p><b>한 것</b> ${nl(e.did)}</p>` : ""}${e.found ? `<p><b>발견</b> ${nl(e.found)}</p>` : ""}${e.next ? `<p><b>다음</b> ${nl(e.next)}</p>` : ""}
            ${e.selfScore ? `<p><b>자기평가</b> ${e.selfScore}/5</p>` : ""}
            ${e.videos?.length ? `<div class="vid-grid">${e.videos.map((v) => `<figure>${videoEmbed(v.url)}<figcaption>${esc(v.label)}</figcaption></figure>`).join("")}</div>` : ""}
            <h4>피드백</h4>${feedbackList(e)}
            ${c.requestOnly && !e.requestFeedback ? `<p class="note">독립 수행 시기 — 학생이 요청하지 않았습니다.</p>` : ""}
            <form data-form="feedback" data-uid="${id}" data-week="${c.week}" class="form inline"><textarea name="text" rows="2" required placeholder="질문 또는 피드백"></textarea><button class="primary">남기기</button></form>
          </div>` : `<p class="muted t-body">미작성</p>`}
        </article>`; }).join("")}</section>
      <section><h3>성장목표 달성 보고서</h3><div class="report">${nl(S.report(id)) || "<span class='muted'>미제출</span>"}</div></section>
    `, "teacher");
  }

  function viewSettings(me) {
    const s = S.db.settings;
    return shell(me, `<section class="sheet narrow-sheet"><h2>수업 설정</h2>
      <form data-form="settings" class="form">
        <label>수업 이름<input name="className" value="${esc(s.className)}"></label>
        <label>1주차 시작일 <small>이 날짜를 기준으로 '이번 주차'가 계산됩니다</small><input name="startDate" type="date" value="${esc(s.startDate)}"></label>
        <p class="muted">교사 가입 코드: <code>${S.TEACHER_CODE}</code> (js/store.js에서 변경)</p>
        <div class="actions"><span class="saved" data-saved></span><button class="primary">저장</button></div>
      </form>
      <h3>데이터 백업</h3>
      <p class="muted">현재 버전은 이 브라우저에 저장됩니다. 주기적으로 내보내기 해 두세요.</p>
      <div class="row"><button class="ghost" data-act="export">JSON 내보내기</button><label class="ghost btn file">JSON 가져오기<input type="file" accept=".json" data-act="import" hidden></label><button class="ghost danger" data-act="reset">전체 초기화</button></div>
    </section>`, "settings");
  }

  // ---------- router ----------
  function render() {
    const h = location.hash.replace(/^#\/?/, "");
    const [r, a] = h.split("/");
    const me = S.me();
    window.scrollTo(0, 0);
    if (!me) { $app.innerHTML = viewAuth(r === "signup" ? "signup" : "login"); return; }
    if (me.role === "teacher") {
      if (r === "student" && a) $app.innerHTML = viewStudent(me, a.split("#")[0]);
      else if (r === "settings") $app.innerHTML = viewSettings(me);
      else $app.innerHTML = viewTeacher(me);
      const anchor = location.hash.split("#")[2];
      if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 50);
      return;
    }
    if (!S.currentGoal(me.id) && r !== "welcome") return go("#/welcome");
    if (r === "welcome") $app.innerHTML = `<div class="welcome-wrap"><button class="ghost corner" data-act="logout">로그아웃</button>${viewWelcome(me)}</div>`;
    else if (r === "journal") $app.innerHTML = viewJournal(me, a || S.currentWeek());
    else if (r === "archive") $app.innerHTML = viewArchive(me, a);
    else if (r === "portfolio") $app.innerHTML = viewPortfolio(me);
    else $app.innerHTML = viewHome(me);
  }
  window.addEventListener("hashchange", render);

  const flash = (form, msg = "저장했습니다") => { const el = form.querySelector("[data-saved]"); if (el) { el.textContent = msg; setTimeout(() => (el.textContent = ""), 2000); } };

  // ---------- events ----------
  $app.addEventListener("submit", async (ev) => {
    const f = ev.target; ev.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const err = f.querySelector("[data-err]");
    const me = S.me();
    try {
      switch (f.dataset.form) {
        case "login": {
          const u = await S.login(d.username, d.password);
          go(u.role === "teacher" ? "#/teacher" : "#/welcome"); render(); break;
        }
        case "signup": {
          if (d.password !== d.password2) throw new Error("비밀번호 확인이 일치하지 않습니다.");
          const u = await S.signup(d);
          go(u.role === "teacher" ? "#/teacher" : "#/welcome"); render(); break;
        }
        case "goal-draft": S.addGoal(me.id, d.text, "초안", 1, me.id); render(); break;
        case "goal-teacher": S.addGoal(f.dataset.uid, d.text, d.status, +d.week, me.id); render(); break;
        case "entry": {
          const labels = [...f.querySelectorAll("[name=vlabel]")].map((i) => i.value.trim());
          const videos = [...f.querySelectorAll("[name=vurl]")].map((i, k) => ({ label: labels[k], url: i.value.trim() })).filter((v) => v.url);
          S.saveEntry(me.id, +f.dataset.week, { did: d.did, found: d.found, next: d.next, selfScore: d.selfScore ? +d.selfScore : null, videos, requestFeedback: !!d.requestFeedback });
          render(); flash(document.querySelector("[data-form=entry]")); break;
        }
        case "feedback": S.addFeedback(f.dataset.uid, +f.dataset.week, me.id, d.text); render(); document.getElementById("w" + f.dataset.week)?.scrollIntoView(); break;
        case "report": S.saveReport(me.id, d.text); flash(f); break;
        case "settings": S.saveSettings({ className: d.className, startDate: d.startDate }); render(); flash(document.querySelector("[data-form=settings]")); break;
      }
    } catch (e) { if (err) err.textContent = e.message; else alert(e.message); }
  });

  $app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    switch (b.dataset.act) {
      case "logout": S.logout(); go("#/login"); render(); break;
      case "seed": await S.seedDemo(); b.textContent = "만들었습니다 · student / 1234 로 로그인해 보세요"; break;
      case "add-vid": b.previousElementSibling.insertAdjacentHTML("beforeend", vidRow()); break;
      case "rm-vid": b.parentElement.remove(); break;
      case "print": window.print(); break;
      case "export": {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([S.exportJSON()], { type: "application/json" }));
        a.download = `serin-archive-${new Date().toISOString().slice(0, 10)}.json`; a.click(); break;
      }
      case "reset": if (confirm("모든 계정과 기록이 삭제됩니다. 계속할까요?")) { S.reset(); go("#/login"); render(); } break;
    }
  });

  $app.addEventListener("change", (ev) => {
    if (ev.target.name === "role") {
      const t = ev.target.value === "teacher";
      document.querySelectorAll(".stu-only").forEach((e) => e.classList.toggle("hidden", t));
      document.querySelectorAll(".tch-only").forEach((e) => e.classList.toggle("hidden", !t));
    }
    if (ev.target.dataset.act === "import" && ev.target.files[0]) {
      ev.target.files[0].text().then((t) => { try { S.importJSON(t); alert("가져왔습니다."); render(); } catch (e) { alert(e.message); } });
    }
  });

  render();
})();
