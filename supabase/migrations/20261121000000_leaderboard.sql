-- Papan peringkat akhir tur kota (21 Nov 2026). Diakses HANYA oleh backend dengan service role key.
-- Satu baris per (kota, pemain); simpan skor terbaik. player_id = UUID acak dari perangkat, bukan akun.

create table if not exists public.leaderboard (
  city_id     text        not null,
  player_id   uuid        not null,
  nickname    text        not null check (char_length(nickname) between 3 and 20),
  points      integer     not null check (points >= 0),
  achieved_at timestamptz not null default now(),  -- saat skor terbaik dicapai (penentu seri)
  updated_at  timestamptz not null default now(),
  primary key (city_id, player_id)
);

create index if not exists leaderboard_rank_idx
  on public.leaderboard (city_id, points desc, achieved_at asc);

-- RLS aktif tanpa kebijakan: anon/authenticated tidak bisa membaca atau menulis; service role melewati RLS.
alter table public.leaderboard enable row level security;

-- Kirim skor: simpan yang terbaik; nama panggilan selalu memakai yang terbaru.
create or replace function public.leaderboard_submit(
  p_city_id text, p_player_id uuid, p_nickname text, p_points integer
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.leaderboard as l (city_id, player_id, nickname, points)
  values (p_city_id, p_player_id, p_nickname, p_points)
  on conflict (city_id, player_id) do update set
    nickname    = excluded.nickname,
    achieved_at = case when excluded.points > l.points then now() else l.achieved_at end,
    points      = greatest(l.points, excluded.points),
    updated_at  = now();
$$;

-- Peringkat satu pemain: poin lebih tinggi, atau sama tetapi dicapai lebih dulu, berada di atasnya.
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
             and (o.points > me.points or (o.points = me.points and o.achieved_at < me.achieved_at))
         ) as rank,
         me.points
  from public.leaderboard me
  where me.city_id = p_city_id and me.player_id = p_player_id;
$$;

-- Fungsi hanya untuk backend.
revoke all on function public.leaderboard_submit(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.leaderboard_rank(text, uuid) from public, anon, authenticated;
grant execute on function public.leaderboard_submit(text, uuid, text, integer) to service_role;
grant execute on function public.leaderboard_rank(text, uuid) to service_role;
