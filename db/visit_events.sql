-- visit_events — 유입 계측. 짠내배틀이 utm·ref를 어디서도 안 읽어서 목적지 집계가
-- 0이던 것을 메운다(땅모 허브가 ?utm_source=hub 를 붙여 보내고 있었다).
--
-- 정본은 이 파일이다. 라이브와 갈라지면 이 파일을 기준으로 되돌린다.
-- 적용: Supabase MCP apply_migration (2026-07-31, 마이그레이션명 create_visit_events)

-- expand-only. 기존 테이블·RPC 시그니처는 건드리지 않는다 —
-- PostgREST는 이름 기반으로 함수를 찾으므로 기존 RPC에 인자를 더하면 호출이 404로 죽는다
-- (get_weekly_ranking으로 실측 확인: PGRST202).

create table if not exists public.visit_events (
  id            uuid primary key default gen_random_uuid(),
  visitor_key   text not null,
  source        text,
  referrer_host text,
  path          text not null default '/',
  created_at    timestamptz not null default now()
);

-- ⚠️ bigserial을 쓰지 않은 이유: 이 DB의 public DEFAULT PRIVILEGES가 새 시퀀스에도
--    anon rwU를 자동 부여한다. 테이블만 잠가도 시퀀스가 열린 채 남는다. uuid면 그 문제가 없다.
alter table public.visit_events enable row level security;
-- 정책을 하나도 두지 않는다 = anon 직접 SELECT/INSERT 전면 차단.
-- (실측: SELECT는 200이지만 본문이 []이고, INSERT는 401 42501)
-- 쓰기는 아래 log_visit RPC 하나로만 들어온다.

create index if not exists visit_events_created_idx
  on public.visit_events (created_at desc);
-- 중복 억제 EXISTS 조회가 그대로 타는 인덱스
create index if not exists visit_events_dedup_idx
  on public.visit_events (visitor_key, path, created_at desc);

create or replace function public.log_visit(
  p_visitor_key text,
  p_source      text default null,
  p_referrer    text default null,
  p_path        text default '/'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key  text := trim(coalesce(p_visitor_key, ''));
  v_src  text := nullif(lower(left(trim(coalesce(p_source, '')), 32)), '');
  v_ref  text;
  v_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 120);
begin
  if char_length(v_key) not between 8 and 64 then
    return jsonb_build_object('ok', false, 'reason', 'bad_key');
  end if;

  -- referrer는 호스트만 남긴다. 전체 URL을 저장하면 외부 사이트 쿼리스트링
  -- (검색어 등)이 그대로 적재된다.
  v_ref := nullif(lower(left(regexp_replace(
             regexp_replace(coalesce(p_referrer, ''), '^[a-z]+://', '', 'i'),
             '[/?#].*$', ''), 120)), '');

  -- 30분 내 같은 방문자·같은 경로는 한 번만.
  -- ⚠️ 비교 대상 v_path는 저장값과 **같은 절삭본**이어야 한다. 원본 p_path로 비교하고
  --    절삭본을 저장하면 120자 넘는 경로가 영원히 중복 억제를 통과한다.
  if exists (
    select 1 from public.visit_events
    where visitor_key = v_key and path = v_path
      and created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('ok', true, 'deduped', true);
  end if;

  insert into public.visit_events (visitor_key, source, referrer_host, path)
  values (v_key, v_src, v_ref, v_path);

  return jsonb_build_object('ok', true, 'deduped', false);
end $$;

-- 함수는 기본으로 PUBLIC EXECUTE가 붙는다. 걷어내고 필요한 롤만 준다.
-- (이 DB의 기존 함수 10개 중 7개는 아직 PUBLIC EXECUTE가 열려 있다 — 같은 실수를 반복하지 않는다.)
revoke all on function public.log_visit(text, text, text, text) from public;
grant execute on function public.log_visit(text, text, text, text) to anon, authenticated, service_role;
