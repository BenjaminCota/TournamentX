create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.handle_new_user() set schema private;
alter function public.is_app_role(text[]) set schema private;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_app_role(text[]) from public, anon;
grant execute on function private.is_app_role(text[]) to authenticated;

create or replace function public.admin_list_profiles()
returns setof public.profiles
language plpgsql
security definer set search_path = public, private
as $$
begin
  if not private.is_app_role(array['admin']) then raise exception 'Acceso denegado'; end if;
  return query select * from public.profiles order by created_at desc;
end;
$$;

create or replace function public.admin_update_profile(target_id uuid, new_role text default null, new_status text default null)
returns public.profiles
language plpgsql
security definer set search_path = public, private
as $$
declare updated public.profiles;
begin
  if not private.is_app_role(array['admin']) then raise exception 'Acceso denegado'; end if;
  if new_role is not null and new_role not in ('admin','organizer','captain','player') then raise exception 'Rol inválido'; end if;
  if new_status is not null and new_status not in ('ACTIVE','OFFLINE','SUSPENDED') then raise exception 'Estado inválido'; end if;
  update public.profiles set role = coalesce(new_role, role), status = coalesce(new_status, status) where id = target_id returning * into updated;
  return updated;
end;
$$;

revoke all on function public.admin_list_profiles() from public, anon;
revoke all on function public.admin_update_profile(uuid, text, text) from public, anon;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

drop policy public_read_tournaments on public.tournaments;
create policy anon_read_public_tournaments on public.tournaments for select to anon using (privacy = 'PUBLIC');
create policy authenticated_read_tournaments on public.tournaments for select to authenticated using (privacy = 'PUBLIC' or private.is_app_role(array['admin','organizer']));

create index if not exists contributions_created_by_idx on public.contributions(created_by);
create index if not exists matches_team1_idx on public.matches(team1_id);
create index if not exists matches_team2_idx on public.matches(team2_id);
create index if not exists matches_tournament_idx on public.matches(tournament_id);
create index if not exists notifications_venue_idx on public.notifications(venue_id);
create index if not exists prize_pools_tournament_idx on public.prize_pools(tournament_id);
create index if not exists reward_assignments_recipient_idx on public.reward_assignments(recipient_id);
create index if not exists reward_assignments_reward_idx on public.reward_assignments(reward_id);
create index if not exists rewards_prize_pool_idx on public.rewards(prize_pool_id);
create index if not exists rewards_sponsor_idx on public.rewards(sponsor_id);
create index if not exists roster_player_idx on public.team_roster(player_id);
create index if not exists participants_team_idx on public.tournament_participants(team_id);
create index if not exists participants_tournament_idx on public.tournament_participants(tournament_id);
