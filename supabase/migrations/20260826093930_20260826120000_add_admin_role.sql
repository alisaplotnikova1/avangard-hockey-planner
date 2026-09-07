/*
# Add admin role

1. Changes
- Add 'admin' to the profiles.role CHECK constraint (now: head, coach, admin).
- Update helper function is_head() to return true for both 'head' and 'admin'.
- Update helper function can_edit_team() to allow 'admin' full access (same as 'head').
- Update helper function user_can_manage_exercises() to treat 'admin' same as 'head'.
- Update profiles SELECT policy to allow admin to see all profiles (is_head covers this).
- Update profiles UPDATE policy to allow admin to update any profile (is_head covers this).
- Update storage policies to allow admin same access as head (is_head covers this).
- Set the first created auth.users row to admin role with full permissions.

2. Security
- admin is fully equivalent to head in all RLS policies and helper functions.
- No new tables or columns.
*/

-- 1. Update CHECK constraint on profiles.role to include 'admin'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('head','coach','admin'));

-- 2. Update is_head() to return true for 'head' OR 'admin'
create or replace function public.is_head()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.role in ('head','admin') from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

-- 3. Update can_edit_team() to allow admin full access
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
      and (p.role in ('head','admin') or p.team = p_team)
  );
$$;

-- 4. Update user_can_manage_exercises() to treat admin same as head
create or replace function public.user_can_manage_exercises()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.can_manage_exercises or p.role in ('head','admin')
     from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

-- 5. Set first user as admin
update public.profiles
set role = 'admin', team = null, can_manage_exercises = true
where user_id = (
  select id from auth.users order by created_at limit 1
);
