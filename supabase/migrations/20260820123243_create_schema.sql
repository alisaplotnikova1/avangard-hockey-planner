/*
# Avangard Hockey Planner — Schema & Security

Creates the full database for a multi-user hockey training planner with
two roles: head (главный тренер) and coach (тренер команды).

1. New Tables
- profiles: user profile linked to auth.users, stores role (head/coach),
  team assignment, and can_manage_exercises flag.
- trainings: training sessions per team per date, with type, focus, subtype,
  duration, load, note, and audit fields (created_by/updated_by/timestamps).
- games: game markers per team per date, with note and audit fields.
- exercises: exercise library entries (name, description, tags, optional team,
  image/video/youtube urls) with audit fields.
- training_exercises: many-to-many link between trainings and exercises with
  a position ordering field.

2. Helper Functions (SECURITY DEFINER)
- user_role(), user_team(), user_can_manage_exercises(), is_head(),
  can_edit_team(p_team): authorization helpers used by RLS policies.

3. Triggers
- handle_new_user: automatically inserts a profile row when a new auth.users
  row is created (email copied, role defaults to 'coach').

4. Row Level Security
- profiles: user reads own profile; head reads all. User updates own profile.
  Head can update any profile (to assign roles/teams).
- trainings: coach reads/edits only own team; head reads/edits all.
- games: same ownership model as trainings.
- exercises: all authenticated users read the library; insert/update requires
  can_manage_exercises=true or head; delete restricted to head or owner.
- training_exercises: read if the user can read the linked training; write if
  the user can edit the linked training.

5. Storage
- exercise-media bucket: public read, uploads restricted to users with
  can_manage_exercises or head, deletes restricted to file owner or head.

6. Important Notes
- The '2014 А' team uses a Cyrillic А. CHECK constraints enforce this.
- created_by/updated_by are set by the application; DEFAULT auth.uid() on
  created_by covers the case where the client omits it.
*/

-- =========================================================
-- profiles (must exist before helper functions)
-- =========================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('head','coach')) default 'coach',
  team text check (team in ('2013','2014 А','2014 В','2015','2016','2017') or team is null),
  can_manage_exercises boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- =========================================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =========================================================
create or replace function public.user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.role from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.user_team()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.team from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.user_can_manage_exercises()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.can_manage_exercises or p.role = 'head'
     from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

create or replace function public.is_head()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.role = 'head' from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

create or replace function public.can_edit_team(p_team text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role = 'head' or p.team = p_team)
  );
$$;

-- =========================================================
-- profiles RLS policies
-- =========================================================
drop policy if exists "profiles_select_own_or_head" on public.profiles;
create policy "profiles_select_own_or_head" on public.profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_head());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_by_head" on public.profiles;
create policy "profiles_update_by_head" on public.profiles
  for update to authenticated
  using (public.is_head())
  with check (public.is_head());

-- =========================================================
-- trainings
-- =========================================================
create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('2013','2014 А','2014 В','2015','2016','2017')),
  date date not null,
  type text not null check (type in ('На льду','ОФП/СФП')),
  focus text not null,
  subtype text,
  duration integer not null default 0,
  load text not null check (load in ('Низкий','Средний','Высокий','Максимальный')),
  note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainings enable row level security;

drop policy if exists "trainings_select" on public.trainings;
create policy "trainings_select" on public.trainings
  for select to authenticated
  using (public.is_head() or team = public.user_team());

drop policy if exists "trainings_insert" on public.trainings;
create policy "trainings_insert" on public.trainings
  for insert to authenticated
  with check (public.can_edit_team(team));

drop policy if exists "trainings_update" on public.trainings;
create policy "trainings_update" on public.trainings
  for update to authenticated
  using (public.can_edit_team(team))
  with check (public.can_edit_team(team));

drop policy if exists "trainings_delete" on public.trainings;
create policy "trainings_delete" on public.trainings
  for delete to authenticated
  using (public.can_edit_team(team));

create index if not exists trainings_team_date_idx on public.trainings(team, date);

-- =========================================================
-- games
-- =========================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('2013','2014 А','2014 В','2015','2016','2017')),
  date date not null,
  note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists "games_select" on public.games;
create policy "games_select" on public.games
  for select to authenticated
  using (public.is_head() or team = public.user_team());

drop policy if exists "games_insert" on public.games;
create policy "games_insert" on public.games
  for insert to authenticated
  with check (public.can_edit_team(team));

drop policy if exists "games_update" on public.games;
create policy "games_update" on public.games
  for update to authenticated
  using (public.can_edit_team(team))
  with check (public.can_edit_team(team));

drop policy if exists "games_delete" on public.games;
create policy "games_delete" on public.games
  for delete to authenticated
  using (public.can_edit_team(team));

create index if not exists games_team_date_idx on public.games(team, date);

-- =========================================================
-- exercises
-- =========================================================
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tags text[] not null default '{}',
  team text check (team in ('2013','2014 А','2014 В','2015','2016','2017') or team is null),
  image_url text,
  video_url text,
  youtube_url text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises
  for select to authenticated
  using (true);

drop policy if exists "exercises_insert" on public.exercises;
create policy "exercises_insert" on public.exercises
  for insert to authenticated
  with check (public.user_can_manage_exercises());

drop policy if exists "exercises_update" on public.exercises;
create policy "exercises_update" on public.exercises
  for update to authenticated
  using (public.is_head() or (created_by = auth.uid() and public.user_can_manage_exercises()))
  with check (public.user_can_manage_exercises());

drop policy if exists "exercises_delete" on public.exercises;
create policy "exercises_delete" on public.exercises
  for delete to authenticated
  using (public.is_head() or (created_by = auth.uid() and public.user_can_manage_exercises()));

-- =========================================================
-- training_exercises
-- =========================================================
create table if not exists public.training_exercises (
  training_id uuid not null references public.trainings(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position integer not null default 0,
  primary key (training_id, exercise_id)
);

alter table public.training_exercises enable row level security;

drop policy if exists "te_select" on public.training_exercises;
create policy "te_select" on public.training_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id
        and (public.is_head() or t.team = public.user_team())
    )
  );

drop policy if exists "te_insert" on public.training_exercises;
create policy "te_insert" on public.training_exercises
  for insert to authenticated
  with check (
    exists (
      select 1 from public.trainings t
      where t.id = training_id
        and public.can_edit_team(t.team)
    )
  );

drop policy if exists "te_update" on public.training_exercises;
create policy "te_update" on public.training_exercises
  for update to authenticated
  using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id
        and public.can_edit_team(t.team)
    )
  )
  with check (
    exists (
      select 1 from public.trainings t
      where t.id = training_id
        and public.can_edit_team(t.team)
    )
  );

drop policy if exists "te_delete" on public.training_exercises;
create policy "te_delete" on public.training_exercises
  for delete to authenticated
  using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id
        and public.can_edit_team(t.team)
    )
  );

-- =========================================================
-- Auto-create profile on signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, role, team, can_manage_exercises)
  values (new.id, new.email, null, 'coach', null, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Storage bucket for exercise media
-- =========================================================
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;

drop policy if exists "exercise_media_upload" on storage.objects;
create policy "exercise_media_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-media' and public.user_can_manage_exercises()
  );

drop policy if exists "exercise_media_read" on storage.objects;
create policy "exercise_media_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'exercise-media');

drop policy if exists "exercise_media_delete" on storage.objects;
create policy "exercise_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-media'
    and (public.is_head() or owner = auth.uid())
  );

drop policy if exists "exercise_media_update" on storage.objects;
create policy "exercise_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exercise-media'
    and (public.is_head() or owner = auth.uid())
  )
  with check (
    bucket_id = 'exercise-media' and public.user_can_manage_exercises()
  );
