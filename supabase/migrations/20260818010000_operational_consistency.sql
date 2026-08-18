-- Alinea identidad y datos operativos con el flujo actual de TournamentX.
alter table public.profiles alter column role set default 'player';
alter table public.media_lobbies add column if not exists match_id text references public.matches(id) on delete set null;
alter table public.media_lobbies add column if not exists stream_id text references public.media_streams(id) on delete set null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_catalog
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

-- Recupera instalaciones que ya tenían perfiles pero nunca obtuvieron administrador.
do $$
declare
  first_profile uuid;
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    select id into first_profile from public.profiles order by created_at asc limit 1;
    if first_profile is not null then
      update public.profiles set role = 'admin', status = 'ACTIVE' where id = first_profile;
    end if;
  end if;
end;
$$;

insert into public.teams
  (id, name, abbreviation, logo_url, tier, global_rank, win_rate, matches_played, wins, losses, ties, points, trend, region, description, sport, competition_type, status)
values
  ('team-phoenix','Phoenix Rising','PHX','https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=200&auto=format&fit=crop&q=80','A TIER',5,0,1,0,1,0,0,'EQUAL','México','Proyecto competitivo de Valorant con base en México.','Valorant','Challengers','active'),
  ('team-andes','Andes Guardians','AND','https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80','PRO TIER',2,100,1,1,0,0,3,'UP','LATAM Sur','Organización regional de League of Legends.','League of Legends','Liga Regional','active'),
  ('team-nova','Nova Velocity','NVA','https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80','PRO TIER',6,0,2,0,2,0,0,'DOWN','Norteamérica','Roster internacional inscrito en TournamentX.','Rocket League','Open Circuit','active'),
  ('team-raven','Raven Protocol','RVN','https://images.unsplash.com/photo-1603481546238-487240415921?w=200&auto=format&fit=crop&q=80','S TIER',1,100,1,1,0,0,3,'UP','Europa','Quinteto europeo inscrito en TournamentX.','Counter-Strike 2','International','active'),
  ('team-sonora-fc','Sonora Solar FC','SSF','https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80','PRO TIER',1,100,1,1,0,0,3,'UP','México','Club registrado en TournamentX con base en Hermosillo.','Fútbol','Liga Regional','active'),
  ('team-baja-fc','Baja Marineros','BJM','https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=200&auto=format&fit=crop&q=80','CHALLENGER',2,0,1,0,1,0,0,'DOWN','México','Club registrado en TournamentX con base en Baja California.','Fútbol','Liga Regional','active'),
  ('team-desert-hoops','Desert Hoops','DHP','https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&auto=format&fit=crop&q=80','PRO TIER',1,100,1,1,0,0,3,'UP','Norteamérica','Equipo de baloncesto registrado en TournamentX.','Baloncesto','Open League','active'),
  ('team-pacific-hoops','Pacific Five','PCF','https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=200&auto=format&fit=crop&q=80','CHALLENGER',2,0,1,0,1,0,0,'DOWN','Norteamérica','Formación competitiva de la costa oeste.','Baloncesto','Open League','active')
on conflict (id) do update set
  name = excluded.name, abbreviation = excluded.abbreviation, logo_url = excluded.logo_url,
  tier = excluded.tier, global_rank = excluded.global_rank, win_rate = excluded.win_rate,
  matches_played = excluded.matches_played, wins = excluded.wins, losses = excluded.losses,
  ties = excluded.ties, points = excluded.points, trend = excluded.trend, region = excluded.region,
  description = excluded.description, sport = excluded.sport, competition_type = excluded.competition_type,
  status = excluded.status;

update public.teams set global_rank = 1, win_rate = 100, matches_played = 2, wins = 2, losses = 0, ties = 0, points = 6, trend = 'UP'
where id = 'team-lnx';

update public.teams set global_rank = 4, win_rate = 0, matches_played = 1, wins = 0, losses = 1, ties = 0, points = 0, trend = 'EQUAL'
where id = 'team-ttn';

insert into public.players
  (id, name, lastname, nickname, username, email, role, team_id, team_name, status, last_activity, rating_ovr, position_name, nationality)
values
  ('player-20','Daniel','Valdez','Dani','@dani_ssf','dani.ssf@tournamentx.gg','Jugador','team-sonora-fc','Sonora Solar FC','ACTIVE','Registro verificado',84,'Delantero','MX'),
  ('player-21','Marco','Ochoa','Mako','@mako_ssf','mako.ssf@tournamentx.gg','Jugador','team-sonora-fc','Sonora Solar FC','ACTIVE','Registro verificado',82,'Mediocampista','MX'),
  ('player-22','Iván','Morales','Ivo','@ivo_bjm','ivo.bjm@tournamentx.gg','Jugador','team-baja-fc','Baja Marineros','ACTIVE','Registro verificado',86,'Portero','MX'),
  ('player-23','Luis','Núñez','Lucho','@lucho_bjm','lucho.bjm@tournamentx.gg','Jugador','team-baja-fc','Baja Marineros','ACTIVE','Registro verificado',81,'Defensa','MX'),
  ('player-24','Jordan','Reed','JR','@jr_dhp','jr.dhp@tournamentx.gg','Jugador','team-desert-hoops','Desert Hoops','ACTIVE','Registro verificado',88,'Base','US'),
  ('player-25','Mateo','Lara','Teo','@teo_dhp','teo.dhp@tournamentx.gg','Jugador','team-desert-hoops','Desert Hoops','ACTIVE','Registro verificado',85,'Alero','MX'),
  ('player-26','Chris','Walker','CW','@cw_pcf','cw.pcf@tournamentx.gg','Jugador','team-pacific-hoops','Pacific Five','ACTIVE','Registro verificado',87,'Escolta','US'),
  ('player-27','Andrés','Silva','Dre','@dre_pcf','dre.pcf@tournamentx.gg','Jugador','team-pacific-hoops','Pacific Five','ACTIVE','Registro verificado',83,'Pívot','CO')
on conflict (id) do update set
  team_id = excluded.team_id, team_name = excluded.team_name, status = excluded.status,
  last_activity = excluded.last_activity, rating_ovr = excluded.rating_ovr, position_name = excluded.position_name;

insert into public.team_roster (id, team_id, player_id, role_name, ovr, status)
values
  ('membership-20','team-sonora-fc','player-20','Delantero',84,'active'),
  ('membership-21','team-sonora-fc','player-21','Mediocampista',82,'active'),
  ('membership-22','team-baja-fc','player-22','Portero',86,'active'),
  ('membership-23','team-baja-fc','player-23','Defensa',81,'active'),
  ('membership-24','team-desert-hoops','player-24','Base',88,'active'),
  ('membership-25','team-desert-hoops','player-25','Alero',85,'active'),
  ('membership-26','team-pacific-hoops','player-26','Escolta',87,'active'),
  ('membership-27','team-pacific-hoops','player-27','Pívot',83,'active')
on conflict (id) do update set role_name = excluded.role_name, ovr = excluded.ovr, status = excluded.status;

insert into public.tournaments
  (id, name, description, game, game_category, prize_pool, prize_amount_usd, status, format, date_label, registered_teams, max_teams, privacy, organizer, tier, venue)
values
  ('tour-community','Circuito Valorant LATAM','Competencia registrada de eliminación directa.','Valorant','FPS','$1,000 USD',1000,'IN_PROGRESS','SINGLE_ELIMINATION','AGO 2026',3,8,'PUBLIC','TournamentX','COMMUNITY','Arena TournamentX CDMX'),
  ('tour-groups','Liga MOBA Regional','Temporada regional con resultados confirmados.','League of Legends','MOBA','$2,500 USD',2500,'IN_PROGRESS','GROUP_STAGE_PLAYOFFS','AGO–SEP 2026',2,8,'PUBLIC','TournamentX','CHALLENGER','En línea'),
  ('tour-open','Open Internacional','Circuito abierto de esports.','Counter-Strike 2','FPS','$5,000 USD',5000,'IN_PROGRESS','SINGLE_ELIMINATION','AGO 2026',2,16,'PUBLIC','TournamentX','PRO CIRCUIT','Europa Oeste'),
  ('tour-sports','Copa Deportiva TournamentX','Calendario multideportivo regional.','Fútbol','SPORTS','$3,000 USD',3000,'IN_PROGRESS','GROUP_STAGE_PLAYOFFS','AGO 2026',4,8,'PUBLIC','TournamentX','REGIONAL','Sonora')
on conflict (id) do update set status = excluded.status, registered_teams = excluded.registered_teams, venue = excluded.venue;

insert into public.matches
  (id, schedule_id, tournament_id, round_id, team1_id, team2_id, scheduled_at, venue, mode, status, score_team1, score_team2, stream_url)
values
  ('match-101','schedule-valorant','tour-community','Cuartos de final','team-lnx','team-phoenix','2026-08-02T19:00:00Z','Arena TournamentX CDMX','best_of_3','completed',2,1,null),
  ('match-102','schedule-valorant','tour-community','Semifinal','team-ttn','team-lnx','2026-08-09T20:00:00Z','Servidor LATAM Norte','best_of_3','completed',0,2,'https://www.youtube.com/watch?v=6VOfpE_HGpw'),
  ('match-103','schedule-lol','tour-groups','Jornada 1','team-andes','team-nova','2026-08-10T18:30:00Z','Servidor LATAM Sur','best_of_3','completed',2,1,null),
  ('match-104','schedule-cs','tour-open','Ronda 1','team-raven','team-nova','2026-08-11T17:00:00Z','Servidor Europa Oeste','best_of_3','completed',2,0,null),
  ('match-105','schedule-football','tour-sports','Jornada 1','team-sonora-fc','team-baja-fc','2026-08-12T02:00:00Z','Estadio Regional Sonora','best_of_1','completed',3,1,null),
  ('match-106','schedule-basket','tour-sports','Jornada 1','team-desert-hoops','team-pacific-hoops','2026-08-13T03:30:00Z','Gimnasio TournamentX','best_of_1','completed',88,82,null),
  ('match-202','schedule-football','tour-sports','Jornada 2','team-baja-fc','team-sonora-fc','2026-08-22T01:00:00Z','Unidad Deportiva Baja','best_of_1','scheduled',0,0,null),
  ('match-203','schedule-basket','tour-sports','Jornada 2','team-pacific-hoops','team-desert-hoops','2026-08-23T02:30:00Z','Pacific Sports Center','best_of_1','scheduled',0,0,null)
on conflict (id) do update set
  scheduled_at = excluded.scheduled_at, venue = excluded.venue, status = excluded.status,
  score_team1 = excluded.score_team1, score_team2 = excluded.score_team2, stream_url = excluded.stream_url;

update public.media_lobbies set match_id = 'match-final-latam' where id = 'lobby-final-latam';
