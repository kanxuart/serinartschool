// Supabase 온라인 저장소. config.js에 주소와 키가 있으면 로컬 저장소(store.js) 대신 이것을 사용합니다.
// 모든 읽기·쓰기는 supabase/setup.sql 의 api_ 함수를 통해서만 이루어집니다.
(function () {
  const cfg = window.SERIN_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) return; // 설정이 없으면 로컬 시연 모드 유지

  const BASE = cfg.SUPABASE_URL.trim().replace(/\/+$/, "");
  const KEY = cfg.SUPABASE_KEY.trim();
  const TOKEN = "serin-token";
  const token = () => localStorage.getItem(TOKEN);

  async function rpc(fn, args = {}) {
    const headers = { "Content-Type": "application/json", apikey: KEY };
    if (!KEY.startsWith("sb_")) headers.Authorization = "Bearer " + KEY; // 예전 형식(anon JWT) 키
    let res;
    try {
      res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
    } catch {
      throw new Error("서버에 연결할 수 없습니다. 인터넷 연결과 js/config.js의 주소를 확인해 주세요.");
    }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* not json */ }
    if (!res.ok) {
      let msg = (body && (body.message || body.msg || body.error_description || body.error)) || text || res.statusText;
      if (res.status === 404 || /Could not find the function/i.test(msg)) msg = "DB 설정이 안 되어 있습니다. supabase/setup.sql을 SQL Editor에서 실행해 주세요.";
      if (res.status === 401 || /Invalid API key|JWT/i.test(msg)) msg = "API 키가 올바르지 않습니다. js/config.js의 SUPABASE_KEY를 확인해 주세요.";
      if (/만료/.test(msg)) localStorage.removeItem(TOKEN);
      throw new Error(msg);
    }
    return body;
  }

  const EMPTY = { me: null, users: [], goals: {}, entries: {}, reports: {}, evals: {}, settings: { startDate: "2027-03-02" } };
  let db = EMPTY;

  function assemble(s) {
    const d = { me: s.me, users: s.users || [], goals: {}, entries: {}, reports: {}, evals: {}, settings: s.settings || EMPTY.settings };
    (s.evals || []).forEach((v) => ((d.evals[v.userId] ||= {})[v.key] = { scores: v.scores || {}, comment: v.comment, by: v.by, at: v.at }));
    (s.goals || []).forEach((g) => (d.goals[g.userId] ||= []).push(g));
    (s.entries || []).forEach((e) => {
      (d.entries[e.userId] ||= {})[e.week] = { ...(e.data || {}), requestFeedback: e.requestFeedback, createdAt: e.createdAt, updatedAt: e.updatedAt, feedback: [] };
    });
    (s.feedback || []).forEach((f) => {
      const m = (d.entries[f.userId] ||= {});
      (m[f.week] ||= { feedback: [] }).feedback.push({ id: f.id, by: f.by, text: f.text, at: f.at });
    });
    (s.reports || []).forEach((r) => (d.reports[r.userId] = r.text));
    return d;
  }

  const Store = {
    mode: "supabase",
    error: "",
    get TEACHER_CODE() { return db.settings.teacherCode || "(교사 계정에서만 보임)"; },
    get db() { return db; },

    async refresh() {
      this.error = "";
      if (!token()) { db = EMPTY; return; }
      try { db = assemble(await rpc("api_state", { p_token: token() })); }
      catch (e) { db = EMPTY; this.error = e.message; }
    },

    // ---------- 계정 ----------
    async signup(d) {
      const r = await rpc("api_signup", {
        p_username: d.username, p_password: d.password, p_name: d.name,
        p_student_no: d.studentNo || "", p_group: d.group || "", p_role: d.role, p_teacher_code: d.teacherCode || "",
      });
      localStorage.setItem(TOKEN, r.token);
      await this.refresh();
      return r.user;
    },
    async login(username, password) {
      const r = await rpc("api_login", { p_username: username, p_password: password });
      localStorage.setItem(TOKEN, r.token);
      await this.refresh();
      if (this.error) throw new Error(this.error);
      return r.user;
    },
    logout() {
      const t = token();
      localStorage.removeItem(TOKEN);
      db = EMPTY;
      if (t) rpc("api_logout", { p_token: t }).catch(() => {});
    },
    async setAvatar(_userId, dataUrl) {
      await rpc("api_set_avatar", { p_token: token(), p_avatar: dataUrl || "" });
      await this.refresh();
    },
    me() { return db.me; },
    user(id) { return db.users.find((u) => u.id === id); },
    students() { return db.users.filter((u) => u.role === "student"); },

    // ---------- 읽기 ----------
    goals(userId) { return db.goals[userId] || []; },
    currentGoal(userId) { const g = this.goals(userId); return g[g.length - 1] || null; },
    entry(userId, week) { return (db.entries[userId] || {})[week] || null; },
    entries(userId) { return db.entries[userId] || {}; },
    report(userId) { return db.reports[userId] || ""; },
    currentWeek() {
      const start = new Date(db.settings.startDate + "T00:00:00");
      const diff = Math.floor((Date.now() - start) / (7 * 864e5)) + 1;
      return Math.min(17, Math.max(1, diff || 1));
    },

    evals(userId) { return db.evals[userId] || {}; },
    weights() { return { ...window.DEFAULT_WEIGHTS, ...(db.settings.weights || {}) }; },

    // ---------- 쓰기 ----------
    async saveEval(userId, key, scores, comment) {
      await rpc("api_save_eval", { p_token: token(), p_user_id: userId, p_key: key, p_scores: scores, p_comment: comment || "" });
      await this.refresh();
    },
    async addGoal(userId, text, status, week) {
      await rpc("api_add_goal", { p_token: token(), p_user_id: userId, p_text: text, p_status: status, p_week: week });
      await this.refresh();
    },
    async saveEntry(userId, week, data) {
      const { requestFeedback, feedback, createdAt, updatedAt, ...rest } = data;
      await rpc("api_save_entry", { p_token: token(), p_week: +week, p_data: rest, p_request: !!requestFeedback });
      await this.refresh();
    },
    async deleteEntry(_userId, week) {
      await rpc("api_delete_entry", { p_token: token(), p_week: +week });
      await this.refresh();
    },
    async addFeedback(userId, week, _byId, text) {
      await rpc("api_add_feedback", { p_token: token(), p_user_id: userId, p_week: +week, p_text: text });
      await this.refresh();
    },
    async saveReport(_userId, text) {
      await rpc("api_save_report", { p_token: token(), p_text: text });
      await this.refresh();
    },
    async saveSettings(s) {
      await rpc("api_save_settings", { p_token: token(), p_start_date: s.startDate || null, p_class_name: s.className || null, p_teacher_code: s.teacherCode || null, p_weights: s.weights || null });
      await this.refresh();
    },

    // ---------- 백업 ----------
    exportJSON() { const { me, ...rest } = db; return JSON.stringify(rest, null, 2); },
    importJSON() { throw new Error("온라인 모드에서는 가져오기를 지원하지 않습니다."); },
    reset() { throw new Error("온라인 모드에서는 Supabase 대시보드에서 관리해 주세요."); },
  };

  Store.ready = Store.refresh();
  window.Store = Store;
})();
