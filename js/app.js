(function () {
  const $app = document.getElementById("app");
  const C = window.CURRICULUM, P = window.PHASES, S = window.Store;
  const A = window.ASSESSMENTS, CR = window.CRITERIA, CAT = window.CATEGORIES;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (iso) => { const d = new Date(iso); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
  const go = (h) => (location.hash = h);
  const week = (n) => C.find((c) => c.week === +n);
  const logo = (cls = "") => `<img src="assets/logo.svg" alt="세린예술고등학교" class="logo ${cls}">`;
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const num = (v) => (v == null ? "·" : (Math.round(v * 10) / 10).toString());
  // 학번 10502 → 1학년 (첫 자리). 학번이 없으면 1학년으로 표시
  const gradeOf = (u) => { const m = String(u.studentNo || "").match(/^([1-3])\d{3,4}$/); return `${m ? m[1] : 1}학년`; };
  const stuMeta = (u) => [u.studentNo, `연기과 ${gradeOf(u)}`, u.group].filter(Boolean).map(esc).join(" · ");
  const tagsOf = (w) => A.filter((a) => a.week === w).map((a) => a.title);

  function help(h) {
    if (h == null) return `<span class="scaf"><em>진단</em></span>`;
    return `<span class="scaf" title="선생님 도움">${[1, 2, 3].map((i) => `<i class="${i <= h ? "on" : ""}"></i>`).join("")}<em>${window.HELP_LABEL[h]}</em></span>`;
  }

  function videoEmbed(url) {
    const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
    if (yt) return `<div class="frame"><iframe src="https://www.youtube.com/embed/${yt[1]}" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    const gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (gd) return `<div class="frame"><iframe src="https://drive.google.com/file/d/${gd[1]}/preview" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `<div class="frame"><iframe src="https://player.vimeo.com/video/${vm[1]}" loading="lazy" allowfullscreen title="영상"></iframe></div>`;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return `<div class="frame"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
    return `<a class="frame link" href="${esc(url)}" target="_blank" rel="noopener">영상 열기 ↗</a>`;
  }

  const hasContent = (e) => e && (e.did || e.found || e.next || (e.videos && e.videos.length));
  function entryStatus(userId, w) {
    const e = S.entry(userId, w);
    if (!e) return "empty";
    if (e.requestFeedback) return "request";
    if (e.feedback && e.feedback.length) return "feedback";
    return hasContent(e) ? "written" : "empty";
  }
  const STATUS_LABEL = { empty: "—", written: "작성", feedback: "피드백", request: "요청" };

  // ---------- 점수 계산 ----------
  // 평가 1회 점수 = 받은 점수 합 ÷ 만점 × 100  /  영역 점수 = 평가들의 평균
  // 과정 = 지금까지 쓴 일지 수 ÷ 지난 주차 수 × 100  /  총점 = 영역 점수 × 비율 (채점된 영역 기준으로 환산)
  function evalPct(e, cat) {
    if (!e || !e.scores) return null;
    const v = CR[cat].map((c) => +e.scores[c]).filter((n) => n > 0);
    return v.length ? (v.reduce((x, y) => x + y, 0) / (v.length * 5)) * 100 : null;
  }
  function calc(uid) {
    const ev = S.evals(uid), W = S.weights();
    const each = {};
    A.forEach((a) => (each[a.key] = evalPct(ev[a.key], a.cat)));
    const cat = {};
    ["basics", "scene", "report"].forEach((c) => {
      const v = A.filter((a) => a.cat === c).map((a) => each[a.key]).filter((x) => x != null);
      cat[c] = v.length ? avg(v) : null;
    });
    const done = Object.entries(S.entries(uid)).filter(([, e]) => hasContent(e)).map(([w]) => +w);
    const cw = Math.max(S.currentWeek(), ...done, 1); // 지난 주차 (먼저 쓴 주차가 있으면 거기까지)
    const written = done.length;
    cat.process = Math.min(100, (written / cw) * 100);
    let sw = 0, sum = 0;
    Object.keys(CAT).forEach((k) => { if (cat[k] != null) { sw += +W[k] || 0; sum += (+W[k] || 0) * cat[k]; } });
    const graded = ["basics", "scene", "report"].some((k) => cat[k] != null); // 선생님이 채점한 게 있어야 총점 표시
    const total = sw && graded ? sum / sw : null;
    const b = ["f1", "f2", "f3"].map((k) => each[k]).filter((x) => x != null);
    const growth = b.length > 1 ? b[b.length - 1] - b[0] : null;
    return { each, cat, total, grade: total == null ? null : window.GRADE(total), written, cw, growth, complete: sw === 100 && A.every((a) => each[a.key] != null) };
  }

  // ---------- shell ----------
  function shell(me, body, active) {
    const nav = me.role === "teacher"
      ? [["#/teacher", "학생", "teacher"], ["#/grades", "평가", "grades"], ["#/settings", "설정", "settings"]]
      : [["#/home", "홈", "home"], ["#/journal/" + S.currentWeek(), "일지", "journal"], ["#/archive", "아카이브", "archive"], ["#/portfolio", "포트폴리오", "portfolio"]];
    const goal = me.role === "student" ? S.currentGoal(me.id) : null;
    return `
      <header class="top">
        <a href="${me.role === "teacher" ? "#/teacher" : "#/home"}" class="brand">${logo("sm")}<span><b>세린예술고등학교</b><small>연기과</small></span></a>
        <nav>${nav.map(([h, t, k]) => `<a href="${h}" class="${active === k ? "on" : ""}">${t}</a>`).join("")}</nav>
        <div class="who"><span>${esc(me.name)} <small>${me.role === "teacher" ? "선생님" : esc(me.group || "")}</small></span><button class="ghost" data-act="logout">로그아웃</button></div>
      </header>
      ${goal ? `<a href="#/welcome" class="ribbon"><span class="tag">목표</span>${esc(goal.text)}</a>` : ""}
      <main class="wrap">${body}</main>
      <footer class="foot">세린예술고등학교 연기과</footer>`;
  }

  // ---------- 로그인 · 가입 ----------
  function viewAuth(mode) {
    const signup = mode === "signup";
    return `
    <div class="auth">
      <div class="auth-bg" aria-hidden="true"></div>
      <header class="auth-top">
        <a href="#/login" class="auth-brand">${logo("sm")}<span><b>세린예술고등학교</b><small>SERIN ARTS HIGH SCHOOL</small></span></a>
        <span class="auth-portal">연기과 학습 포털</span>
      </header>
      <section class="auth-cover">
        <p class="eyebrow">Department of Acting</p>
        <h1>세린예술고등학교</h1>
        <p class="sub">연기과 학습 포털</p>
        <ul class="feats">
          <li><b>연습 일지</b><span>매주의 발견을 기록</span></li>
          <li><b>영상 아카이브</b><span>성장을 영상으로 비교</span></li>
          <li><b>피드백</b><span>선생님과 1:1로 소통</span></li>
        </ul>
      </section>
      <section class="auth-form">
        <p class="auth-hello">${signup ? "계정 만들기" : "다시 오신 것을 환영합니다"}</p>
        <div class="tabs auth-tabs"><a href="#/login" class="${signup ? "" : "on"}">로그인</a><a href="#/signup" class="${signup ? "on" : ""}">회원가입</a></div>
        ${signup ? `
        <form data-form="signup" class="form">
          <div class="role-pick">
            <label><input type="radio" name="role" value="student" checked> 학생</label>
            <label><input type="radio" name="role" value="teacher"> 선생님</label>
          </div>
          <label>이름<input name="name" required maxlength="20"></label>
          <div class="row stu-only">
            <label>학번<input name="studentNo" maxlength="10" placeholder="10101"></label>
            <label>조<select name="group">${["", "1조", "2조", "3조", "4조", "5조", "6조"].map((g) => `<option value="${g}">${g || "미정"}</option>`).join("")}</select></label>
          </div>
          <label class="tch-only hidden">교사 코드<input name="teacherCode"></label>
          <label>아이디<input name="username" required autocomplete="username" placeholder="영문 소문자 · 숫자"></label>
          <label>비밀번호<input name="password" type="password" required autocomplete="new-password" minlength="4" placeholder="4자 이상"></label>
          <label>비밀번호 확인<input name="password2" type="password" required autocomplete="new-password"></label>
          <p class="err" data-err></p>
          <button class="primary">가입하기</button>
        </form>` : `
        <form data-form="login" class="form">
          ${S.error ? `<p class="err">${esc(S.error)}</p>` : ""}
          <label>아이디<input name="username" required autocomplete="username"></label>
          <label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label>
          <p class="err" data-err></p>
          <button class="primary">로그인</button>
        </form>
        <p class="muted mode-note">처음이라면 <a href="#/signup">회원가입</a></p>`}
      </section>
      <footer class="auth-foot"><span>© ${new Date().getFullYear()} 세린예술고등학교 연기과</span><span>학생 · 선생님 공용 로그인</span></footer>
    </div>`;
  }

  // ---------- 성장목표 ----------
  function viewWelcome(me) {
    const goal = S.currentGoal(me.id);
    if (!goal) {
      return `<div class="welcome">${logo("lg")}
        <p class="kicker">WEEK 01</p>
        <h2>이번 학기,<br>어떤 배우가 되고 싶나요?</h2>
        <p class="muted">2주차 면담에서 선생님과 함께 다듬어요.</p>
        <form data-form="goal-draft" class="form narrow">
          <textarea name="text" rows="4" required placeholder="예) 외운 대사가 아니라, 상대에게 건네는 말로 하고 싶다."></textarea>
          <button class="primary">등록</button>
        </form></div>`;
    }
    const hist = S.goals(me.id);
    const cw = week(S.currentWeek());
    return `<div class="welcome">${logo("lg")}
      <p class="kicker">${esc(me.name)}의 성장목표 · ${esc(goal.status)}</p>
      <blockquote class="goal">${nl(goal.text)}</blockquote>
      <p class="muted">${cw.week}주차 · ${esc(cw.title)}</p>
      <a href="#/home" class="primary btn">시작하기 →</a>
      ${hist.length > 1 ? `<details class="hist"><summary>목표의 변화 ${hist.length}</summary>${hist.map((g) => `<p><span class="tag">${esc(g.status)} · ${g.week}주</span> ${esc(g.text)}</p>`).join("")}</details>` : ""}
    </div>`;
  }

  // ---------- 학생: 홈 ----------
  function weekGrid(userId, linkFn) {
    return `<div class="catalog">${C.map((c) => {
      const st = entryStatus(userId, c.week);
      const tags = tagsOf(c.week);
      return `<a href="${linkFn(c.week)}" class="card st-${st} ${c.week === S.currentWeek() ? "cur" : ""}">
        <span class="no">No.${pad(c.week)}</span>
        <span class="ttl">${esc(c.title)}</span>
        <span class="act">${esc(c.todo)}</span>
        <span class="meta">${help(c.help)}<b class="st">${STATUS_LABEL[st]}</b></span>
        ${tags.length ? `<span class="stamp">${esc(tags.join(" · "))}</span>` : ""}
      </a>`;
    }).join("")}</div>`;
  }

  function viewHome(me) {
    const cw = week(S.currentWeek());
    const entries = S.entries(me.id);
    const done = Object.values(entries).filter(hasContent).length;
    const fb = Object.values(entries).reduce((n, e) => n + (e.feedback?.length || 0), 0);
    const vids = Object.values(entries).reduce((n, e) => n + (e.videos?.length || 0), 0);
    const tags = tagsOf(cw.week);
    return shell(me, `
      <section class="hero">
        <div>
          <p class="kicker">이번 주 · No.${pad(cw.week)} · ${esc(P[cw.phase])}</p>
          <h2>${esc(cw.title)}</h2>
          <p class="meta-line"><span class="todo">${esc(cw.todo)}</span>${help(cw.help)}${tags.map((t) => `<span class="pill eval">${esc(t)}</span>`).join("")}</p>
          <a href="#/journal/${cw.week}" class="primary btn">${hasContent(S.entry(me.id, cw.week)) ? "일지 이어 쓰기" : "일지 쓰기"} →</a>
        </div>
        <dl class="stats"><div><dt>일지</dt><dd>${done}<small>/17</small></dd></div><div><dt>피드백</dt><dd>${fb}</dd></div><div><dt>영상</dt><dd>${vids}</dd></div></dl>
      </section>
      <section class="scaf-curve">
        <h3>도움에서 독립으로 <small>선생님 도움은 점점 줄어요</small></h3>
        <div class="curve">${C.map((c) => `<a href="#/journal/${c.week}" style="--h:${(c.help ?? 0) * 30 + 8}%" class="${c.week === cw.week ? "cur" : ""} st-${entryStatus(me.id, c.week)}" title="${c.week}주 · ${esc(c.title)}"><span>${c.week}</span></a>`).join("")}</div>
      </section>
      <section><h3>17주</h3>${weekGrid(me.id, (w) => "#/journal/" + w)}</section>
    `, "home");
  }

  // ---------- 학생: 일지 ----------
  function weekInfo(c) {
    const tags = tagsOf(c.week);
    return `<aside class="week-info">
      <p class="no big">No.${pad(c.week)}</p>
      <p class="ph">${esc(P[c.phase])}</p>
      <p class="wk-title">${esc(c.title)}</p>
      <p class="todo">${esc(c.todo)}</p>
      <p>${help(c.help)}</p>
      ${tags.length ? `<p>${tags.map((t) => `<span class="pill eval">${esc(t)}</span>`).join(" ")}</p>` : ""}
      ${c.basics ? `<p class="note">기본기 영상 필수 · 2 · 9 · 16주 영상이 나란히 비교돼요.</p>` : ""}
      ${c.baseline ? `<p class="note">오늘 영상이 학기 내내 비교 기준이 돼요.</p>` : ""}
      ${c.requestOnly ? `<p class="note">이제부터는 스스로. 필요하면 피드백을 요청하세요.</p>` : ""}
      <div class="pager">${c.week > 1 ? `<a href="#/journal/${c.week - 1}">← ${c.week - 1}주</a>` : "<span></span>"}${c.week < 17 ? `<a href="#/journal/${c.week + 1}">${c.week + 1}주 →</a>` : ""}</div>
    </aside>`;
  }

  function feedbackList(e) {
    const list = e?.feedback || [];
    if (!list.length) return `<p class="muted">아직 없어요.</p>`;
    return list.map((f) => { const u = S.user(f.by); return `<div class="fb"><p>${nl(f.text)}</p><small>${esc(u?.name || "선생님")} · ${fmt(f.at)}</small></div>`; }).join("");
  }

  function viewJournal(me, w) {
    const c = week(w); if (!c) return go("#/home");
    const e = S.entry(me.id, w) || {};
    const vids = e.videos?.length ? e.videos : [{ label: "", url: "" }];
    return shell(me, `
      <div class="journal">
        ${weekInfo(c)}
        <section class="sheet">
          <h2>${c.week}주 일지 <small>${e.updatedAt ? "저장됨 " + fmt(e.updatedAt) : ""}</small></h2>
          <form data-form="entry" data-week="${w}" class="form">
            <label>한 것<textarea name="did" rows="3" placeholder="오늘 수업 · 연습">${esc(e.did)}</textarea></label>
            <label>발견<textarea name="found" rows="4" placeholder="화자, 청자, 숨은 마음 / 몸과 소리에서 찾은 것 · 막힌 것">${esc(e.found)}</textarea></label>
            <label>다음 주<textarea name="next" rows="2">${esc(e.next)}</textarea></label>
            <fieldset class="score"><legend>목표에 얼마나 가까워졌나요</legend>
              ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="selfScore" value="${n}" ${+e.selfScore === n ? "checked" : ""}><span>${n}</span></label>`).join("")}
            </fieldset>
            <fieldset class="videos"><legend>영상 <small>YouTube · Drive · Vimeo 링크</small></legend>
              <div data-vids>${vids.map((v) => vidRow(v)).join("")}</div>
              <button type="button" class="ghost" data-act="add-vid">+ 추가</button>
            </fieldset>
            <label class="check"><input type="checkbox" name="requestFeedback" ${e.requestFeedback ? "checked" : ""}> 피드백 요청</label>
            <div class="actions">${S.entry(me.id, w) ? `<button type="button" class="ghost danger del" data-act="del-entry" data-week="${w}">삭제</button>` : ""}<span class="spacer"></span><button class="primary">저장</button></div>
          </form>
          ${e.videos?.length ? `<div class="vid-grid">${e.videos.map((v) => `<figure>${videoEmbed(v.url)}<figcaption>${esc(v.label || "영상")}</figcaption></figure>`).join("")}</div>` : ""}
          <h3>피드백</h3>${feedbackList(e)}
          ${c.report ? `<p class="note"><a href="#/portfolio">성장 보고서 쓰러 가기 →</a></p>` : ""}
        </section>
      </div>`, "journal");
  }
  const vidRow = (v = {}) => `<div class="vid-row"><input name="vlabel" placeholder="제목" value="${esc(v.label)}"><input name="vurl" type="url" placeholder="https://" value="${esc(v.url)}"><button type="button" class="x" data-act="rm-vid" aria-label="삭제">×</button></div>`;

  // ---------- 학생: 아카이브 ----------
  function viewArchive(me, filter) {
    const entries = S.entries(me.id);
    const items = [];
    C.forEach((c) => (entries[c.week]?.videos || []).forEach((v) => items.push({ c, v })));
    const shown = filter ? items.filter((i) => i.c.phase === +filter) : items;
    const cmp = [2, 9, 16].map((w) => ({ w, v: entries[w]?.videos?.[0] }));
    const base = entries[3]?.videos?.[0];
    const last = [...items].reverse().find((i) => i.c.week >= 10);
    const empty = (w, t = "아직 없음") => w ? `<a href="#/journal/${w}" class="frame empty">${t}</a>` : `<span class="frame empty">${t}</span>`;
    return shell(me, `
      <section class="arch-head"><h2>아카이브</h2>
        <div class="filters"><a href="#/archive" class="${!filter ? "on" : ""}">전체 ${items.length}</a>${Object.entries(P).map(([k, v]) => `<a href="#/archive/${k}" class="${filter == k ? "on" : ""}">${esc(v)}</a>`).join("")}</div>
      </section>
      <section><h3>기본기 ① → ② → ③</h3>
        <div class="compare">${cmp.map(({ w, v }) => `<figure><p class="no">No.${pad(w)}</p>${v ? videoEmbed(v.url) : empty(w)}<figcaption>${esc(v?.label || week(w).title)}</figcaption></figure>`).join("")}</div>
      </section>
      <section><h3>첫 낭독 → 지금</h3>
        <div class="compare two">
          <figure><p class="no">No.03</p>${base ? videoEmbed(base.url) : empty(3)}<figcaption>${esc(base?.label || "첫 낭독")}</figcaption></figure>
          <figure><p class="no">${last ? "No." + pad(last.c.week) : "—"}</p>${last ? videoEmbed(last.v.url) : empty(null, "10주 이후 영상")}<figcaption>${esc(last?.v.label || "최근 장면")}</figcaption></figure>
        </div>
      </section>
      <section><h3>전체</h3>
        ${shown.length ? `<div class="vid-grid">${shown.map(({ c, v }) => `<figure>${videoEmbed(v.url)}<figcaption><a href="#/journal/${c.week}">No.${pad(c.week)}</a> · ${esc(v.label || "영상")}</figcaption></figure>`).join("")}</div>` : `<p class="muted">일지에 영상 링크를 올리면 여기에 모여요.</p>`}
      </section>`, "archive");
  }

  // ---------- 포트폴리오 ----------
  function portfolioBody(u, editable) {
    const entries = S.entries(u.id);
    const goals = S.goals(u.id);
    return `
      <section class="pf-cover">${logo("lg")}<div><p class="kicker">PORTFOLIO</p><h2>${esc(u.name)}</h2><p>${stuMeta(u)}</p></div></section>
      <section><h3>목표의 변화</h3><ol class="goal-tl">${goals.map((g) => `<li><span class="tag">${esc(g.status)} · ${g.week}주</span>${nl(g.text)}</li>`).join("") || "<li class='muted'>없음</li>"}</ol></section>
      <section><h3>자기평가</h3><div class="spark">${C.map((c) => { const s = +entries[c.week]?.selfScore || 0; return `<span style="--h:${s * 20}%" title="${c.week}주: ${s || "-"}"><b>${s || ""}</b><i>${c.week}</i></span>`; }).join("")}</div></section>
      <section><h3>기록</h3>${C.filter((c) => hasContent(entries[c.week])).map((c) => { const e = entries[c.week]; return `
        <article class="pf-entry"><header><span class="no">No.${pad(c.week)}</span><span>${esc(c.title)}</span>${editable ? `<span class="pf-act noprint"><a href="#/journal/${c.week}">수정</a><button type="button" class="link-btn" data-act="del-entry" data-week="${c.week}">삭제</button></span>` : ""}</header>
          ${e.did ? `<p><b>한 것</b> ${nl(e.did)}</p>` : ""}${e.found ? `<p><b>발견</b> ${nl(e.found)}</p>` : ""}${e.next ? `<p><b>다음</b> ${nl(e.next)}</p>` : ""}
          ${(e.videos || []).map((v) => `<p class="vlink">▶ <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.label || v.url)}</a></p>`).join("")}
          ${(e.feedback || []).map((f) => `<p class="fbq">“${nl(f.text)}”</p>`).join("")}
        </article>`; }).join("") || "<p class='muted'>아직 없어요.</p>"}</section>
      <section><h3>성장 보고서 <small>17주 제출</small></h3>
        ${editable ? `<form data-form="report" class="form"><textarea name="text" rows="10" placeholder="처음 목표 · 달라진 점(영상 근거) · 남은 과제 · 다음 목표">${esc(S.report(u.id))}</textarea><div class="actions"><span class="saved" data-saved></span><button class="primary">저장</button></div></form>`
          : `<div class="report">${nl(S.report(u.id)) || "<span class='muted'>미제출</span>"}</div>`}
      </section>`;
  }

  function viewPortfolio(me) {
    return shell(me, `<div class="pf-tools noprint"><button class="ghost" data-act="print">인쇄 · PDF</button></div><div class="portfolio">${portfolioBody(me, true)}</div>`, "portfolio");
  }

  // ---------- 선생님: 학생 목록 ----------
  function viewTeacher(me) {
    const list = S.students();
    const cw = S.currentWeek();
    const requests = [];
    list.forEach((u) => Object.entries(S.entries(u.id)).forEach(([w, e]) => e.requestFeedback && requests.push({ u, w })));
    return shell(me, `
      <section class="hero slim"><div><p class="kicker">No.${pad(cw)} · ${esc(week(cw).title)}</p><h2>학생 ${list.length}명</h2></div>
      ${requests.length ? `<div class="req"><h4>피드백 요청 ${requests.length}</h4>${requests.map(({ u, w }) => `<a href="#/student/${u.id}#w${w}">${esc(u.name)} · ${w}주</a>`).join("")}</div>` : ""}</section>
      <table class="tbl"><thead><tr><th>조</th><th>학번</th><th>이름</th><th>목표</th><th>일지</th><th>이번 주</th><th>총점</th><th></th></tr></thead><tbody>
      ${list.map((u) => { const g = S.currentGoal(u.id); const r = calc(u.id); const st = entryStatus(u.id, cw); return `<tr>
        <td>${esc(u.group)}</td><td>${esc(u.studentNo)}</td><td><b>${esc(u.name)}</b></td>
        <td class="goal-cell">${g ? `<span class="tag">${esc(g.status)}</span> ${esc(g.text)}` : `<span class="muted">—</span>`}</td>
        <td>${r.written}</td><td><span class="pill st-${st}">${STATUS_LABEL[st]}</span></td>
        <td><a href="#/student/${u.id}/eval">${r.total == null ? "·" : `${num(r.total)} <span class="grade g-${r.grade}">${r.grade}</span>`}</a></td>
        <td><a href="#/student/${u.id}">기록 →</a></td></tr>`; }).join("") || `<tr><td colspan="8" class="muted">아직 가입한 학생이 없어요.</td></tr>`}
      </tbody></table>`, "teacher");
  }

  function studentHead(u, tab) {
    const goal = S.currentGoal(u.id);
    return `<p class="back"><a href="#/${tab === "eval" ? "grades" : "teacher"}">← ${tab === "eval" ? "평가" : "학생"}</a></p>
      <section class="s-head"><div><p class="kicker">${stuMeta(u)}</p><h2>${esc(u.name)}</h2>
        ${goal ? `<p class="goal-line"><span class="tag">${esc(goal.status)}</span>${esc(goal.text)}</p>` : ""}</div>
        <div class="tabs sm"><a href="#/student/${u.id}" class="${tab === "log" ? "on" : ""}">기록</a><a href="#/student/${u.id}/eval" class="${tab === "eval" ? "on" : ""}">평가</a></div>
      </section>`;
  }

  // ---------- 선생님: 학생 기록 ----------
  function viewStudent(me, id) {
    const u = S.user(id); if (!u) return go("#/teacher");
    const entries = S.entries(id);
    const goal = S.currentGoal(id);
    return shell(me, `
      ${studentHead(u, "log")}
      <form data-form="goal-teacher" data-uid="${id}" class="form goal-form"><h4>목표 확정 · 수정 <small>2주 확정 · 9주 수정</small></h4>
        <textarea name="text" rows="2" required>${esc(goal?.text || "")}</textarea>
        <div class="row"><select name="status"><option>확정</option><option>수정</option></select><input name="week" type="number" min="1" max="17" value="${S.currentWeek()}" title="주차"><button class="primary">기록</button></div>
      </form>
      ${weekGrid(id, (w) => `#/student/${id}#w${w}`)}
      <section>${C.map((c) => { const e = entries[c.week]; return `
        <article class="t-entry ${e?.requestFeedback ? "req-on" : ""}" id="w${c.week}">
          <header><span class="no">No.${pad(c.week)}</span><span><b class="t-title">${esc(c.title)}</b><small class="muted">${esc(c.activity)}</small></span>${help(c.help)}${e?.requestFeedback ? `<b class="pill st-request">요청</b>` : ""}</header>
          ${e ? `<div class="t-body">
            ${e.did ? `<p><b>한 것</b> ${nl(e.did)}</p>` : ""}${e.found ? `<p><b>발견</b> ${nl(e.found)}</p>` : ""}${e.next ? `<p><b>다음</b> ${nl(e.next)}</p>` : ""}
            ${e.selfScore ? `<p><b>자기평가</b> ${e.selfScore}/5</p>` : ""}
            ${e.videos?.length ? `<div class="vid-grid">${e.videos.map((v) => `<figure>${videoEmbed(v.url)}<figcaption>${esc(v.label)}</figcaption></figure>`).join("")}</div>` : ""}
            <h4>피드백</h4>${feedbackList(e)}
            ${c.requestOnly && !e.requestFeedback ? `<p class="note">독립 수행 기간 · 요청 없음</p>` : ""}
            <form data-form="feedback" data-uid="${id}" data-week="${c.week}" class="form inline"><textarea name="text" rows="2" required placeholder="질문 또는 피드백"></textarea><button class="primary">남기기</button></form>
          </div>` : `<p class="muted t-body">—</p>`}
        </article>`; }).join("")}</section>
      <section><h3>성장 보고서</h3><div class="report">${nl(S.report(id)) || "<span class='muted'>미제출</span>"}</div></section>
    `, "teacher");
  }

  // ---------- 선생님: 학생 평가 ----------
  function sumPanel(r) {
    const W = S.weights();
    return `<section class="eval-sum">
      ${Object.entries(CAT).map(([k, t]) => `<div><dt>${t} <small>${W[k]}%</small></dt><dd>${num(r.cat[k])}</dd>${k === "process" ? `<small>일지 ${r.written}/${r.cw}</small>` : k === "basics" && r.growth != null ? `<small class="${r.growth >= 0 ? "up" : "down"}">① → ${r.growth >= 0 ? "+" : ""}${num(r.growth)}</small>` : ""}</div>`).join("")}
      <div class="total"><dt>총점 ${r.complete ? "" : "<small>현재까지</small>"}</dt><dd>${num(r.total)}</dd>${r.grade ? `<span class="grade big g-${r.grade}">${r.grade}</span>` : ""}</div>
    </section>`;
  }

  function evalCard(u, a, e) {
    const vids = S.entry(u.id, a.week)?.videos || [];
    const pct = evalPct(e, a.cat);
    return `<form data-form="eval" data-uid="${u.id}" data-key="${a.key}" data-cat="${a.cat}" class="eval-card ${pct != null ? "done" : ""}">
      <header><b>${esc(a.title)}</b><span>${a.week}주 · ${esc(a.sub)}</span><em class="pts">${num(pct)}</em></header>
      ${vids.length ? `<p class="vlinks">${vids.map((v) => `<a href="${esc(v.url)}" target="_blank" rel="noopener">▶ ${esc(v.label || "영상")}</a>`).join("")}</p>` : a.cat === "report" ? `<p class="vlinks"><a href="#/student/${u.id}">보고서 보기 →</a></p>` : `<p class="vlinks muted">영상 없음</p>`}
      ${CR[a.cat].map((c) => `<div class="crit"><span>${esc(c)}</span><div class="score sm">${[1, 2, 3, 4, 5].map((n) => `<label title="${window.LEVELS[n]}"><input type="radio" name="${esc(c)}" value="${n}" ${+e?.scores?.[c] === n ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>`).join("")}
      <textarea name="__comment" rows="2" placeholder="코멘트">${esc(e?.comment)}</textarea>
      <div class="actions"><span class="saved" data-saved></span><button class="primary">저장</button></div>
    </form>`;
  }

  function viewEval(me, id) {
    const u = S.user(id); if (!u) return go("#/grades");
    const ev = S.evals(id);
    const r = calc(id);
    return shell(me, `
      ${studentHead(u, "eval")}
      ${sumPanel(r)}
      <p class="legend muted">1 미흡 · 2 노력 · 3 보통 · 4 우수 · 5 탁월 &nbsp;|&nbsp; 평가 점수 = 합계 ÷ 만점 × 100</p>
      ${Object.entries({ basics: "기본기", scene: "장면", report: "보고서" }).map(([cat, t]) => `
        <h3>${t}</h3><div class="eval-grid">${A.filter((a) => a.cat === cat).map((a) => evalCard(u, a, ev[a.key])).join("")}</div>`).join("")}
    `, "grades");
  }

  // ---------- 선생님: 평가 전체 ----------
  function viewGrades(me) {
    const list = S.students();
    const W = S.weights();
    return shell(me, `
      <section class="hero slim"><div><p class="kicker">평가</p><h2>성적</h2>
        <p class="muted">${Object.entries(CAT).map(([k, t]) => `${t} ${W[k]}`).join(" · ")} &nbsp;<a href="#/settings">비율 변경</a></p></div>
        <button class="ghost" data-act="csv">CSV 내보내기</button></section>
      <div class="tbl-wrap"><table class="tbl grades"><thead>
        <tr><th rowspan="2">조</th><th rowspan="2">학번</th><th rowspan="2">이름</th><th colspan="3">기본기</th><th colspan="3">장면</th><th rowspan="2">보고서</th><th colspan="4" class="sep">영역 점수</th><th rowspan="2">총점</th><th rowspan="2">등급</th></tr>
        <tr><th>①</th><th>②</th><th>③</th><th>①</th><th>②</th><th>③</th><th class="sep">기본기</th><th>장면</th><th>과정</th><th>보고서</th></tr>
      </thead><tbody>
      ${list.map((u) => { const r = calc(u.id); return `<tr>
        <td>${esc(u.group)}</td><td>${esc(u.studentNo)}</td><td><a href="#/student/${u.id}/eval"><b>${esc(u.name)}</b></a></td>
        ${A.map((a) => `<td class="n">${num(r.each[a.key])}</td>`).join("")}
        ${Object.keys(CAT).map((k, i) => `<td class="n ${i === 0 ? "sep" : ""}">${num(r.cat[k])}</td>`).join("")}
        <td class="n"><b>${num(r.total)}</b></td><td>${r.grade ? `<span class="grade g-${r.grade}">${r.grade}</span>` : "·"}</td></tr>`; }).join("") || `<tr><td colspan="17" class="muted">아직 가입한 학생이 없어요.</td></tr>`}
      </tbody></table></div>
      <p class="legend muted">평가 점수 = 합계 ÷ 만점 × 100 · 영역 점수 = 평균 · 과정 = 일지 수 ÷ 지난 주차 · 총점은 채점된 영역의 비율로 환산 · A 90 / B 80 / C 70 / D 60</p>
    `, "grades");
  }

  function csv() {
    const W = S.weights();
    const head = ["조", "학번", "이름", ...A.map((a) => a.title), ...Object.values(CAT).map((t) => `${t}(${W[Object.keys(CAT).find((k) => CAT[k] === t)]}%)`), "총점", "등급"];
    const rows = S.students().map((u) => { const r = calc(u.id); const f = (v) => (v == null ? "" : Math.round(v * 10) / 10);
      return [u.group, u.studentNo, u.name, ...A.map((a) => f(r.each[a.key])), ...Object.keys(CAT).map((k) => f(r.cat[k])), f(r.total), r.grade || ""]; });
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  }

  // ---------- 선생님: 설정 ----------
  function viewSettings(me) {
    const s = S.db.settings;
    const W = S.weights();
    return shell(me, `<section class="sheet narrow-sheet"><h2>설정</h2>
      <form data-form="settings" class="form">
        <label>1주차 시작일 <small>이번 주차 계산 기준</small><input name="startDate" type="date" value="${esc(s.startDate)}"></label>
        <fieldset><legend>평가 비율 <small>합계 100</small></legend>
          <div class="row weights">${Object.entries(CAT).map(([k, t]) => `<label>${t}<input name="w_${k}" type="number" min="0" max="100" value="${W[k]}"></label>`).join("")}</div>
        </fieldset>
        ${S.mode === "supabase" ? `<label>교사 코드 <small>선생님 가입용</small><input name="teacherCode" value="${esc(s.teacherCode || "")}"></label>` : `<p class="muted">교사 코드 <code>${S.TEACHER_CODE}</code></p>`}
        <p class="err" data-err></p>
        <div class="actions"><span class="saved" data-saved></span><button class="primary">저장</button></div>
      </form>
      <h3>백업</h3>
      ${S.mode === "supabase"
        ? `<p class="muted">● 온라인 저장 중</p><div class="row"><button class="ghost" data-act="export">JSON 내보내기</button></div>`
        : `<p class="muted">○ 이 브라우저에만 저장 중</p>
      <div class="row"><button class="ghost" data-act="export">JSON 내보내기</button><label class="ghost btn file">JSON 가져오기<input type="file" accept=".json" data-act="import" hidden></label><button class="ghost danger" data-act="reset">초기화</button></div>`}
    </section>`, "settings");
  }

  // ---------- router ----------
  function render() {
    const [path, anchor] = location.hash.replace(/^#\/?/, "").split("#");
    const [r, a, b] = path.split("/");
    const me = S.me();
    window.scrollTo(0, 0);
    if (!me) { $app.innerHTML = viewAuth(r === "signup" ? "signup" : "login"); return; }
    if (me.role === "teacher") {
      if (r === "student" && a) $app.innerHTML = b === "eval" ? viewEval(me, a) : viewStudent(me, a);
      else if (r === "grades") $app.innerHTML = viewGrades(me);
      else if (r === "settings") $app.innerHTML = viewSettings(me);
      else $app.innerHTML = viewTeacher(me);
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
  window.addEventListener("hashchange", async () => {
    if (S.mode === "supabase" && S.me()) await S.refresh(); // 다른 사람이 쓴 최신 기록 반영
    render();
  });
  // 탭으로 돌아오면 최신 기록으로 갱신 (작성 중일 때는 제외)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || S.mode !== "supabase" || !S.me()) return;
    if (document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName)) return;
    await S.refresh(); render();
  });

  // ---------- 알림창 · 확인창 ----------
  let toastTimer;
  function toast(msg, kind = "ok") {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.className = "toast " + kind;
    el.innerHTML = `<i>${kind === "ok" ? "✓" : "!"}</i><span>${esc(msg)}</span>`;
    void el.offsetWidth; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function confirmBox({ title, body = "", ok = "확인", danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "modal-wrap";
      wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h4>${esc(title)}</h4>${body ? `<p>${esc(body)}</p>` : ""}
        <div class="modal-actions"><button class="ghost" data-m="no">취소</button><button class="primary ${danger ? "danger-fill" : ""}" data-m="yes">${esc(ok)}</button></div></div>`;
      const close = (v) => { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 180); document.removeEventListener("keydown", onKey); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") close(false); if (e.key === "Enter") close(true); };
      wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.dataset.m === "no") close(false); if (e.target.dataset.m === "yes") close(true); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add("show"));
      wrap.querySelector("[data-m=yes]").focus();
    });
  }
  const flash = (_form, msg) => toast(msg);
  const keepScroll = async (fn) => { const y = window.scrollY; await fn(); window.scrollTo(0, y); };

  // ---------- events ----------
  $app.addEventListener("submit", async (ev) => {
    const f = ev.target; ev.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const err = f.querySelector("[data-err]");
    const me = S.me();
    const btn = f.querySelector("button.primary");
    if (btn) { if (btn.disabled) return; btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "저장 중…"; }
    try {
      switch (f.dataset.form) {
        case "login": {
          await S.ready;
          const u = await S.login(d.username, d.password);
          go(u.role === "teacher" ? "#/teacher" : "#/welcome"); render(); break;
        }
        case "signup": {
          if (d.password !== d.password2) throw new Error("비밀번호가 서로 달라요.");
          const u = await S.signup(d);
          go(u.role === "teacher" ? "#/teacher" : "#/welcome"); render(); break;
        }
        case "goal-draft": await S.addGoal(me.id, d.text, "초안", 1, me.id); render(); toast("성장목표를 등록했어요"); break;
        case "goal-teacher": await keepScroll(async () => { await S.addGoal(f.dataset.uid, d.text, d.status, +d.week, me.id); render(); }); toast("성장목표를 기록했어요"); break;
        case "entry": {
          const labels = [...f.querySelectorAll("[name=vlabel]")].map((i) => i.value.trim());
          const videos = [...f.querySelectorAll("[name=vurl]")].map((i, k) => ({ label: labels[k], url: i.value.trim() })).filter((v) => v.url);
          await S.saveEntry(me.id, +f.dataset.week, { did: d.did, found: d.found, next: d.next, selfScore: d.selfScore ? +d.selfScore : null, videos, requestFeedback: !!d.requestFeedback });
          render(); toast(`${f.dataset.week}주 일지를 저장했어요`); break;
        }
        case "feedback": await S.addFeedback(f.dataset.uid, +f.dataset.week, me.id, d.text); render(); document.getElementById("w" + f.dataset.week)?.scrollIntoView(); toast("피드백을 남겼어요"); break;
        case "report": await S.saveReport(me.id, d.text); toast("성장 보고서를 저장했어요"); if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; } break;
        case "eval": {
          const scores = {};
          CR[f.dataset.cat].forEach((c) => { if (d[c]) scores[c] = +d[c]; });
          await keepScroll(async () => { await S.saveEval(f.dataset.uid, f.dataset.key, scores, d.__comment, me.id); render(); });
          toast(`${A.find((a) => a.key === f.dataset.key).title} 평가를 저장했어요`); break;
        }
        case "settings": {
          const weights = {};
          Object.keys(CAT).forEach((k) => (weights[k] = Math.max(0, +d["w_" + k] || 0)));
          const sum = Object.values(weights).reduce((x, y) => x + y, 0);
          if (sum !== 100) throw new Error(`평가 비율 합계가 ${sum}이에요. 100으로 맞춰 주세요.`);
          await S.saveSettings({ startDate: d.startDate, teacherCode: d.teacherCode, weights });
          render(); toast("설정을 저장했어요"); break;
        }
      }
    } catch (e) { if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = btn.dataset.label; } if (err) { err.textContent = e.message; err.classList.remove("shake"); void err.offsetWidth; err.classList.add("shake"); } else toast(e.message, "error"); }
  });

  $app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const download = (text, name, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
    const today = new Date().toISOString().slice(0, 10);
    switch (b.dataset.act) {
      case "logout": S.logout(); go("#/login"); render(); break;
      case "add-vid": b.previousElementSibling.insertAdjacentHTML("beforeend", vidRow()); break;
      case "rm-vid": b.parentElement.remove(); break;
      case "print": window.print(); break;
      case "export": download(S.exportJSON(), `serin-archive-${today}.json`, "application/json"); break;
      case "csv": download(csv(), `세린예고_연기_성적_${today}.csv`, "text/csv"); break;
      case "reset":
        if (await confirmBox({ title: "모든 데이터를 초기화할까요?", body: "모든 계정과 기록이 삭제되고 되돌릴 수 없어요.", ok: "초기화", danger: true })) { S.reset(); go("#/login"); render(); toast("초기화했어요"); }
        break;
      case "del-entry": {
        const w = +b.dataset.week;
        const e = S.entry(S.me().id, w);
        const fb = e?.feedback?.length || 0;
        const ok = await confirmBox({ title: `${w}주 일지를 삭제할까요?`, body: `쓴 글과 영상 링크${fb ? `, 선생님 피드백 ${fb}개` : ""}가 함께 지워지고 되돌릴 수 없어요.`, ok: "삭제", danger: true });
        if (!ok) break;
        try { await S.deleteEntry(S.me().id, w); render(); toast(`${w}주 일지를 삭제했어요`); }
        catch (err) { toast(err.message, "error"); }
        break;
      }
    }
  });

  $app.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.name === "role") {
      const isT = t.value === "teacher";
      document.querySelectorAll(".stu-only").forEach((e) => e.classList.toggle("hidden", isT));
      document.querySelectorAll(".tch-only").forEach((e) => e.classList.toggle("hidden", !isT));
    }
    // 채점하는 동안 점수 미리 보기
    const f = t.closest("form[data-form=eval]");
    if (f) {
      const d = Object.fromEntries(new FormData(f));
      const scores = {}; CR[f.dataset.cat].forEach((c) => d[c] && (scores[c] = +d[c]));
      f.querySelector(".pts").textContent = num(evalPct({ scores }, f.dataset.cat));
    }
    if (t.dataset.act === "import" && t.files[0]) {
      t.files[0].text().then((x) => { try { S.importJSON(x); render(); toast("가져왔어요"); } catch (e) { toast(e.message, "error"); } });
    }
  });

  Promise.resolve(S.ready).catch(() => {}).then(render);
})();
