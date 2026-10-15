-- Phase 4: live price reports from players, and "Ask the Bazaar" questions with a review queue.
--
-- Security model
--   * Visitors (anon) can INSERT only a few named columns; status always starts as pending/open.
--   * Visitors can SELECT only reviewed rows (approved reports, answered questions).
--   * Nobody but the review functions can UPDATE or DELETE. Those functions require the review key,
--     which is stored only as a bcrypt hash in a private schema the API does not expose.
--   * Submissions are rate-limited per connection (salted hash of the client IP) with a site-wide hourly backstop.
--   * The review key is set separately (never committed):
--       insert into bazaar_private.settings (review_key_hash) values (extensions.crypt('<key>', extensions.gen_salt('bf', 10)));

create schema if not exists bazaar_private;
revoke all on schema bazaar_private from public, anon, authenticated;

create table bazaar_private.settings (
  id boolean primary key default true check (id),
  review_key_hash text not null,
  ip_salt text not null default encode(extensions.gen_random_bytes(16), 'hex')
);

create table bazaar_private.submissions (
  ip_hash text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index submissions_lookup on bazaar_private.submissions (ip_hash, kind, created_at);

-- ------------------------------------------------------------------ price reports
create table public.price_reports (
  id uuid primary key default gen_random_uuid(),
  item_id text not null check (item_id in ('chai', 'vadapav', 'train', 'auto', 'petrol', 'onion', 'milk')),
  price numeric(10, 2) not null check (price > 0 and price < 100000),
  paid_on date not null,
  area text check (char_length(area) <= 40),
  note text check (char_length(note) <= 140),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index price_reports_public on public.price_reports (status, item_id, paid_on desc);

-- ------------------------------------------------------------------ questions
create table public.bazaar_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 200),
  status text not null default 'open' check (status in ('open', 'answered', 'rejected')),
  item_name text check (char_length(item_name) <= 60),
  price numeric(12, 2) check (price > 0),
  unit text check (char_length(unit) <= 40),
  year int check (year between 1850 and 2100),
  place text check (char_length(place) <= 60),
  answer text check (char_length(answer) <= 600),
  source_title text check (char_length(source_title) <= 160),
  source_url text check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 500),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check (status <> 'answered' or (item_name is not null and price is not null and year is not null and source_url is not null))
);
create index bazaar_questions_public on public.bazaar_questions (status, answered_at desc);

-- ------------------------------------------------------------------ privileges + RLS
alter table public.price_reports enable row level security;
alter table public.bazaar_questions enable row level security;

revoke all on public.price_reports, public.bazaar_questions from anon, authenticated;
grant select on public.price_reports, public.bazaar_questions to anon, authenticated;
grant insert (item_id, price, paid_on, area, note) on public.price_reports to anon, authenticated;
grant insert (question) on public.bazaar_questions to anon, authenticated;

create policy "anyone can read approved reports" on public.price_reports
  for select to anon, authenticated using (status = 'approved');
create policy "anyone can submit a pending report" on public.price_reports
  for insert to anon, authenticated with check (status = 'pending' and reviewed_at is null);

create policy "anyone can read answered questions" on public.bazaar_questions
  for select to anon, authenticated using (status = 'answered');
create policy "anyone can ask an open question" on public.bazaar_questions
  for insert to anon, authenticated with check (status = 'open' and answered_at is null and price is null and answer is null);

-- ------------------------------------------------------------------ submission guard (rate limit + tidy text)
create function bazaar_private.tidy(s text) returns text
language sql immutable set search_path = '' as $fn$
  select nullif(btrim(regexp_replace(
    translate(regexp_replace(coalesce(s, ''), '[[:cntrl:]]', ' ', 'g'),
      chr(8203) || chr(8204) || chr(8205) || chr(8206) || chr(8207) || chr(8234) || chr(8235) || chr(8236) || chr(8237) || chr(8238), ''),
    '\s+', ' ', 'g')), '')
$fn$;

-- Salted hash of the client IP (never stored in the clear).
create function bazaar_private.client_hash() returns text
language plpgsql security definer set search_path = '' as $fn$
declare
  ip text;
  h text;
begin
  ip := coalesce(nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''), 'unknown');
  select encode(extensions.digest(ip || s.ip_salt, 'sha256'), 'hex') into h from bazaar_private.settings s;
  return coalesce(h, 'unsalted');
end
$fn$;

create function bazaar_private.guard_submission() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  v_kind text := tg_argv[0];
  v_hash text := bazaar_private.client_hash();
  v_recent int;
  v_global int;
begin
  select count(*) filter (where sub.ip_hash = v_hash), count(*) into v_recent, v_global
    from bazaar_private.submissions sub
    where sub.kind = v_kind and sub.created_at > now() - interval '1 hour';
  if v_recent >= (case v_kind when 'report' then 10 else 5 end) then
    raise exception 'Too many submissions from this connection. Please try again in an hour.' using errcode = 'P0001';
  end if;
  -- backstop against someone rotating addresses
  if v_global >= (case v_kind when 'report' then 300 else 100 end) then
    raise exception 'The bazaar is very busy right now. Please try again in an hour.' using errcode = 'P0001';
  end if;

  if v_kind = 'report' then
    if (select count(*) from public.price_reports where status = 'pending') >= 2000 then
      raise exception 'The review queue is full right now. Please try again later.' using errcode = 'P0001';
    end if;
    if new.paid_on > current_date + 1 or new.paid_on < current_date - 730 then
      raise exception 'Reports must be for a purchase in the last two years.' using errcode = 'P0001';
    end if;
    new.area := bazaar_private.tidy(new.area);
    new.note := bazaar_private.tidy(new.note);
  else
    if (select count(*) from public.bazaar_questions where status = 'open') >= 1000 then
      raise exception 'The review queue is full right now. Please try again later.' using errcode = 'P0001';
    end if;
    new.question := bazaar_private.tidy(new.question);
    if new.question is null or char_length(new.question) < 5 then
      raise exception 'Please write a slightly longer question.' using errcode = 'P0001';
    end if;
  end if;

  insert into bazaar_private.submissions (ip_hash, kind) values (v_hash, v_kind);
  return new;
end
$fn$;

create trigger guard_report before insert on public.price_reports
  for each row execute function bazaar_private.guard_submission('report');
create trigger guard_question before insert on public.bazaar_questions
  for each row execute function bazaar_private.guard_submission('question');

-- ------------------------------------------------------------------ review functions (need the review key)
create function bazaar_private.require_key(key text) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  if key is null or not exists (
    select 1 from bazaar_private.settings s where s.review_key_hash = extensions.crypt(key, s.review_key_hash)
  ) then
    raise exception 'Wrong review key.' using errcode = '28000';
  end if;
end
$fn$;

create function public.review_queue(key text) returns json
language plpgsql security definer set search_path = '' as $fn$
begin
  perform bazaar_private.require_key(key);
  return json_build_object(
    'reports', coalesce((select json_agg(r order by r.created_at) from (
      select id, item_id, price, paid_on, area, note, created_at from public.price_reports where status = 'pending' order by created_at limit 200) r), '[]'::json),
    'questions', coalesce((select json_agg(q order by q.created_at) from (
      select id, question, created_at from public.bazaar_questions where status = 'open' order by created_at limit 200) q), '[]'::json)
  );
end
$fn$;

create function public.review_report(key text, report_id uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform bazaar_private.require_key(key);
  update public.price_reports
    set status = case when approve then 'approved' else 'rejected' end, reviewed_at = now()
    where id = report_id and status = 'pending';
end
$fn$;

create function public.review_answer(
  key text, question_id uuid, item_name text, price numeric, unit text, year int,
  place text, answer text, source_title text, source_url text
) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform bazaar_private.require_key(key);
  update public.bazaar_questions q set
    status = 'answered',
    item_name = bazaar_private.tidy(review_answer.item_name),
    price = review_answer.price,
    unit = bazaar_private.tidy(review_answer.unit),
    year = review_answer.year,
    place = bazaar_private.tidy(review_answer.place),
    answer = bazaar_private.tidy(review_answer.answer),
    source_title = bazaar_private.tidy(review_answer.source_title),
    source_url = btrim(review_answer.source_url),
    answered_at = now()
  where q.id = question_id and q.status = 'open';
end
$fn$;

create function public.review_reject_question(key text, question_id uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform bazaar_private.require_key(key);
  update public.bazaar_questions set status = 'rejected', answered_at = now() where id = question_id and status = 'open';
end
$fn$;

revoke all on function public.review_queue(text), public.review_report(text, uuid, boolean),
  public.review_answer(text, uuid, text, numeric, text, int, text, text, text, text),
  public.review_reject_question(text, uuid) from public;
grant execute on function public.review_queue(text), public.review_report(text, uuid, boolean),
  public.review_answer(text, uuid, text, numeric, text, int, text, text, text, text),
  public.review_reject_question(text, uuid) to anon, authenticated;
revoke all on function bazaar_private.require_key(text), bazaar_private.client_hash(), bazaar_private.tidy(text) from public;
