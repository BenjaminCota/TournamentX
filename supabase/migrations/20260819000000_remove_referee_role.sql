-- Normaliza los roles heredados al modelo actual de cuatro roles autenticados.
update public.profiles set role = 'player' where role not in ('admin', 'organizer', 'captain', 'player');

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'organizer', 'captain', 'player'));

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

drop policy if exists manage_matches on public.matches;
create policy manage_matches on public.matches for all to authenticated
  using (private.is_app_role(array['admin','organizer']))
  with check (private.is_app_role(array['admin','organizer']));

drop policy if exists manage_events on public.media_events;
create policy manage_events on public.media_events for all to authenticated
  using (private.is_app_role(array['admin','organizer']))
  with check (private.is_app_role(array['admin','organizer']));
