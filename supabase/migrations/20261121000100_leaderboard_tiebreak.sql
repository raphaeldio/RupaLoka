-- Pemecah seri pasti untuk papan peringkat (21 Nov 2026).
-- 1) Waktu pencapaian memakai clock_timestamp() (waktu nyata), bukan now() (awal transaksi).
-- 2) Bila poin dan waktu sama persis, urutan memakai player_id agar tidak ada dua peringkat 1.
--    Urutan ini sama dengan backend: points desc, achieved_at asc, player_id asc.

create or replace function public.leaderboard_submit(
  p_city_id text, p_player_id uuid, p_nickname text, p_points integer
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.leaderboard as l (city_id, player_id, nickname, points, achieved_at, updated_at)
  values (p_city_id, p_player_id, p_nickname, p_points, clock_timestamp(), clock_timestamp())
  on conflict (city_id, player_id) do update set
    nickname    = excluded.nickname,
    achieved_at = case when excluded.points > l.points then clock_timestamp() else l.achieved_at end,
    points      = greatest(l.points, excluded.points),
    updated_at  = clock_timestamp();
$$;

create or replace function public.leaderboard_rank(p_city_id text, p_player_id uuid)
returns table (rank bigint, points integer)
language sql
stable
security invoker
set search_path = public
as $$
  select 1 + (
           select count(*) from public.leaderboard o
           where o.city_id = me.city_id
             and (o.points > me.points
                  or (o.points = me.points and o.achieved_at < me.achieved_at)
                  or (o.points = me.points and o.achieved_at = me.achieved_at and o.player_id < me.player_id))
         ) as rank,
         me.points
  from public.leaderboard me
  where me.city_id = p_city_id and me.player_id = p_player_id;
$$;

drop index if exists public.leaderboard_rank_idx;
create index if not exists leaderboard_rank_idx
  on public.leaderboard (city_id, points desc, achieved_at asc, player_id asc);

-- create or replace mempertahankan hak akses; ditegaskan ulang agar migrasi berdiri sendiri.
revoke all on function public.leaderboard_submit(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.leaderboard_rank(text, uuid) from public, anon, authenticated;
grant execute on function public.leaderboard_submit(text, uuid, text, integer) to service_role;
grant execute on function public.leaderboard_rank(text, uuid) to service_role;
