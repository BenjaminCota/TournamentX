/*
===============================================================================
 TOURNAMENTX - BASE DE DATOS COMPLETA PARA POSTGRESQL 15+
===============================================================================
 Este archivo contiene las tablas, funciones, procedimientos almacenados,
 triggers, políticas de seguridad, índices y datos iniciales del sistema.

 Ejecución recomendada:
 psql -v ON_ERROR_STOP=1 -f tournamentx_database.sql
===============================================================================
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS tournamentx;
SET search_path TO tournamentx, public;
CREATE TYPE user_status AS ENUM ('pending','active','blocked','deleted');
CREATE TYPE tournament_status AS ENUM ('draft','registration','active','finished','cancelled');
CREATE TYPE match_status AS ENUM ('scheduled','live','completed','postponed','cancelled');
CREATE TYPE payment_status AS ENUM ('created','pending','paid','failed','refunded');
CREATE TYPE payout_status AS ENUM ('pending','processing','paid','failed','reversed');


/* ============================================================================
   SECCIÓN 1. TABLAS Y RELACIONES
   ============================================================================ */


-- TABLA: roles
-- Descripción: Catálogo de roles globales disponibles en la plataforma.
CREATE TABLE roles (
 role_id smallserial PRIMARY KEY, code varchar(30) NOT NULL UNIQUE,
 name varchar(80) NOT NULL, description varchar(255)
);


-- TABLA: users
-- Descripción: Credenciales, identidad básica y estado de las cuentas.
CREATE TABLE users (
 user_id bigserial PRIMARY KEY, email varchar(254) NOT NULL,
 password_hash varchar(255) NOT NULL, display_name varchar(120) NOT NULL,
 phone varchar(30), status user_status NOT NULL DEFAULT 'pending',
 email_verified_at timestamptz, last_login_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uq_users_email_lower UNIQUE (email),
 CONSTRAINT ck_users_email_lower CHECK (email=lower(email)),
 CONSTRAINT ck_users_password_hash CHECK (length(password_hash)>=40)
);


-- TABLA: user_roles
-- Descripción: Relación de muchos a muchos entre usuarios y roles globales.
CREATE TABLE user_roles (
 user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE,
 role_id smallint NOT NULL REFERENCES roles ON DELETE RESTRICT,
 assigned_by bigint REFERENCES users ON DELETE SET NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,role_id)
);


-- TABLA: disciplines
-- Descripción: Catálogo de deportes tradicionales y videojuegos competitivos.
CREATE TABLE disciplines (
 discipline_id bigserial PRIMARY KEY, name varchar(100) NOT NULL UNIQUE,
 category varchar(20) NOT NULL CHECK(category IN ('traditional','esport')),
 team_based boolean NOT NULL, config jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true
);


-- TABLA: seasons
-- Descripción: Periodos utilizados para agrupar torneos y estadísticas.
CREATE TABLE seasons (
 season_id bigserial PRIMARY KEY, name varchar(100) NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL, status varchar(20) NOT NULL,
 CHECK(ends_on>=starts_on), CHECK(status IN ('planned','active','closed'))
);


-- TABLA: tournaments
-- Descripción: Configuración principal y ciclo de vida de cada torneo.
CREATE TABLE tournaments (
 tournament_id bigserial PRIMARY KEY, owner_user_id bigint NOT NULL REFERENCES users,
 discipline_id bigint NOT NULL REFERENCES disciplines, season_id bigint REFERENCES seasons,
 name varchar(160) NOT NULL, slug varchar(180) NOT NULL UNIQUE,
 format varchar(30) NOT NULL CHECK(format IN ('groups','knockout','league','hybrid')),
 mode varchar(20) NOT NULL CHECK(mode IN ('presential','online','hybrid')),
 status tournament_status NOT NULL DEFAULT 'draft', rules text, settings jsonb NOT NULL DEFAULT '{}',
 registration_opens_at timestamptz, registration_closes_at timestamptz,
 starts_at timestamptz NOT NULL, ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at IS NULL OR ends_at>=starts_at),
 CHECK(registration_closes_at IS NULL OR registration_opens_at IS NULL OR registration_closes_at>=registration_opens_at)
);


-- TABLA: tournament_admins
-- Descripción: Administradores autorizados y nivel de permiso por torneo.
CREATE TABLE tournament_admins (
 tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE,
 permission_level varchar(20) NOT NULL CHECK(permission_level IN ('owner','editor','scorer')),
 assigned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tournament_id,user_id)
);


-- TABLA: tournament_phases
-- Descripción: Fases competitivas ordenadas de cada torneo.
CREATE TABLE tournament_phases (
 phase_id bigserial PRIMARY KEY, tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 name varchar(100) NOT NULL, phase_type varchar(30) NOT NULL CHECK(phase_type IN ('group','knockout','league')),
 sequence_no smallint NOT NULL CHECK(sequence_no>0), config jsonb NOT NULL DEFAULT '{}',
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','completed')),
 UNIQUE(tournament_id,sequence_no)
);


-- TABLA: tournament_groups
-- Descripción: Grupos pertenecientes a una fase competitiva.
CREATE TABLE tournament_groups (
 group_id bigserial PRIMARY KEY, phase_id bigint NOT NULL REFERENCES tournament_phases ON DELETE CASCADE,
 name varchar(50) NOT NULL, sequence_no smallint NOT NULL CHECK(sequence_no>0), UNIQUE(phase_id,sequence_no), UNIQUE(phase_id,name)
);


-- TABLA: venues
-- Descripción: Sedes físicas o salas virtuales disponibles.
CREATE TABLE venues (
 venue_id bigserial PRIMARY KEY, name varchar(140) NOT NULL,
 venue_type varchar(20) NOT NULL CHECK(venue_type IN ('physical','virtual')),
 address varchar(255), latitude numeric(9,6), longitude numeric(9,6), timezone varchar(50) NOT NULL,
 capacity integer CHECK(capacity IS NULL OR capacity>=0), metadata jsonb NOT NULL DEFAULT '{}',
 CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90), CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180)
);


-- TABLA: venue_availability
-- Descripción: Bloques de disponibilidad, reserva o bloqueo de una sede.
CREATE TABLE venue_availability (
 availability_id bigserial PRIMARY KEY, venue_id bigint NOT NULL REFERENCES venues ON DELETE CASCADE,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status varchar(20) NOT NULL CHECK(status IN ('available','reserved','blocked')), CHECK(ends_at>starts_at)
);


-- TABLA: teams
-- Descripción: Identidad, procedencia y estado de los equipos.
CREATE TABLE teams (
 team_id bigserial PRIMARY KEY, name varchar(120) NOT NULL, tag varchar(12), country_code char(2), logo_url text,
 created_by bigint NOT NULL REFERENCES users, status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','banned')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(name,country_code)
);


-- TABLA: players
-- Descripción: Perfil competitivo individual de cada jugador.
CREATE TABLE players (
 player_id bigserial PRIMARY KEY, user_id bigint UNIQUE REFERENCES users ON DELETE SET NULL,
 nickname varchar(80) NOT NULL, first_name varchar(80), last_name varchar(80), birth_date date,
 country_code char(2), profile jsonb NOT NULL DEFAULT '{}',
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended'))
);


-- TABLA: team_members
-- Descripción: Plantillas de equipos e historial de pertenencia.
CREATE TABLE team_members (
 team_member_id bigserial PRIMARY KEY, team_id bigint NOT NULL REFERENCES teams ON DELETE CASCADE,
 player_id bigint NOT NULL REFERENCES players ON DELETE CASCADE,
 member_role varchar(30) NOT NULL CHECK(member_role IN ('player','captain','coach','substitute')),
 joined_at date NOT NULL, left_at date, jersey_number smallint,
 CHECK(left_at IS NULL OR left_at>=joined_at), CHECK(jersey_number IS NULL OR jersey_number BETWEEN 0 AND 999)
);


-- TABLA: registrations
-- Descripción: Inscripciones de equipos o jugadores en los torneos.
CREATE TABLE registrations (
 registration_id bigserial PRIMARY KEY, tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 team_id bigint REFERENCES teams, player_id bigint REFERENCES players, group_id bigint REFERENCES tournament_groups,
 seed_no integer CHECK(seed_no IS NULL OR seed_no>0),
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
 approved_by bigint REFERENCES users, registered_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(team_id,player_id)=1)
);


-- TABLA: matches
-- Descripción: Programación, ubicación, llave y estado de los encuentros.
CREATE TABLE matches (
 match_id bigserial PRIMARY KEY, tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 phase_id bigint NOT NULL REFERENCES tournament_phases ON DELETE CASCADE, group_id bigint REFERENCES tournament_groups,
 venue_id bigint REFERENCES venues, round_no smallint, bracket_position varchar(40), scheduled_at timestamptz NOT NULL,
 started_at timestamptz, ended_at timestamptz, best_of smallint NOT NULL DEFAULT 1 CHECK(best_of>0 AND best_of%2=1),
 status match_status NOT NULL DEFAULT 'scheduled', next_match_id bigint REFERENCES matches ON DELETE SET NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ended_at IS NULL OR started_at IS NULL OR ended_at>=started_at)
);


-- TABLA: match_participants
-- Descripción: Competidores, posiciones y marcadores de cada encuentro.
CREATE TABLE match_participants (
 match_participant_id bigserial PRIMARY KEY, match_id bigint NOT NULL REFERENCES matches ON DELETE CASCADE,
 slot_no smallint NOT NULL CHECK(slot_no>0), team_id bigint REFERENCES teams, player_id bigint REFERENCES players,
 score numeric(10,2) NOT NULL DEFAULT 0, is_winner boolean,
 result_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(result_status IN ('pending','winner','loser','draw','disqualified')),
 CHECK(num_nonnulls(team_id,player_id)=1), UNIQUE(match_id,slot_no)
);


-- TABLA: match_events
-- Descripción: Eventos capturados en tiempo real durante los partidos.
CREATE TABLE match_events (
 event_id bigserial PRIMARY KEY, match_id bigint NOT NULL REFERENCES matches ON DELETE CASCADE,
 participant_id bigint REFERENCES match_participants ON DELETE SET NULL, player_id bigint REFERENCES players,
 event_type varchar(50) NOT NULL, event_time_seconds integer CHECK(event_time_seconds IS NULL OR event_time_seconds>=0),
 value numeric(12,4), payload jsonb NOT NULL DEFAULT '{}', recorded_by bigint NOT NULL REFERENCES users,
 created_at timestamptz NOT NULL DEFAULT now()
);


-- TABLA: match_results
-- Descripción: Resultado oficial, ganador y validación del encuentro.
CREATE TABLE match_results (
 result_id bigserial PRIMARY KEY, match_id bigint NOT NULL UNIQUE REFERENCES matches ON DELETE CASCADE,
 winner_participant_id bigint REFERENCES match_participants, summary jsonb NOT NULL DEFAULT '{}',
 status varchar(20) NOT NULL DEFAULT 'provisional' CHECK(status IN ('provisional','official','disputed')),
 validated_by bigint REFERENCES users, validated_at timestamptz,
 CHECK(status<>'official' OR (validated_by IS NOT NULL AND validated_at IS NOT NULL))
);


-- TABLA: standings
-- Descripción: Tabla calculada de posiciones por fase o grupo.
CREATE TABLE standings (
 standing_id bigserial PRIMARY KEY, phase_id bigint NOT NULL REFERENCES tournament_phases ON DELETE CASCADE,
 group_id bigint REFERENCES tournament_groups, team_id bigint REFERENCES teams, player_id bigint REFERENCES players,
 played integer NOT NULL DEFAULT 0, won integer NOT NULL DEFAULT 0, drawn integer NOT NULL DEFAULT 0, lost integer NOT NULL DEFAULT 0,
 points numeric(10,2) NOT NULL DEFAULT 0, score_for numeric(12,2) NOT NULL DEFAULT 0,
 score_against numeric(12,2) NOT NULL DEFAULT 0, rank_no integer, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(team_id,player_id)=1), CHECK(played>=0 AND won>=0 AND drawn>=0 AND lost>=0),
 CHECK(played=won+drawn+lost)
);


-- TABLA: lobbies
-- Descripción: Credenciales protegidas y estado de las salas de esports.
CREATE TABLE lobbies (
 lobby_id bigserial PRIMARY KEY, match_id bigint NOT NULL UNIQUE REFERENCES matches ON DELETE CASCADE,
 platform varchar(50) NOT NULL, external_match_id varchar(120), room_code varchar(120), password_ciphertext text,
 region varchar(50), status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','active','closed'))
);


-- TABLA: streams
-- Descripción: Transmisiones de Twitch o YouTube asociadas al torneo.
CREATE TABLE streams (
 stream_id bigserial PRIMARY KEY, tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 match_id bigint REFERENCES matches ON DELETE CASCADE, provider varchar(20) NOT NULL CHECK(provider IN ('twitch','youtube')),
 channel_or_video_id varchar(150) NOT NULL, url text NOT NULL, starts_at timestamptz,
 status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','ended'))
);


-- TABLA: player_statistics
-- Descripción: Métricas individuales por disciplina, temporada o partido.
CREATE TABLE player_statistics (
 player_stat_id bigserial PRIMARY KEY, player_id bigint NOT NULL REFERENCES players ON DELETE CASCADE,
 discipline_id bigint NOT NULL REFERENCES disciplines, season_id bigint REFERENCES seasons,
 tournament_id bigint REFERENCES tournaments ON DELETE CASCADE, match_id bigint REFERENCES matches ON DELETE CASCADE,
 metric_code varchar(50) NOT NULL, metric_value numeric(18,6) NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);


-- TABLA: team_statistics
-- Descripción: Métricas agregadas de rendimiento de los equipos.
CREATE TABLE team_statistics (
 team_stat_id bigserial PRIMARY KEY, team_id bigint NOT NULL REFERENCES teams ON DELETE CASCADE,
 discipline_id bigint NOT NULL REFERENCES disciplines, season_id bigint REFERENCES seasons,
 tournament_id bigint REFERENCES tournaments ON DELETE CASCADE, metric_code varchar(50) NOT NULL,
 metric_value numeric(18,6) NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);


-- TABLA: rankings
-- Descripción: Clasificación global, regional o nacional de competidores.
CREATE TABLE rankings (
 ranking_id bigserial PRIMARY KEY, discipline_id bigint NOT NULL REFERENCES disciplines, season_id bigint REFERENCES seasons,
 scope varchar(20) NOT NULL CHECK(scope IN ('global','regional','national')), region_code varchar(20),
 team_id bigint REFERENCES teams, player_id bigint REFERENCES players, rating numeric(12,4) NOT NULL,
 rank_no integer NOT NULL CHECK(rank_no>0), calculated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(team_id,player_id)=1)
);


-- TABLA: notifications
-- Descripción: Cola omnicanal de avisos y recordatorios para usuarios.
CREATE TABLE notifications (
 notification_id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE,
 tournament_id bigint REFERENCES tournaments ON DELETE CASCADE,
 channel varchar(20) NOT NULL CHECK(channel IN ('in_app','push','email','sms')), type varchar(50) NOT NULL,
 subject varchar(160), body text NOT NULL, payload jsonb NOT NULL DEFAULT '{}',
 status varchar(20) NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','read')),
 scheduled_at timestamptz, sent_at timestamptz, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);


-- TABLA: sponsors
-- Descripción: Información comercial de las organizaciones patrocinadoras.
CREATE TABLE sponsors (
 sponsor_id bigserial PRIMARY KEY, legal_name varchar(180) NOT NULL, display_name varchar(120) NOT NULL,
 tax_id varchar(60), contact_email varchar(254) NOT NULL, logo_url text,
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked'))
);


-- TABLA: sponsorships
-- Descripción: Relación contractual entre patrocinadores y torneos.
CREATE TABLE sponsorships (
 sponsorship_id bigserial PRIMARY KEY, sponsor_id bigint NOT NULL REFERENCES sponsors,
 tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE, tier varchar(30),
 amount_committed numeric(18,2) NOT NULL DEFAULT 0 CHECK(amount_committed>=0), currency varchar(10) NOT NULL,
 contract_ref varchar(120), status varchar(20) NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','active','completed','cancelled')),
 UNIQUE(sponsor_id,tournament_id)
);


-- TABLA: prize_pools
-- Descripción: Bolsas de premios y estado de custodia de los fondos.
CREATE TABLE prize_pools (
 prize_pool_id bigserial PRIMARY KEY, tournament_id bigint NOT NULL REFERENCES tournaments ON DELETE CASCADE,
 match_id bigint REFERENCES matches ON DELETE CASCADE, sponsorship_id bigint REFERENCES sponsorships,
 name varchar(120) NOT NULL, amount numeric(18,8) NOT NULL CHECK(amount>=0), currency varchar(10) NOT NULL,
 funding_type varchar(20) NOT NULL CHECK(funding_type IN ('fiat','crypto','in_kind')),
 escrow_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(escrow_status IN ('pending','funded','held','released','refunded')),
 funded_at timestamptz
);


-- TABLA: prize_distribution_rules
-- Descripción: Reglas porcentuales o fijas para distribuir premios.
CREATE TABLE prize_distribution_rules (
 rule_id bigserial PRIMARY KEY, prize_pool_id bigint NOT NULL REFERENCES prize_pools ON DELETE CASCADE,
 position_no integer, achievement_code varchar(50), percentage numeric(7,4), fixed_amount numeric(18,8),
 beneficiary_type varchar(20) NOT NULL CHECK(beneficiary_type IN ('team','player')),
 CHECK(num_nonnulls(position_no,achievement_code)=1), CHECK(num_nonnulls(percentage,fixed_amount)=1),
 CHECK(percentage IS NULL OR percentage>0 AND percentage<=100), CHECK(fixed_amount IS NULL OR fixed_amount>0)
);


-- TABLA: payments
-- Descripción: Pagos de entrada recibidos mediante proveedores externos.
CREATE TABLE payments (
 payment_id bigserial PRIMARY KEY, prize_pool_id bigint NOT NULL REFERENCES prize_pools,
 provider varchar(30) NOT NULL CHECK(provider IN ('stripe')), external_payment_id varchar(150) NOT NULL UNIQUE,
 amount numeric(18,8) NOT NULL CHECK(amount>0), currency varchar(10) NOT NULL, status payment_status NOT NULL DEFAULT 'created',
 idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, provider_payload jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);


-- TABLA: payouts
-- Descripción: Dispersiones de premios destinadas a equipos o jugadores.
CREATE TABLE payouts (
 payout_id bigserial PRIMARY KEY, rule_id bigint NOT NULL REFERENCES prize_distribution_rules,
 team_id bigint REFERENCES teams, player_id bigint REFERENCES players, provider varchar(30) NOT NULL,
 external_payout_id varchar(150) UNIQUE, amount numeric(18,8) NOT NULL CHECK(amount>0), currency varchar(10) NOT NULL,
 status payout_status NOT NULL DEFAULT 'pending', approved_by bigint REFERENCES users, paid_at timestamptz,
 idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(team_id,player_id)=1)
);


-- TABLA: in_kind_rewards
-- Descripción: Productos, códigos y tarjetas entregados como premios.
CREATE TABLE in_kind_rewards (
 reward_id bigserial PRIMARY KEY, prize_pool_id bigint NOT NULL REFERENCES prize_pools ON DELETE CASCADE,
 name varchar(140) NOT NULL, reward_type varchar(30) NOT NULL CHECK(reward_type IN ('product','game_code','gift_card')),
 quantity integer NOT NULL CHECK(quantity>0), unit_value numeric(18,2), claim_code_ciphertext text,
 status varchar(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available','assigned','delivered'))
);


-- TABLA: branding_assets
-- Descripción: Recursos publicitarios visibles en brackets y transmisiones.
CREATE TABLE branding_assets (
 asset_id bigserial PRIMARY KEY, sponsorship_id bigint NOT NULL REFERENCES sponsorships ON DELETE CASCADE,
 asset_type varchar(30) NOT NULL CHECK(asset_type IN ('logo','banner','bracket_overlay')),
 file_url text NOT NULL, placement varchar(50) NOT NULL, starts_at timestamptz, ends_at timestamptz,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','active','expired')),
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>=starts_at)
);


-- TABLA: audit_log
-- Descripción: Registro inmutable de las operaciones críticas del sistema.
CREATE TABLE audit_log (
 audit_id bigserial PRIMARY KEY, actor_user_id bigint REFERENCES users ON DELETE SET NULL,
 tournament_id bigint REFERENCES tournaments ON DELETE SET NULL, action varchar(80) NOT NULL,
 entity_name varchar(80) NOT NULL, entity_id varchar(80) NOT NULL, old_values jsonb, new_values jsonb,
 ip_address inet, created_at timestamptz NOT NULL DEFAULT now()
);


/* ============================================================================
   SECCIÓN 2. DATOS INICIALES E ÍNDICES
   ============================================================================ */

INSERT INTO roles(code,name,description) VALUES
 ('SUPER_ADMIN','Administrador jefe','Control global de la plataforma.'),
 ('TOURNAMENT_ADMIN','Administrador de torneos','Gestiona únicamente torneos asignados.'),
 ('VISITOR','Visitante','Consulta información pública.')
ON CONFLICT(code) DO UPDATE SET name=excluded.name,description=excluded.description;

CREATE UNIQUE INDEX uq_active_team_member ON team_members(team_id,player_id) WHERE left_at IS NULL;

CREATE UNIQUE INDEX uq_registration_team ON registrations(tournament_id,team_id) WHERE team_id IS NOT NULL AND status<>'withdrawn';

CREATE UNIQUE INDEX uq_registration_player ON registrations(tournament_id,player_id) WHERE player_id IS NOT NULL AND status<>'withdrawn';

CREATE UNIQUE INDEX uq_standing_team ON standings(phase_id,coalesce(group_id,0),team_id) WHERE team_id IS NOT NULL;

CREATE UNIQUE INDEX uq_standing_player ON standings(phase_id,coalesce(group_id,0),player_id) WHERE player_id IS NOT NULL;

CREATE INDEX ix_tournaments_owner_status ON tournaments(owner_user_id,status);

CREATE INDEX ix_tournaments_discipline_dates ON tournaments(discipline_id,starts_at,ends_at);

CREATE INDEX ix_matches_tournament_status_time ON matches(tournament_id,status,scheduled_at);

CREATE INDEX ix_match_events_match_time ON match_events(match_id,created_at);

CREATE INDEX ix_notifications_queue ON notifications(status,scheduled_at) WHERE status='queued';

CREATE INDEX ix_payments_pool_status ON payments(prize_pool_id,status);

CREATE INDEX ix_payouts_status ON payouts(status) WHERE status IN ('pending','processing');

CREATE INDEX ix_audit_entity ON audit_log(entity_name,entity_id,created_at DESC);

CREATE INDEX ix_venues_coordinates ON venues(latitude,longitude) WHERE latitude IS NOT NULL;


/* ============================================================================
   SECCIÓN 3. FUNCIONES AUXILIARES
   Estas funciones apoyan la seguridad, auditoría y automatización.
   ============================================================================ */

-- FUNCIÓN AUXILIAR: current_app_user_id
-- Descripción: Obtiene el identificador del usuario autenticado desde el contexto seguro de la conexión.
CREATE FUNCTION current_app_user_id() RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('app.user_id',true),'')::bigint
$$;


-- FUNCIÓN AUXILIAR: is_super_admin
CREATE FUNCTION is_super_admin(p_user_id bigint DEFAULT current_app_user_id()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=tournamentx,public AS $$
 SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r USING(role_id)
               WHERE ur.user_id=p_user_id AND r.code='SUPER_ADMIN')
$$;


-- FUNCIÓN AUXILIAR: can_manage_tournament
CREATE FUNCTION can_manage_tournament(p_tournament_id bigint,p_min_level varchar DEFAULT 'scorer',p_user_id bigint DEFAULT current_app_user_id())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=tournamentx,public AS $$
 SELECT is_super_admin(p_user_id) OR EXISTS(
   SELECT 1 FROM tournaments t LEFT JOIN tournament_admins ta
     ON ta.tournament_id=t.tournament_id AND ta.user_id=p_user_id
   WHERE t.tournament_id=p_tournament_id AND
   (t.owner_user_id=p_user_id OR CASE p_min_level
      WHEN 'owner' THEN ta.permission_level='owner'
      WHEN 'editor' THEN ta.permission_level IN ('owner','editor')
      ELSE ta.permission_level IN ('owner','editor','scorer') END))
$$;


-- FUNCIÓN AUXILIAR: trg_set_updated_at
CREATE FUNCTION trg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;


-- FUNCIÓN AUXILIAR: trg_audit
CREATE FUNCTION trg_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
DECLARE v_old jsonb; v_new jsonb; v_id text; v_tid bigint;
BEGIN
 v_old=CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END;
 v_new=CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END;
 v_id=coalesce(v_new,v_old)->>TG_ARGV[0];
 IF TG_ARGV[1]<>'' THEN v_tid=(coalesce(v_new,v_old)->>TG_ARGV[1])::bigint; END IF;
 INSERT INTO audit_log(actor_user_id,tournament_id,action,entity_name,entity_id,old_values,new_values,ip_address)
 VALUES(current_app_user_id(),v_tid,TG_OP,TG_TABLE_NAME,coalesce(v_id,'?'),v_old,v_new,
        nullif(current_setting('app.ip_address',true),'')::inet);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;


-- FUNCIÓN AUXILIAR: trg_audit_immutable
CREATE FUNCTION trg_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_log es inmutable'; END $$;


-- FUNCIÓN AUXILIAR: trg_validate_related_tournament
CREATE FUNCTION trg_validate_related_tournament() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_tid bigint;
BEGIN
 IF TG_TABLE_NAME='matches' THEN
   SELECT tournament_id INTO v_tid FROM tournament_phases WHERE phase_id=NEW.phase_id;
   IF v_tid<>NEW.tournament_id THEN RAISE EXCEPTION 'La fase no pertenece al torneo'; END IF;
   IF NEW.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tournament_groups g WHERE g.group_id=NEW.group_id AND g.phase_id=NEW.phase_id) THEN
     RAISE EXCEPTION 'El grupo no pertenece a la fase'; END IF;
 ELSIF TG_TABLE_NAME='registrations' AND NEW.group_id IS NOT NULL THEN
   SELECT p.tournament_id INTO v_tid FROM tournament_groups g JOIN tournament_phases p USING(phase_id) WHERE g.group_id=NEW.group_id;
   IF v_tid<>NEW.tournament_id THEN RAISE EXCEPTION 'El grupo no pertenece al torneo'; END IF;
 END IF; RETURN NEW;
END $$;


-- FUNCIÓN AUXILIAR: trg_validate_result
CREATE FUNCTION trg_validate_result() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_match bigint;
BEGIN
 IF NEW.winner_participant_id IS NOT NULL THEN
  SELECT match_id INTO v_match FROM match_participants WHERE match_participant_id=NEW.winner_participant_id;
  IF v_match IS DISTINCT FROM NEW.match_id THEN RAISE EXCEPTION 'El ganador no participa en el partido'; END IF;
 END IF;
 IF NEW.status='official' AND NEW.winner_participant_id IS NULL AND
    NOT EXISTS(SELECT 1 FROM match_participants WHERE match_id=NEW.match_id AND result_status='draw') THEN
  RAISE EXCEPTION 'Resultado oficial sin ganador ni empate';
 END IF; RETURN NEW;
END $$;


-- FUNCIÓN AUXILIAR: trg_validate_prize_distribution
CREATE FUNCTION trg_validate_prize_distribution() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_pool bigint; v_pct numeric; v_fixed numeric; v_amount numeric;
BEGIN
 v_pool=CASE WHEN TG_OP='DELETE' THEN OLD.prize_pool_id ELSE NEW.prize_pool_id END;
 SELECT coalesce(sum(percentage),0),coalesce(sum(fixed_amount),0) INTO v_pct,v_fixed FROM prize_distribution_rules WHERE prize_pool_id=v_pool;
 SELECT amount INTO v_amount FROM prize_pools WHERE prize_pool_id=v_pool;
 IF v_pct>100 THEN RAISE EXCEPTION 'Porcentajes de premio exceden 100%%'; END IF;
 IF v_fixed>v_amount THEN RAISE EXCEPTION 'Montos fijos exceden la bolsa'; END IF;
 RETURN NULL;
END $$;


-- FUNCIÓN AUXILIAR: trg_sync_prize_pool_funding
CREATE FUNCTION trg_sync_prize_pool_funding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_paid numeric; v_required numeric;
BEGIN
 SELECT coalesce(sum(amount),0) INTO v_paid FROM payments WHERE prize_pool_id=NEW.prize_pool_id AND status='paid';
 SELECT amount INTO v_required FROM prize_pools WHERE prize_pool_id=NEW.prize_pool_id;
 IF v_paid>=v_required THEN UPDATE prize_pools SET escrow_status='funded',funded_at=coalesce(funded_at,now()) WHERE prize_pool_id=NEW.prize_pool_id; END IF;
 RETURN NEW;
END $$;


/* ============================================================================
   SECCIÓN 4. PROCEDIMIENTOS ALMACENADOS
   Se ejecutan mediante CALL tournamentx.nombre_procedimiento(...).
   ============================================================================ */


-- PROCEDIMIENTO ALMACENADO: recompute_standings
-- Descripción: Recalcula desde cero la tabla de posiciones de una fase o grupo usando únicamente resultados oficiales.
CREATE PROCEDURE recompute_standings(p_phase_id bigint,p_group_id bigint DEFAULT NULL)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM tournament_phases p WHERE p.phase_id=p_phase_id AND can_manage_tournament(p.tournament_id,'scorer')) THEN
  RAISE EXCEPTION 'No autorizado'; END IF;
 DELETE FROM standings WHERE phase_id=p_phase_id AND group_id IS NOT DISTINCT FROM p_group_id;
 INSERT INTO standings(phase_id,group_id,team_id,player_id,played,won,drawn,lost,points,score_for,score_against,updated_at)
 SELECT p_phase_id,p_group_id,mp.team_id,mp.player_id,count(*)::int,
   count(*) FILTER(WHERE mp.result_status='winner')::int,
   count(*) FILTER(WHERE mp.result_status='draw')::int,
   count(*) FILTER(WHERE mp.result_status IN ('loser','disqualified'))::int,
   (count(*) FILTER(WHERE mp.result_status='winner')*3+count(*) FILTER(WHERE mp.result_status='draw'))::numeric,
   sum(mp.score),sum((SELECT coalesce(sum(o.score),0) FROM match_participants o WHERE o.match_id=mp.match_id AND o.match_participant_id<>mp.match_participant_id)),now()
 FROM match_participants mp JOIN matches m USING(match_id) JOIN match_results mr USING(match_id)
 WHERE m.phase_id=p_phase_id AND m.group_id IS NOT DISTINCT FROM p_group_id AND mr.status='official'
 GROUP BY mp.team_id,mp.player_id;
 WITH ranked AS (
  SELECT standing_id,row_number() OVER(ORDER BY points DESC,(score_for-score_against) DESC,score_for DESC,standing_id) rn
  FROM standings WHERE phase_id=p_phase_id AND group_id IS NOT DISTINCT FROM p_group_id)
 UPDATE standings s SET rank_no=r.rn FROM ranked r WHERE r.standing_id=s.standing_id;
END $$;


-- PROCEDIMIENTO ALMACENADO: officialize_match_result
-- Descripción: Valida el ganador, oficializa el resultado, cierra el partido, avanza al ganador y recalcula posiciones.
CREATE PROCEDURE officialize_match_result(p_match_id bigint,p_winner_participant_id bigint,p_summary jsonb,p_validator bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
DECLARE v_tid bigint; v_phase bigint; v_group bigint; v_next bigint; v_slot smallint;
BEGIN
 SELECT tournament_id,phase_id,group_id,next_match_id INTO v_tid,v_phase,v_group,v_next FROM matches WHERE match_id=p_match_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido inexistente'; END IF;
 IF p_validator IS DISTINCT FROM current_app_user_id() AND NOT is_super_admin() THEN RAISE EXCEPTION 'Validador inválido'; END IF;
 IF NOT can_manage_tournament(v_tid,'scorer',p_validator) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM match_participants WHERE match_participant_id=p_winner_participant_id AND match_id=p_match_id) THEN
  RAISE EXCEPTION 'Ganador inválido'; END IF;
 UPDATE match_participants SET is_winner=(match_participant_id=p_winner_participant_id),
   result_status=CASE WHEN match_participant_id=p_winner_participant_id THEN 'winner' ELSE 'loser' END WHERE match_id=p_match_id;
 INSERT INTO match_results(match_id,winner_participant_id,summary,status,validated_by,validated_at)
 VALUES(p_match_id,p_winner_participant_id,coalesce(p_summary,'{}'),'official',p_validator,now())
 ON CONFLICT(match_id) DO UPDATE SET winner_participant_id=excluded.winner_participant_id,summary=excluded.summary,
 status='official',validated_by=excluded.validated_by,validated_at=excluded.validated_at;
 UPDATE matches SET status='completed',ended_at=coalesce(ended_at,now()),version=version+1 WHERE match_id=p_match_id;
 IF v_next IS NOT NULL THEN
  SELECT coalesce(max(slot_no),0)+1 INTO v_slot FROM match_participants WHERE match_id=v_next;
  INSERT INTO match_participants(match_id,slot_no,team_id,player_id)
  SELECT v_next,v_slot,team_id,player_id FROM match_participants WHERE match_participant_id=p_winner_participant_id
  ON CONFLICT(match_id,slot_no) DO NOTHING;
 END IF;
 CALL recompute_standings(v_phase,v_group);
END $$;


-- PROCEDIMIENTO ALMACENADO: assign_tournament_admin
-- Descripción: Asigna o modifica el nivel de acceso de un administrador dentro de un torneo.
CREATE PROCEDURE assign_tournament_admin(p_tournament_id bigint,p_user_id bigint,p_level varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
BEGIN
 IF NOT can_manage_tournament(p_tournament_id,'owner') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_level NOT IN ('owner','editor','scorer') THEN RAISE EXCEPTION 'Nivel inválido'; END IF;
 INSERT INTO tournament_admins(tournament_id,user_id,permission_level) VALUES(p_tournament_id,p_user_id,p_level)
 ON CONFLICT(tournament_id,user_id) DO UPDATE SET permission_level=excluded.permission_level;
END $$;


-- PROCEDIMIENTO ALMACENADO: schedule_notification
-- Descripción: Programa una notificación por el canal indicado después de verificar permisos sobre el torneo.
CREATE PROCEDURE schedule_notification(p_user_id bigint,p_tournament_id bigint,p_channel varchar,p_type varchar,p_subject varchar,p_body text,p_when timestamptz DEFAULT now())
LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
BEGIN
 IF p_tournament_id IS NOT NULL AND NOT can_manage_tournament(p_tournament_id,'editor') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 INSERT INTO notifications(user_id,tournament_id,channel,type,subject,body,scheduled_at) VALUES(p_user_id,p_tournament_id,p_channel,p_type,p_subject,p_body,p_when);
END $$;


-- PROCEDIMIENTO ALMACENADO: generate_payout
-- Descripción: Genera una dispersión aplicando la regla de premio y validando al beneficiario y al aprobador.
CREATE PROCEDURE generate_payout(p_rule_id bigint,p_team_id bigint,p_player_id bigint,p_provider varchar,p_approver bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=tournamentx,public AS $$
DECLARE v_pool bigint; v_tid bigint; v_amount numeric; v_currency varchar; v_pct numeric; v_fixed numeric; v_kind varchar;
BEGIN
 SELECT r.prize_pool_id,p.tournament_id,p.amount,p.currency,r.percentage,r.fixed_amount,r.beneficiary_type
 INTO v_pool,v_tid,v_amount,v_currency,v_pct,v_fixed,v_kind
 FROM prize_distribution_rules r JOIN prize_pools p USING(prize_pool_id) WHERE r.rule_id=p_rule_id FOR UPDATE OF p;
 IF NOT FOUND OR NOT can_manage_tournament(v_tid,'owner',p_approver) THEN RAISE EXCEPTION 'No autorizado o regla inexistente'; END IF;
 IF (v_kind='team' AND (p_team_id IS NULL OR p_player_id IS NOT NULL)) OR (v_kind='player' AND (p_player_id IS NULL OR p_team_id IS NOT NULL)) THEN RAISE EXCEPTION 'Beneficiario inválido'; END IF;
 INSERT INTO payouts(rule_id,team_id,player_id,provider,amount,currency,approved_by)
 VALUES(p_rule_id,p_team_id,p_player_id,p_provider,coalesce(v_fixed,round(v_amount*v_pct/100,8)),v_currency,p_approver);
END $$;


/* ============================================================================
   SECCIÓN 5. TRIGGERS
   Automatizan fechas, validaciones, auditoría y estados financieros.
   ============================================================================ */


-- TRIGGER: users_set_updated_at
-- Descripción: Actualiza automáticamente la fecha de modificación del usuario.
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- TRIGGER: tournaments_set_updated_at
-- Descripción: Actualiza automáticamente la fecha de modificación del torneo.
CREATE TRIGGER tournaments_set_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- TRIGGER: matches_set_updated_at
-- Descripción: Actualiza la fecha de modificación y facilita el control de concurrencia del partido.
CREATE TRIGGER matches_set_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- TRIGGER: payments_set_updated_at
-- Descripción: Mantiene la fecha de la última modificación del pago.
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- TRIGGER: audit_users
-- Descripción: Registra altas, cambios y bajas de usuarios.
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION trg_audit('user_id','');


-- TRIGGER: audit_user_roles
-- Descripción: Registra todas las asignaciones o revocaciones de roles.
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION trg_audit('user_id','');


-- TRIGGER: audit_tournaments
-- Descripción: Registra cambios realizados sobre los torneos.
CREATE TRIGGER audit_tournaments AFTER INSERT OR UPDATE OR DELETE ON tournaments FOR EACH ROW EXECUTE FUNCTION trg_audit('tournament_id','tournament_id');


-- TRIGGER: audit_results
-- Descripción: Registra cualquier modificación de resultados competitivos.
CREATE TRIGGER audit_results AFTER INSERT OR UPDATE OR DELETE ON match_results FOR EACH ROW EXECUTE FUNCTION trg_audit('result_id','');


-- TRIGGER: audit_payments
-- Descripción: Registra operaciones relacionadas con entradas de dinero.
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION trg_audit('payment_id','');


-- TRIGGER: audit_payouts
-- Descripción: Registra las dispersiones y cambios de estado de premios.
CREATE TRIGGER audit_payouts AFTER INSERT OR UPDATE OR DELETE ON payouts FOR EACH ROW EXECUTE FUNCTION trg_audit('payout_id','');


-- TRIGGER: audit_prize_rules
-- Descripción: Registra cambios en las reglas de distribución de premios.
CREATE TRIGGER audit_prize_rules AFTER INSERT OR UPDATE OR DELETE ON prize_distribution_rules FOR EACH ROW EXECUTE FUNCTION trg_audit('rule_id','');


-- TRIGGER: audit_log_immutable
-- Descripción: Impide modificar o eliminar el historial de auditoría.
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION trg_audit_immutable();


-- TRIGGER: validate_match_context
-- Descripción: Comprueba que fase, grupo y torneo correspondan entre sí.
CREATE TRIGGER validate_match_context BEFORE INSERT OR UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION trg_validate_related_tournament();


-- TRIGGER: validate_registration_context
-- Descripción: Comprueba que el grupo de inscripción pertenezca al torneo.
CREATE TRIGGER validate_registration_context BEFORE INSERT OR UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION trg_validate_related_tournament();


-- TRIGGER: validate_match_result
-- Descripción: Impide oficializar ganadores que no participaron en el partido.
CREATE TRIGGER validate_match_result BEFORE INSERT OR UPDATE ON match_results FOR EACH ROW EXECUTE FUNCTION trg_validate_result();


-- TRIGGER: validate_prize_distribution
-- Descripción: Valida al final de la transacción que porcentajes y montos no excedan la bolsa.
CREATE CONSTRAINT TRIGGER validate_prize_distribution AFTER INSERT OR UPDATE OR DELETE ON prize_distribution_rules
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION trg_validate_prize_distribution();


-- TRIGGER: sync_prize_pool_funding
-- Descripción: Marca la bolsa como financiada cuando los pagos confirmados cubren el monto requerido.
CREATE TRIGGER sync_prize_pool_funding AFTER INSERT OR UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION trg_sync_prize_pool_funding();


/* ============================================================================
   SECCIÓN 6. SEGURIDAD POR FILAS Y PERMISOS
   ============================================================================ */

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournaments_read ON tournaments FOR SELECT USING(status<>'draft' OR can_manage_tournament(tournament_id));

CREATE POLICY tournaments_write ON tournaments FOR ALL USING(can_manage_tournament(tournament_id,'editor')) WITH CHECK(is_super_admin() OR owner_user_id=current_app_user_id());

CREATE POLICY matches_read ON matches FOR SELECT USING(EXISTS(SELECT 1 FROM tournaments t WHERE t.tournament_id=matches.tournament_id AND (t.status<>'draft' OR can_manage_tournament(t.tournament_id))));

CREATE POLICY matches_write ON matches FOR ALL USING(can_manage_tournament(tournament_id,'scorer')) WITH CHECK(can_manage_tournament(tournament_id,'scorer'));

CREATE POLICY registrations_read ON registrations FOR SELECT USING(can_manage_tournament(tournament_id) OR EXISTS(SELECT 1 FROM tournaments t WHERE t.tournament_id=registrations.tournament_id AND t.status<>'draft'));

CREATE POLICY registrations_write ON registrations FOR ALL USING(can_manage_tournament(tournament_id,'editor')) WITH CHECK(can_manage_tournament(tournament_id,'editor'));

REVOKE ALL ON audit_log FROM PUBLIC;

REVOKE ALL ON payments,payouts,lobbies,user_roles FROM PUBLIC;

COMMIT;


/* ============================================================================
   EJEMPLO DE USO EN UNA SESIÓN SEGURA
   ============================================================================
   BEGIN;
   SET LOCAL app.user_id='1';
   SET LOCAL app.ip_address='127.0.0.1';
   CALL tournamentx.officialize_match_result(10,21,'{"maps":[13,8]}',1);
   COMMIT;
*/
