-- JAMIN Properties — 0055 Training Academy + certification.
-- Courses → lessons + a quiz; agents enroll, learn, take the quiz and earn a
-- certificate at the pass mark. Quiz answers are never exposed to learners
-- (read via get_quiz which omits the correct index; grading via submit_quiz).
-- Fully additive.

create table if not exists public.academy_courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text not null default 'general',
  level       text not null default 'beginner',
  cover_url   text,
  pass_mark   int not null default 70,
  is_published boolean not null default false,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.academy_lessons (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.academy_courses(id) on delete cascade,
  title      text not null,
  content    text,
  video_url  text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists idx_academy_lessons_course on public.academy_lessons(course_id);

create table if not exists public.academy_quiz (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.academy_courses(id) on delete cascade,
  question      text not null,
  options       jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  sort_order    int not null default 100
);
create index if not exists idx_academy_quiz_course on public.academy_quiz(course_id);

create table if not exists public.academy_enrollments (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.academy_courses(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  progress     int not null default 0,
  score        int,
  certified    boolean not null default false,
  certified_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (course_id, user_id)
);
create index if not exists idx_academy_enroll_user on public.academy_enrollments(user_id);

drop trigger if exists trg_academy_courses_updated on public.academy_courses;
create trigger trg_academy_courses_updated before update on public.academy_courses
  for each row execute function public.set_updated_at();

alter table public.academy_courses     enable row level security;
alter table public.academy_lessons     enable row level security;
alter table public.academy_quiz        enable row level security;
alter table public.academy_enrollments enable row level security;

-- Courses + lessons: published readable by all signed-in; admins manage.
drop policy if exists academy_courses_read on public.academy_courses;
create policy academy_courses_read on public.academy_courses for select to authenticated
  using (is_published or public.auth_is_admin());
drop policy if exists academy_courses_admin on public.academy_courses;
create policy academy_courses_admin on public.academy_courses for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

drop policy if exists academy_lessons_read on public.academy_lessons;
create policy academy_lessons_read on public.academy_lessons for select to authenticated
  using (exists (select 1 from public.academy_courses c where c.id = academy_lessons.course_id and (c.is_published or public.auth_is_admin())));
drop policy if exists academy_lessons_admin on public.academy_lessons;
create policy academy_lessons_admin on public.academy_lessons for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- Quiz rows: ADMIN ONLY direct read (so correct_index never leaks); learners use get_quiz().
drop policy if exists academy_quiz_admin on public.academy_quiz;
create policy academy_quiz_admin on public.academy_quiz for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- Enrollments: learner manages own; admin reads all.
drop policy if exists academy_enroll_own on public.academy_enrollments;
create policy academy_enroll_own on public.academy_enrollments for all to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());

grant select, insert, update, delete on public.academy_courses, public.academy_lessons,
  public.academy_quiz, public.academy_enrollments to authenticated;

-- Quiz questions WITHOUT the answer key (for learners).
create or replace function public.get_quiz(p_course uuid)
returns table (id uuid, question text, options jsonb, sort_order int)
language sql stable security definer set search_path = public as $$
  select id, question, options, sort_order
  from public.academy_quiz
  where course_id = p_course
  order by sort_order, id;
$$;
revoke execute on function public.get_quiz(uuid) from public, anon;
grant  execute on function public.get_quiz(uuid) to authenticated;

-- Grade a submission (answers = jsonb object { quiz_id: chosen_index }).
create or replace function public.submit_quiz(p_course uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_total int; v_correct int; v_score int; v_pass int; v_passed boolean;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select count(*) into v_total from public.academy_quiz where course_id = p_course;
  if v_total = 0 then raise exception 'no quiz for this course'; end if;
  select count(*) into v_correct
    from public.academy_quiz q
    where q.course_id = p_course
      and (p_answers ->> q.id::text) is not null
      and (p_answers ->> q.id::text)::int = q.correct_index;
  v_score := round((v_correct::numeric / v_total) * 100);
  select pass_mark into v_pass from public.academy_courses where id = p_course;
  v_passed := v_score >= coalesce(v_pass, 70);

  insert into public.academy_enrollments (course_id, user_id, progress, score, certified, certified_at)
  values (p_course, v_self, 100, v_score, v_passed, case when v_passed then now() else null end)
  on conflict (course_id, user_id) do update
    set score = excluded.score,
        progress = 100,
        certified = public.academy_enrollments.certified or excluded.certified,
        certified_at = coalesce(public.academy_enrollments.certified_at, excluded.certified_at);

  return jsonb_build_object('score', v_score, 'passed', v_passed, 'correct', v_correct, 'total', v_total);
end $$;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant  execute on function public.submit_quiz(uuid, jsonb) to authenticated;
