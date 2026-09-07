-- Update CHECK constraints: replace '2013' with '2013 А' and '2013 В'
-- All 7 teams: '2013 А','2013 В','2014 А','2014 В','2015','2016','2017'

-- profiles
alter table public.profiles drop constraint if exists profiles_team_check;
alter table public.profiles add constraint profiles_team_check
  check (team in ('2013 А','2013 В','2014 А','2014 В','2015','2016','2017') or team is null);

-- trainings
alter table public.trainings drop constraint if exists trainings_team_check;
alter table public.trainings add constraint trainings_team_check
  check (team in ('2013 А','2013 В','2014 А','2014 В','2015','2016','2017'));

-- games
alter table public.games drop constraint if exists games_team_check;
alter table public.games add constraint games_team_check
  check (team in ('2013 А','2013 В','2014 А','2014 В','2015','2016','2017'));

-- exercises
alter table public.exercises drop constraint if exists exercises_team_check;
alter table public.exercises add constraint exercises_team_check
  check (team in ('2013 А','2013 В','2014 А','2014 В','2015','2016','2017') or team is null);
