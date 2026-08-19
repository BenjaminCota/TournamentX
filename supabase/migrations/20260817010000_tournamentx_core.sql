create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuario TournamentX',
  username text not null unique,
  email text not null,
  role text not null default 'player' check (role in ('admin','organizer','captain','player')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','OFFLINE','SUSPENDED')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  abbreviation text not null unique,
  logo_url text,
  tier text not null default 'PRO TIER',
  global_rank integer not null default 0,
  win_rate numeric(5,2) not null default 0,
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ties integer not null default 0,
  points integer not null default 0,
  trend text not null default 'EQUAL' check (trend in ('UP','DOWN','EQUAL')),
  region text not null default 'LATAM',
  description text not null default '',
  sport text not null default 'Esports',
  competition_type text not null default 'Regional',
  status text not null default 'active' check (status in ('active','inactive','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  lastname text not null default '',
  nickname text not null unique,
  username text not null unique,
  email text not null unique,
  role text not null default 'Jugador',
  avatar_url text,
  team_id text references public.teams(id) on delete set null,
  team_name text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','OFFLINE','SUSPENDED')),
  last_activity text not null default 'Reciente',
  rating_ovr integer not null default 85 check (rating_ovr between 0 and 100),
  position_name text not null default 'Jugador',
  nationality text not null default 'LATAM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_roster (
  id text primary key default gen_random_uuid()::text,
  team_id text not null references public.teams(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  role_name text not null default 'Jugador',
  ovr integer not null default 85 check (ovr between 0 and 100),
  kda text not null default '1.00 K/D',
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(team_id, player_id)
);

create table public.tournaments (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text not null default '',
  game text not null,
  game_category text not null default 'FPS',
  banner_url text,
  prize_pool text not null default '$0',
  prize_amount_usd numeric(14,2) not null default 0,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','COMPLETED','UPCOMING')),
  format text not null default 'SINGLE_ELIMINATION',
  date_label text not null default '',
  registered_teams integer not null default 0,
  max_teams integer not null default 16,
  privacy text not null default 'PUBLIC' check (privacy in ('PUBLIC','PRIVATE')),
  organizer text not null default 'TournamentX',
  tier text not null default 'COMMUNITY',
  venue text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  city text,
  country text,
  rounds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_participants (
  id text primary key default gen_random_uuid()::text,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  team_id text references public.teams(id) on delete set null,
  team_name text not null,
  seed integer,
  created_at timestamptz not null default now(),
  unique(tournament_id, team_name)
);

create table public.matches (
  id text primary key default gen_random_uuid()::text,
  schedule_id text,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  round_id text,
  team1_id text not null references public.teams(id),
  team2_id text not null references public.teams(id),
  scheduled_at timestamptz not null,
  venue text,
  mode text not null default 'best_of_1' check (mode in ('best_of_1','best_of_3','best_of_5')),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','postponed','cancelled')),
  score_team1 integer not null default 0,
  score_team2 integer not null default 0,
  stream_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  city text not null,
  country text not null,
  address text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  capacity integer not null default 0,
  image_url text,
  active_events_count integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references public.profiles(id) on delete cascade,
  venue_id text references public.venues(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.media_streams (
  id text primary key default gen_random_uuid()::text,
  event_id text,
  platform text not null check (platform in ('Twitch','YouTube')),
  title text not null,
  channel text not null,
  embed_id text not null,
  source_url text not null,
  viewers integer not null default 0,
  live boolean not null default true,
  media_kind text not null default 'live' check (media_kind in ('live','video')),
  source text not null default 'curated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_events (
  id text primary key default gen_random_uuid()::text,
  category text not null check (category in ('esports','sports')),
  sport text not null,
  tournament text not null,
  stage text not null,
  status text not null default 'live',
  starts_at timestamptz,
  viewers integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_lobbies (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  game text not null,
  server text not null,
  map text not null,
  team1 text not null,
  team2 text not null,
  status text not null default 'Waiting' check (status in ('In Game','Waiting','Paused')),
  ping integer not null default 0,
  players integer not null default 0,
  max_players integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsors (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  contact_email text not null unique,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.prize_pools (
  id text primary key default gen_random_uuid()::text,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  target_amount numeric(14,2) not null default 0,
  funded_amount numeric(14,2) not null default 0,
  status text not null default 'open' check (status in ('draft','open','funded','distributed','cancelled')),
  distribution_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contributions (
  id text primary key default gen_random_uuid()::text,
  prize_pool_id text not null references public.prize_pools(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  payer_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  provider text not null check (provider in ('stripe')),
  status text not null default 'pending' check (status in ('pending','authorized','paid','failed','cancelled','refunded')),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id text primary key default gen_random_uuid()::text,
  sponsor_id text references public.sponsors(id) on delete set null,
  prize_pool_id text references public.prize_pools(id) on delete cascade,
  reward_type text not null check (reward_type in ('physical','game_code','gift_card','coupon')),
  name text not null,
  description text,
  quantity integer not null check (quantity > 0),
  milestone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_assignments (
  id text primary key default gen_random_uuid()::text,
  reward_id text not null references public.rewards(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  redemption_code text not null unique,
  status text not null default 'assigned' check (status in ('assigned','redeemed','cancelled')),
  assigned_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index teams_region_idx on public.teams(region);
create index players_team_idx on public.players(team_id);
create index roster_team_idx on public.team_roster(team_id, status);
create index tournaments_status_idx on public.tournaments(status);
create index matches_status_time_idx on public.matches(status, scheduled_at);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index media_lobbies_status_idx on public.media_lobbies(status);
create index contributions_pool_idx on public.contributions(prize_pool_id, status);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger players_updated_at before update on public.players for each row execute function public.set_updated_at();
create trigger tournaments_updated_at before update on public.tournaments for each row execute function public.set_updated_at();
create trigger matches_updated_at before update on public.matches for each row execute function public.set_updated_at();
create trigger media_streams_updated_at before update on public.media_streams for each row execute function public.set_updated_at();
create trigger media_events_updated_at before update on public.media_events for each row execute function public.set_updated_at();
create trigger media_lobbies_updated_at before update on public.media_lobbies for each row execute function public.set_updated_at();
create trigger prize_pools_updated_at before update on public.prize_pools for each row execute function public.set_updated_at();
create trigger contributions_updated_at before update on public.contributions for each row execute function public.set_updated_at();
create trigger rewards_updated_at before update on public.rewards for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_role text;
  base_username text;
begin
  first_role := case when not exists (select 1 from public.profiles) then 'admin' else 'player' end;
  base_username := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, 'usuario'), '@', 1));
  insert into public.profiles (id, name, username, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Usuario TournamentX'),
    base_username || case when exists (select 1 from public.profiles where username = base_username) then '-' || left(new.id::text, 6) else '' end,
    coalesce(new.email, ''),
    first_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_app_role(allowed_roles text[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'ACTIVE' and role = any(allowed_roles)
  );
$$;

create or replace function public.admin_list_profiles()
returns setof public.profiles
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_role(array['admin']) then raise exception 'Acceso denegado'; end if;
  return query select * from public.profiles order by created_at desc;
end;
$$;

create or replace function public.admin_update_profile(target_id uuid, new_role text default null, new_status text default null)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare updated public.profiles;
begin
  if not public.is_app_role(array['admin']) then raise exception 'Acceso denegado'; end if;
  if new_role is not null and new_role not in ('admin','organizer','captain','player') then raise exception 'Rol inválido'; end if;
  if new_status is not null and new_status not in ('ACTIVE','OFFLINE','SUSPENDED') then raise exception 'Estado inválido'; end if;
  update public.profiles set role = coalesce(new_role, role), status = coalesce(new_status, status) where id = target_id returning * into updated;
  return updated;
end;
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_roster enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.matches enable row level security;
alter table public.venues enable row level security;
alter table public.notifications enable row level security;
alter table public.media_streams enable row level security;
alter table public.media_events enable row level security;
alter table public.media_lobbies enable row level security;
alter table public.sponsors enable row level security;
alter table public.prize_pools enable row level security;
alter table public.contributions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_assignments enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_app_role(array['admin']));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy public_read_teams on public.teams for select to anon, authenticated using (true);
create policy manage_teams on public.teams for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_players on public.players for select to anon, authenticated using (true);
create policy manage_players on public.players for all to authenticated using (public.is_app_role(array['admin','organizer','captain'])) with check (public.is_app_role(array['admin','organizer','captain']));
create policy public_read_roster on public.team_roster for select to anon, authenticated using (true);
create policy manage_roster on public.team_roster for all to authenticated using (public.is_app_role(array['admin','organizer','captain'])) with check (public.is_app_role(array['admin','organizer','captain']));
create policy public_read_tournaments on public.tournaments for select to anon, authenticated using (privacy = 'PUBLIC' or public.is_app_role(array['admin','organizer']));
create policy manage_tournaments on public.tournaments for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_participants on public.tournament_participants for select to anon, authenticated using (true);
create policy manage_participants on public.tournament_participants for all to authenticated using (public.is_app_role(array['admin','organizer','captain'])) with check (public.is_app_role(array['admin','organizer','captain']));
create policy public_read_matches on public.matches for select to anon, authenticated using (true);
create policy manage_matches on public.matches for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_venues on public.venues for select to anon, authenticated using (true);
create policy manage_venues on public.venues for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy own_notifications on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_app_role(array['admin','organizer']));
create policy manage_notifications on public.notifications for insert to authenticated with check (public.is_app_role(array['admin','organizer']));
create policy update_own_notifications on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy public_read_streams on public.media_streams for select to anon, authenticated using (true);
create policy manage_streams on public.media_streams for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_events on public.media_events for select to anon, authenticated using (true);
create policy manage_events on public.media_events for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_lobbies on public.media_lobbies for select to anon, authenticated using (true);
create policy manage_lobbies on public.media_lobbies for all to authenticated using (public.is_app_role(array['admin','organizer','captain'])) with check (public.is_app_role(array['admin','organizer','captain']));
create policy public_read_sponsors on public.sponsors for select to anon, authenticated using (active);
create policy manage_sponsors on public.sponsors for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_pools on public.prize_pools for select to anon, authenticated using (true);
create policy manage_pools on public.prize_pools for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy own_contributions_read on public.contributions for select to authenticated using (created_by = auth.uid() or public.is_app_role(array['admin','organizer']));
create policy create_contribution on public.contributions for insert to authenticated with check (created_by = auth.uid());
create policy manage_contributions on public.contributions for update to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy public_read_rewards on public.rewards for select to anon, authenticated using (active);
create policy manage_rewards on public.rewards for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));
create policy own_assignments on public.reward_assignments for select to authenticated using (recipient_id = auth.uid() or public.is_app_role(array['admin','organizer']));
create policy manage_assignments on public.reward_assignments for all to authenticated using (public.is_app_role(array['admin','organizer'])) with check (public.is_app_role(array['admin','organizer']));

grant usage on schema public to anon, authenticated;
grant select on public.teams, public.players, public.team_roster, public.tournaments, public.tournament_participants, public.matches, public.venues, public.media_streams, public.media_events, public.media_lobbies, public.sponsors, public.prize_pools, public.rewards to anon, authenticated;
grant select, insert, update, delete on public.teams, public.players, public.team_roster, public.tournaments, public.tournament_participants, public.matches, public.venues, public.notifications, public.media_streams, public.media_events, public.media_lobbies, public.sponsors, public.prize_pools, public.contributions, public.rewards, public.reward_assignments to authenticated;
grant select, update on public.profiles to authenticated;
grant execute on function public.is_app_role(text[]) to anon, authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tournamentx-media', 'tournamentx-media', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy public_read_tournamentx_media on storage.objects for select to public using (bucket_id = 'tournamentx-media');
create policy authenticated_upload_tournamentx_media on storage.objects for insert to authenticated with check (bucket_id = 'tournamentx-media' and public.is_app_role(array['admin','organizer','captain','player']));
create policy authenticated_update_tournamentx_media on storage.objects for update to authenticated using (bucket_id = 'tournamentx-media' and owner_id = auth.uid()::text) with check (bucket_id = 'tournamentx-media' and owner_id = auth.uid()::text);
create policy authenticated_delete_tournamentx_media on storage.objects for delete to authenticated using (bucket_id = 'tournamentx-media' and (owner_id = auth.uid()::text or public.is_app_role(array['admin'])));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches') then alter publication supabase_realtime add table public.matches; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'media_lobbies') then alter publication supabase_realtime add table public.media_lobbies; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
end $$;

insert into public.teams (id, name, abbreviation, logo_url, tier, region, description, sport, competition_type, status)
values
  ('team-lnx','LUMINEX ESPORTS','LNX','https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80','PRO TIER','LATAM Sur','Equipo profesional centrado en tácticas de alta precisión.','Valorant','Regional','active'),
  ('team-ttn','Titans','TTN','https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80','PRO TIER','LATAM Norte','Penta-campeones continentales.','Valorant','Regional','active')
on conflict (id) do nothing;

insert into public.players (id, name, lastname, nickname, username, email, role, avatar_url, team_id, team_name, rating_ovr, position_name)
values
  ('player-viper','Alex','Chen','Viper','@viper','viper@tournamentx.gg','Jugador','https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80','team-lnx','LUMINEX ESPORTS',93,'Duelista'),
  ('player-nova','Sarah','Jenkins','Nova','@nova','nova@tournamentx.gg','Jugador','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80','team-lnx','LUMINEX ESPORTS',91,'Controlador'),
  ('player-phantom','Lucas','Ferreira','Phantom','@phantom','phantom@tournamentx.gg','Jugador','https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80','team-lnx','LUMINEX ESPORTS',89,'Iniciador'),
  ('player-striker','Gabriel','Ríos','Striker','@striker','striker@tournamentx.gg','Jugador','https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80','team-lnx','LUMINEX ESPORTS',88,'Centinela')
on conflict (id) do nothing;

insert into public.team_roster (id, team_id, player_id, role_name, ovr, kda)
values
  ('roster-viper','team-lnx','player-viper','Duelista',93,'1.42 K/D'),
  ('roster-nova','team-lnx','player-nova','Controlador',91,'1.31 K/D'),
  ('roster-phantom','team-lnx','player-phantom','Iniciador',89,'1.28 K/D'),
  ('roster-striker','team-lnx','player-striker','Centinela',88,'1.22 K/D')
on conflict (id) do nothing;

insert into public.tournaments (id, name, description, game, game_category, banner_url, prize_pool, prize_amount_usd, status, format, date_label, registered_teams, max_teams, privacy, organizer, tier, venue)
values
  ('tour-1','TournamentX Community Cup','Copa comunitaria de lanzamiento.','Valorant','FPS','https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80','$1,000 USD',1000,'IN_PROGRESS','SINGLE_ELIMINATION','20–24 AGO',4,8,'PUBLIC','TournamentX','COMMUNITY','Arena CDMX'),
  ('tour-2','Copa Grupos LATAM','Fase de grupos y eliminatorias regionales.','League of Legends','MOBA','https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80','$2,500 USD',2500,'OPEN','GROUP_STAGE_PLAYOFFS','01–08 SEP',0,8,'PUBLIC','TournamentX','CHALLENGER','En línea')
on conflict (id) do nothing;

insert into public.matches (id, tournament_id, round_id, team1_id, team2_id, scheduled_at, venue, mode, status, score_team1, score_team2, stream_url)
values ('match-final-latam','tour-1','round-2','team-lnx','team-ttn','2026-08-20T18:00:00Z','Arena CDMX','best_of_3','scheduled',0,0,'https://www.youtube.com/watch?v=6VOfpE_HGpw')
on conflict (id) do nothing;

insert into public.venues (id, name, city, country, address, latitude, longitude, capacity, image_url, active_events_count, features)
values ('venue-cdmx','Arena TournamentX CDMX','Ciudad de México','México','Av. Reforma 100',19.432608,-99.133209,5000,'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80',2,'["Streaming","Accesibilidad","Estacionamiento"]'::jsonb)
on conflict (id) do nothing;

insert into public.media_streams (id, event_id, platform, title, channel, embed_id, source_url, viewers, live, media_kind, source)
values
  ('stream-youtube-latam','event-lol-latam','YouTube','LYON vs SEN | LCS x LoL Esports LATAM | Bo3','LoL Esports Latinoamérica','6VOfpE_HGpw','https://www.youtube.com/watch?v=6VOfpE_HGpw',26800,true,'live','curated'),
  ('stream-twitch-latam','event-lol-latam','Twitch','LoL Esports Latinoamérica — canal oficial','lolesportsla','lolesportsla','https://www.twitch.tv/lolesportsla',0,true,'live','curated')
on conflict (id) do nothing;

insert into public.media_events (id, category, sport, tournament, stage, status, viewers, payload)
values ('event-lol-latam','esports','League of Legends','LCS x LoL Esports LATAM','LYON vs SEN · Mejor de 3','live',26800,'{"participantA":{"name":"LYON","shortName":"LYON","score":0},"participantB":{"name":"SEN","shortName":"SEN","score":0},"clockLabel":"En directo","elapsedSeconds":0,"context":"Señal oficial enlazada","stats":[]}'::jsonb)
on conflict (id) do nothing;

insert into public.media_lobbies (id, name, game, server, map, team1, team2, status, ping, players, max_players)
values ('lobby-final-latam','Final LATAM','Valorant','LATAM Sur','Ascent','Luminex','Titans','In Game',32,10,10)
on conflict (id) do nothing;

insert into public.sponsors (id, name, contact_email, active)
values ('sponsor-tx','TournamentX','partners@tournamentx.gg',true)
on conflict (id) do nothing;

insert into public.prize_pools (id, tournament_id, name, currency, target_amount, funded_amount, status, distribution_rules)
values ('pool-community','tour-1','Bolsa Community Cup','USD',1000,1000,'funded','[{"position":1,"percentage":60},{"position":2,"percentage":30},{"position":3,"percentage":10}]'::jsonb)
on conflict (id) do nothing;

insert into public.rewards (id, sponsor_id, prize_pool_id, reward_type, name, description, quantity, milestone, active)
values ('reward-mvp','sponsor-tx','pool-community','gift_card','Premio MVP','Tarjeta de regalo para el jugador más valioso.',1,'MVP de la final',true)
on conflict (id) do nothing;
