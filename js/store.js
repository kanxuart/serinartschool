// 데이터 저장소. 지금은 브라우저 localStorage에 저장합니다(시연용).
// 실제 운영 시 이 파일의 load/save만 Supabase·Firebase 등으로 바꾸면 나머지 화면은 그대로 동작합니다.
(function () {
  const KEY = "serin-acting-archive-v1";
  const SESSION = "serin-session";
  const TEACHER_CODE = "SERIN2026"; // 교사 가입 코드 (README 참고)

  // SHA-256 (브라우저 기능이 막힌 http 주소에서도 동작하도록 순수 JS 버전 사용)
  function sha256(str) {
    const K = [], H = [];
    let n = 2, c = 0;
    const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
    while (c < 64) { let prime = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { prime = false; break; } if (prime) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c++] = frac(Math.pow(n, 1 / 3)); } n++; }
    const bytes = new TextEncoder().encode(str);
    const len = bytes.length, words = [];
    for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    const total = (((len + 8) >> 6) + 1) * 16;
    for (let i = words.length; i < total; i++) words[i] = words[i] | 0;
    words[total - 1] = len * 8;
    const r = (x, y) => (x >>> y) | (x << (32 - y));
    for (let j = 0; j < total; j += 16) {
      const w = words.slice(j, j + 16); let [a, b, cc, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        if (i >= 16) { const w15 = w[i - 15], w2 = w[i - 2]; w[i] = (w[i - 16] + (r(w15, 7) ^ r(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (r(w2, 17) ^ r(w2, 19) ^ (w2 >>> 10))) | 0; }
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }
  async function hash(pw) { return sha256("serin:" + pw); }
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toISOString();

  function empty() {
    return { users: [], goals: {}, entries: {}, reports: {}, evals: {}, settings: { startDate: "2027-03-02", weights: { ...window.DEFAULT_WEIGHTS } } };
  }

  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)) || null; } catch { db = null; }
    if (!db) db = empty();
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert("저장 공간이 부족합니다. 데이터를 내보낸 뒤 정리해 주세요."); }
  }

  const Store = {
    mode: "local",
    error: "",
    async refresh() {},
    TEACHER_CODE,
    get db() { return db; },

    // ---------- 계정 ----------
    async signup({ username, password, name, studentNo, group, role, teacherCode }) {
      username = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("아이디는 영문 소문자·숫자·_ 3~20자로 입력해 주세요.");
      if (password.length < 4) throw new Error("비밀번호는 4자 이상이어야 합니다.");
      if (db.users.some((u) => u.username === username)) throw new Error("이미 사용 중인 아이디입니다.");
      if (role === "teacher" && teacherCode !== TEACHER_CODE) throw new Error("교사 가입 코드가 올바르지 않습니다.");
      const user = { id: uid(), username, pwHash: await hash(password), name: name.trim(), studentNo: studentNo || "", group: group || "", role, createdAt: now() };
      db.users.push(user);
      save();
      this.setSession(user.id);
      return user;
    },
    async login(username, password) {
      const u = db.users.find((x) => x.username === username.trim().toLowerCase());
      if (!u || u.pwHash !== (await hash(password))) throw new Error("아이디 또는 비밀번호가 맞지 않습니다.");
      this.setSession(u.id);
      return u;
    },
    setSession(id) { localStorage.setItem(SESSION, id); },
    logout() { localStorage.removeItem(SESSION); },
    me() { const id = localStorage.getItem(SESSION); return db.users.find((u) => u.id === id) || null; },
    user(id) { return db.users.find((u) => u.id === id); },
    students() { return db.users.filter((u) => u.role === "student").sort((a, b) => (a.group + a.studentNo).localeCompare(b.group + b.studentNo)); },

    // ---------- 성장목표 ----------
    goals(userId) { return db.goals[userId] || []; },
    currentGoal(userId) { const g = this.goals(userId); return g[g.length - 1] || null; },
    addGoal(userId, text, status, week, by) {
      (db.goals[userId] ||= []).push({ id: uid(), text: text.trim(), status, week, by, at: now() });
      save();
    },

    // ---------- 일지 ----------
    entry(userId, week) { return (db.entries[userId] || {})[week] || null; },
    entries(userId) { return db.entries[userId] || {}; },
    saveEntry(userId, week, data) {
      const all = (db.entries[userId] ||= {});
      const prev = all[week] || { feedback: [], createdAt: now() };
      all[week] = { ...prev, ...data, updatedAt: now() };
      save();
      return all[week];
    },
    addFeedback(userId, week, byId, text) {
      const e = this.entry(userId, week) || this.saveEntry(userId, week, {});
      e.feedback = e.feedback || [];
      e.feedback.push({ id: uid(), by: byId, text: text.trim(), at: now() });
      e.requestFeedback = false;
      save();
    },

    // ---------- 보고서 ----------
    report(userId) { return db.reports[userId] || ""; },
    saveReport(userId, text) { db.reports[userId] = text; save(); },

    // ---------- 평가 (교사 전용) ----------
    evals(userId) { return (db.evals || {})[userId] || {}; },
    saveEval(userId, key, scores, comment, byId) {
      db.evals ||= {};
      (db.evals[userId] ||= {})[key] = { scores, comment: comment || "", by: byId, at: now() };
      save();
    },
    weights() { return { ...window.DEFAULT_WEIGHTS, ...(db.settings.weights || {}) }; },

    // ---------- 설정 / 백업 ----------
    saveSettings(s) { db.settings = { ...db.settings, ...s }; save(); },
    currentWeek() {
      const start = new Date(db.settings.startDate + "T00:00:00");
      const diff = Math.floor((Date.now() - start) / (7 * 864e5)) + 1;
      return Math.min(17, Math.max(1, diff));
    },
    exportJSON() { return JSON.stringify(db, null, 2); },
    importJSON(text) { const d = JSON.parse(text); if (!d.users) throw new Error("형식이 맞지 않는 파일입니다."); db = d; save(); },
    reset() { db = empty(); save(); this.logout(); },

    // ---------- 시연용 데이터 ----------
    async seedDemo() {
      if (db.users.some((u) => u.username === "teacher")) return;
      const T = { id: uid(), username: "teacher", pwHash: await hash("1234"), name: "김선생", role: "teacher", studentNo: "", group: "", createdAt: now() };
      const S = { id: uid(), username: "student", pwHash: await hash("1234"), name: "최서린", role: "student", studentNo: "10107", group: "2조", createdAt: now() };
      const S2 = { id: uid(), username: "student2", pwHash: await hash("1234"), name: "박하람", role: "student", studentNo: "10112", group: "2조", createdAt: now() };
      db.users.push(T, S, S2);
      db.goals[S.id] = [
        { id: uid(), text: "대사를 '말'로 하고 싶다. 외운 문장을 읽는 게 아니라 상대에게 진짜로 건네는 소리로.", status: "초안", week: 1, by: S.id, at: now() },
        { id: uid(), text: "호흡과 발성을 안정시키고, 시의 화자가 '누구에게 왜' 말하는지 내 언어로 설명할 수 있다.", status: "확정", week: 2, by: T.id, at: now() },
      ];
      db.goals[S2.id] = [{ id: uid(), text: "몸이 굳지 않는 배우가 되기. 긴장할 때 어깨부터 올라가는 습관 고치기.", status: "초안", week: 1, by: S2.id, at: now() }];
      const yt = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      db.entries[S.id] = {
        1: { did: "OT. 평가 기준을 처음 봤다. 결과보다 과정을 본다는 말이 좋았다.", found: "입시 때는 정답 연기를 찾았는데, 여기서는 '내 해석'을 요구한다.", next: "성장목표 초안 다듬기", selfScore: 2, videos: [], feedback: [{ id: uid(), by: T.id, text: "초안 좋아요. '진짜로 건네는 소리'가 무엇인지 2주차 면담에서 같이 구체화해 봅시다.", at: now() }], createdAt: now(), updatedAt: now() },
        2: { did: "기본기 진단: 호흡, 발성, 움직임. 면담 후 성장목표 확정.", found: "긴 문장 끝에서 호흡이 무너진다.", next: "매일 아침 복식호흡 10분", selfScore: 2, videos: [{ label: "기본기 진단 영상", url: yt }], feedback: [], createdAt: now(), updatedAt: now() },
        3: { did: "정지용 「유리창」 감상과 토론, 첫 낭독 촬영.", found: "화자가 유리창에 '입김'을 부는 장면에서 목소리가 작아졌다. 숨은 마음이 슬픔이라서?", next: "서브텍스트 질문지 '청자' 칸 채우기", selfScore: 3, videos: [{ label: "첫 낭독 (기준점)", url: yt }], feedback: [{ id: uid(), by: T.id, text: "작아진 건 좋은 발견이에요. 다음엔 '왜 작아지는지'를 몸으로 먼저 찾아보세요.", at: now() }], createdAt: now(), updatedAt: now() },
      };
      db.entries[S2.id] = { 1: { did: "OT, 사이트 가입", found: "긴장됨", next: "목표 정하기", selfScore: 1, videos: [], feedback: [], requestFeedback: true, createdAt: now(), updatedAt: now() } };
      db.reports[S.id] = "";
      db.evals = db.evals || {};
      db.evals[S.id] = {
        f1: { scores: { "호흡·발성": 3, "발음·화술": 4, "몸·움직임": 3, "집중·반응": 4 }, comment: "긴 문장 끝 호흡 관리가 과제.", by: T.id, at: now() },
      };
      save();
    },
  };

  load();
  window.Store = Store;
  // 처음 열 때 시연용 계정 자동 생성 (student / teacher, 비밀번호 1234)
  // 예전 버전이 만들어 둔 예시 계정(김선생·최서린·박하람)과 그 기록을 지웁니다.
  const DEMO = { teacher: "김선생", student: "최서린", student2: "박하람" };
  const demoIds = db.users.filter((u) => DEMO[u.username] === u.name).map((u) => u.id);
  if (demoIds.length) {
    db.users = db.users.filter((u) => !demoIds.includes(u.id));
    ["goals", "entries", "reports", "evals"].forEach((k) => demoIds.forEach((id) => db[k] && delete db[k][id]));
    if (demoIds.includes(localStorage.getItem(SESSION))) localStorage.removeItem(SESSION);
    save();
  }
  Store.ready = Promise.resolve();
})();
