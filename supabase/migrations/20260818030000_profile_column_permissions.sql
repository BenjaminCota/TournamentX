-- Un usuario puede mantener sus datos visibles, pero nunca promover su propio
-- rol ni reactivar una cuenta suspendida mediante una llamada directa a REST.
revoke update on table public.profiles from authenticated;
grant update (name, username) on table public.profiles to authenticated;
