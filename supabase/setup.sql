-- =====================================================================
-- 세린예고 Acting Archive · Supabase 설정
-- Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여 넣고 Run
-- 여러 번 실행해도 안전합니다(기존 데이터는 지워지지 않음).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------- 표 ----------
create table if not exists public.app_users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  pw_hash     text not null,
  name        text not null,
  student_no  text not null default '',
  grp         text not null default '',
  role        text not null check (role in ('student', 'teacher')),
  created_at  timestamptz not null default now()
);

create table if not exists public.app_sessions (
  token       uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '30 days'
);

create table if not exists public.goals (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.app_users(id) on delete cascade,
  text     text not null,
  status   text not null check (status in ('초안', '확정', '수정')),
  week     int  not null check (week between 1 and 17),
  by_id    uuid references public.app_users(id) on delete set null,
  at       timestamptz not null default now()
);

create table if not exists public.entries (
  user_id           uuid not null references public.app_users(id) on delete cascade,
  week              int  not null check (week between 1 and 17),
  data              jsonb not null default '{}'::jsonb,
  request_feedback  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, week)
);

create table if not exists public.feedback (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.app_users(id) on delete cascade,
  week     int  not null check (week between 1 and 17),
  by_id    uuid references public.app_users(id) on delete set null,
  text     text not null,
  at       timestamptz not null default now()
);

create table if not exists public.reports (
  user_id     uuid primary key references public.app_users(id) on delete cascade,
  text        text not null default '',
  updated_at  timestamptz not null default now()
);

create table if not exists public.app_settings (
  id            int primary key default 1 check (id = 1),
  start_date    date not null default '2027-03-02',
  class_name    text not null default '연기 · 국어 융합수업',
  teacher_code  text not null default 'SERIN2026'
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.evaluations (
  user_id     uuid not null references public.app_users(id) on delete cascade,
  key         text not null check (key ~ '^[a-z0-9]{1,8}$'),
  scores      jsonb not null default '{}'::jsonb,
  comment     text not null default '',
  by_id       uuid references public.app_users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.app_settings add column if not exists weights jsonb not null
  default '{"basics":30,"scene":40,"process":20,"report":10}'::jsonb;

create index if not exists goals_user_idx on public.goals(user_id);
create index if not exists feedback_user_idx on public.feedback(user_id, week);

-- 표는 RLS로 잠그고(정책 없음 = 직접 접근 불가), 아래 함수를 통해서만 읽고 씁니다.
alter table public.app_users    enable row level security;
alter table public.app_sessions enable row level security;
alter table public.goals        enable row level security;
alter table public.entries      enable row level security;
alter table public.feedback     enable row level security;
alter table public.reports      enable row level security;
alter table public.app_settings enable row level security;
alter table public.evaluations  enable row level security;

-- ---------- 내부 도우미 ----------
create or replace function public._user_json(u public.app_users)
returns json language sql stable as $$
  select json_build_object('id', u.id, 'username', u.username, 'name', u.name,
                           'studentNo', u.student_no, 'group', u.grp, 'role', u.role);
$$;

create or replace function public._me(p_token uuid)
returns public.app_users
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  select a.* into u
    from public.app_sessions s join public.app_users a on a.id = s.user_id
   where s.token = p_token and s.expires_at > now();
  if u.id is null then
    raise exception '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  end if;
  return u;
end $$;

-- ---------- 계정 ----------
create or replace function public.api_signup(
  p_username text, p_password text, p_name text,
  p_student_no text default '', p_group text default '',
  p_role text default 'student', p_teacher_code text default '')
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users; t uuid;
begin
  p_username := lower(trim(coalesce(p_username, '')));
  if p_username !~ '^[a-z0-9_]{3,20}$' then raise exception '아이디는 영문 소문자·숫자·_ 3~20자로 입력해 주세요.'; end if;
  if length(coalesce(p_password, '')) < 4 then raise exception '비밀번호는 4자 이상이어야 합니다.'; end if;
  if trim(coalesce(p_name, '')) = '' then raise exception '이름을 입력해 주세요.'; end if;
  if p_role not in ('student', 'teacher') then raise exception '역할이 올바르지 않습니다.'; end if;
  if p_role = 'teacher' and coalesce(p_teacher_code, '') <> (select teacher_code from public.app_settings where id = 1) then
    raise exception '교사 가입 코드가 올바르지 않습니다.';
  end if;
  if exists (select 1 from public.app_users where username = p_username) then
    raise exception '이미 사용 중인 아이디입니다.';
  end if;

  insert into public.app_users (username, pw_hash, name, student_no, grp, role)
  values (p_username, crypt(p_password, gen_salt('bf')), trim(p_name),
          coalesce(p_student_no, ''), coalesce(p_group, ''), p_role)
  returning * into u;

  insert into public.app_sessions (user_id) values (u.id) returning token into t;
  return json_build_object('token', t, 'user', public._user_json(u));
end $$;

create or replace function public.api_login(p_username text, p_password text)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users; t uuid;
begin
  select * into u from public.app_users where username = lower(trim(coalesce(p_username, '')));
  if u.id is null or u.pw_hash <> crypt(coalesce(p_password, ''), u.pw_hash) then
    raise exception '아이디 또는 비밀번호가 맞지 않습니다.';
  end if;
  delete from public.app_sessions where expires_at < now();
  insert into public.app_sessions (user_id) values (u.id) returning token into t;
  return json_build_object('token', t, 'user', public._user_json(u));
end $$;

create or replace function public.api_logout(p_token uuid)
returns void
language sql security definer set search_path = public, extensions as $$
  delete from public.app_sessions where token = p_token;
$$;

-- ---------- 전체 상태 불러오기 (학생: 내 것만 / 교사: 전체) ----------
create or replace function public.api_state(p_token uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users; is_t boolean;
begin
  me := public._me(p_token);
  is_t := me.role = 'teacher';
  return json_build_object(
    'me', public._user_json(me),
    'users', coalesce((
      select json_agg(public._user_json(a) order by a.grp, a.student_no, a.name)
        from public.app_users a
       where is_t or a.id = me.id or a.role = 'teacher'), '[]'::json),
    'goals', coalesce((
      select json_agg(json_build_object('id', g.id, 'userId', g.user_id, 'text', g.text, 'status', g.status,
                                        'week', g.week, 'by', g.by_id, 'at', g.at) order by g.at)
        from public.goals g where is_t or g.user_id = me.id), '[]'::json),
    'entries', coalesce((
      select json_agg(json_build_object('userId', e.user_id, 'week', e.week, 'data', e.data,
                                        'requestFeedback', e.request_feedback,
                                        'createdAt', e.created_at, 'updatedAt', e.updated_at))
        from public.entries e where is_t or e.user_id = me.id), '[]'::json),
    'feedback', coalesce((
      select json_agg(json_build_object('id', f.id, 'userId', f.user_id, 'week', f.week,
                                        'by', f.by_id, 'text', f.text, 'at', f.at) order by f.at)
        from public.feedback f where is_t or f.user_id = me.id), '[]'::json),
    'reports', coalesce((
      select json_agg(json_build_object('userId', r.user_id, 'text', r.text))
        from public.reports r where is_t or r.user_id = me.id), '[]'::json),
    'evals', case when is_t then coalesce((
      select json_agg(json_build_object('userId', v.user_id, 'key', v.key, 'scores', v.scores,
                                        'comment', v.comment, 'by', v.by_id, 'at', v.updated_at))
        from public.evaluations v), '[]'::json) else '[]'::json end,
    'settings', (
      select json_build_object('startDate', s.start_date, 'className', s.class_name, 'weights', s.weights,
                               'teacherCode', case when is_t then s.teacher_code end)
        from public.app_settings s where s.id = 1)
  );
end $$;

-- ---------- 쓰기 ----------
create or replace function public.api_add_goal(p_token uuid, p_user_id uuid, p_text text, p_status text, p_week int)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if trim(coalesce(p_text, '')) = '' then raise exception '성장목표를 입력해 주세요.'; end if;
  if me.role = 'student' and (p_user_id <> me.id or p_status <> '초안') then
    raise exception '성장목표 확정·수정은 선생님만 할 수 있습니다.';
  end if;
  if not exists (select 1 from public.app_users where id = p_user_id and role = 'student') then
    raise exception '학생을 찾을 수 없습니다.';
  end if;
  insert into public.goals (user_id, text, status, week, by_id)
  values (p_user_id, trim(p_text), p_status, p_week, me.id);
end $$;

create or replace function public.api_save_entry(p_token uuid, p_week int, p_data jsonb, p_request boolean)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'student' then raise exception '일지는 학생 계정으로 작성해 주세요.'; end if;
  insert into public.entries (user_id, week, data, request_feedback)
  values (me.id, p_week, coalesce(p_data, '{}'::jsonb), coalesce(p_request, false))
  on conflict (user_id, week) do update
     set data = excluded.data, request_feedback = excluded.request_feedback, updated_at = now();
end $$;

create or replace function public.api_delete_entry(p_token uuid, p_week int)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'student' then raise exception '일지는 학생 본인만 삭제할 수 있습니다.'; end if;
  delete from public.entries  where user_id = me.id and week = p_week;
  delete from public.feedback where user_id = me.id and week = p_week;
end $$;

create or replace function public.api_add_feedback(p_token uuid, p_user_id uuid, p_week int, p_text text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'teacher' then raise exception '피드백은 선생님만 남길 수 있습니다.'; end if;
  if trim(coalesce(p_text, '')) = '' then raise exception '내용을 입력해 주세요.'; end if;
  insert into public.feedback (user_id, week, by_id, text) values (p_user_id, p_week, me.id, trim(p_text));
  update public.entries set request_feedback = false where user_id = p_user_id and week = p_week;
end $$;

create or replace function public.api_save_report(p_token uuid, p_text text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'student' then raise exception '보고서는 학생 계정으로 작성해 주세요.'; end if;
  insert into public.reports (user_id, text) values (me.id, coalesce(p_text, ''))
  on conflict (user_id) do update set text = excluded.text, updated_at = now();
end $$;

create or replace function public.api_save_eval(p_token uuid, p_user_id uuid, p_key text, p_scores jsonb, p_comment text default '')
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'teacher' then raise exception '평가는 선생님만 할 수 있습니다.'; end if;
  if not exists (select 1 from public.app_users where id = p_user_id and role = 'student') then
    raise exception '학생을 찾을 수 없습니다.';
  end if;
  insert into public.evaluations (user_id, key, scores, comment, by_id)
  values (p_user_id, p_key, coalesce(p_scores, '{}'::jsonb), coalesce(p_comment, ''), me.id)
  on conflict (user_id, key) do update
     set scores = excluded.scores, comment = excluded.comment, by_id = excluded.by_id, updated_at = now();
end $$;

drop function if exists public.api_save_settings(uuid, date, text, text);
create or replace function public.api_save_settings(p_token uuid, p_start_date date, p_class_name text,
                                                    p_teacher_code text default null, p_weights jsonb default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users;
begin
  me := public._me(p_token);
  if me.role <> 'teacher' then raise exception '설정은 선생님만 바꿀 수 있습니다.'; end if;
  update public.app_settings
     set start_date = coalesce(p_start_date, start_date),
         class_name = coalesce(nullif(trim(p_class_name), ''), class_name),
         teacher_code = coalesce(nullif(trim(p_teacher_code), ''), teacher_code),
         weights = coalesce(p_weights, weights)
   where id = 1;
end $$;

-- ---------- 권한: 사이트(anon)는 api_ 함수만 호출 가능 ----------
revoke all on function public._me(uuid) from public;
revoke all on function public._user_json(public.app_users) from public;
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'api\_%' loop
    execute format('revoke all on function %s from public', r.sig);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public._me(uuid) from anon, authenticated';
    execute 'revoke execute on function public._user_json(public.app_users) from anon, authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';
