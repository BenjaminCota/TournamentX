revoke update on public.profiles from authenticated;
grant update (name, username, avatar_url) on public.profiles to authenticated;

comment on table public.profiles is 'Perfil y rol de autorización de TournamentX. Los cambios de rol y estado se realizan exclusivamente mediante funciones administrativas.';
comment on function public.admin_update_profile(uuid, text, text) is 'Actualiza rol o estado después de validar que el usuario actual es administrador.';
