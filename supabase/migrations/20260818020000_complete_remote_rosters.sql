-- Completa las plantillas operativas sin inventar métricas individuales.
alter table public.team_roster alter column kda set default 'Sin registro oficial';

insert into public.players
  (id, name, lastname, nickname, username, email, role, avatar_url, team_id, team_name, status, last_activity, rating_ovr, position_name, nationality)
values
  ('player-5','Mateo','Vega','Blaze','@blaze_ttn','blaze.ttn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80','team-ttn','Titans','ACTIVE','Registro de plantilla',91,'Duelista','MX'),
  ('player-6','Valentina','Cruz','Echo','@echo_ttn','echo.ttn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80','team-ttn','Titans','ACTIVE','Registro de plantilla',89,'Iniciadora','CO'),
  ('player-7','Diego','Santos','Kronos','@kronos_ttn','kronos.ttn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80','team-ttn','Titans','ACTIVE','Registro de plantilla',88,'Controlador','BR'),
  ('player-8','Emiliano','Ruiz','Solar','@solar_phx','solar.phx@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80','team-phoenix','Phoenix Rising','ACTIVE','Registro de plantilla',92,'Capitán / IGL','MX'),
  ('player-9','Camila','Ortega','Nyx','@nyx_phx','nyx.phx@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80','team-phoenix','Phoenix Rising','ACTIVE','Registro de plantilla',87,'Centinela','AR'),
  ('player-10','Thiago','Mora','Pulse','@pulse_phx','pulse.phx@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80','team-phoenix','Phoenix Rising','ACTIVE','Registro de plantilla',86,'Flex','CL'),
  ('player-11','Sofía','Paredes','Aurora','@aurora_and','aurora.and@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80','team-andes','Andes Guardians','ACTIVE','Registro de plantilla',93,'Mid','PE'),
  ('player-12','Bruno','Lagos','Aegis','@aegis_and','aegis.and@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80','team-andes','Andes Guardians','ACTIVE','Registro de plantilla',90,'Jungla','CL'),
  ('player-13','Rafael','Costa','Titan','@titan_and','titan.and@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=150&auto=format&fit=crop&q=80','team-andes','Andes Guardians','ACTIVE','Registro de plantilla',88,'Top','BR'),
  ('player-14','Noah','Brooks','Jetstream','@jetstream_nva','jetstream.nva@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&auto=format&fit=crop&q=80','team-nova','Nova Velocity','ACTIVE','Registro de plantilla',94,'Striker','US'),
  ('player-15','Ethan','Miller','Orbit','@orbit_nva','orbit.nva@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80','team-nova','Nova Velocity','ACTIVE','Registro de plantilla',91,'Tercer hombre','CA'),
  ('player-16','Léa','Martin','Comet','@comet_nva','comet.nva@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80','team-nova','Nova Velocity','ACTIVE','Registro de plantilla',92,'Flex','FR'),
  ('player-17','Marek','Nowak','Cipher','@cipher_rvn','cipher.rvn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80','team-raven','Raven Protocol','ACTIVE','Registro de plantilla',95,'IGL','PL'),
  ('player-18','Erik','Lind','Frost','@frost_rvn','frost.rvn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&auto=format&fit=crop&q=80','team-raven','Raven Protocol','ACTIVE','Registro de plantilla',94,'AWPer','SE'),
  ('player-19','Ana','Kovač','Valkyrie','@valkyrie_rvn','valkyrie.rvn@players.tournamentx.invalid','Jugador','https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80','team-raven','Raven Protocol','ACTIVE','Registro de plantilla',92,'Rifler','HR')
on conflict (id) do update set
  name = excluded.name, lastname = excluded.lastname, nickname = excluded.nickname,
  username = excluded.username, email = excluded.email, avatar_url = excluded.avatar_url,
  team_id = excluded.team_id, team_name = excluded.team_name, status = excluded.status,
  last_activity = excluded.last_activity, rating_ovr = excluded.rating_ovr,
  position_name = excluded.position_name, nationality = excluded.nationality;

insert into public.team_roster (id, team_id, player_id, role_name, ovr, kda, status)
values
  ('membership-5','team-ttn','player-5','Duelista',91,'Sin registro oficial','active'),
  ('membership-6','team-ttn','player-6','Iniciadora',89,'Sin registro oficial','active'),
  ('membership-7','team-ttn','player-7','Controlador',88,'Sin registro oficial','active'),
  ('membership-8','team-phoenix','player-8','Capitán / IGL',92,'Sin registro oficial','active'),
  ('membership-9','team-phoenix','player-9','Centinela',87,'Sin registro oficial','active'),
  ('membership-10','team-phoenix','player-10','Flex',86,'Sin registro oficial','active'),
  ('membership-11','team-andes','player-11','Mid',93,'Sin registro oficial','active'),
  ('membership-12','team-andes','player-12','Jungla',90,'Sin registro oficial','active'),
  ('membership-13','team-andes','player-13','Top',88,'Sin registro oficial','active'),
  ('membership-14','team-nova','player-14','Striker',94,'Sin registro oficial','active'),
  ('membership-15','team-nova','player-15','Tercer hombre',91,'Sin registro oficial','active'),
  ('membership-16','team-nova','player-16','Flex',92,'Sin registro oficial','active'),
  ('membership-17','team-raven','player-17','IGL',95,'Sin registro oficial','active'),
  ('membership-18','team-raven','player-18','AWPer',94,'Sin registro oficial','active'),
  ('membership-19','team-raven','player-19','Rifler',92,'Sin registro oficial','active')
on conflict (id) do update set
  team_id = excluded.team_id, player_id = excluded.player_id, role_name = excluded.role_name,
  ovr = excluded.ovr, kda = excluded.kda, status = excluded.status;

update public.team_roster
set kda = 'Sin registro oficial'
where id in ('membership-20','membership-21','membership-22','membership-23','membership-24','membership-25','membership-26','membership-27');

update public.players
set email = split_part(email, '@', 1) || '@players.tournamentx.invalid'
where id in ('player-20','player-21','player-22','player-23','player-24','player-25','player-26','player-27')
  and email like '%@tournamentx.gg';
