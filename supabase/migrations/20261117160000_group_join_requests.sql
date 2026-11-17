create table public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, requester_id)
);

create index group_join_requests_group_status_created_idx
  on public.group_join_requests (group_id, status, created_at);

alter table public.group_join_requests enable row level security;
revoke all on public.group_join_requests from public, anon, authenticated;
grant select on public.group_join_requests to authenticated;

create policy "Requesters and group owners can read join requests"
  on public.group_join_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = group_join_requests.group_id
        and g.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can join visible eligible groups as themselves"
  on public.group_members;
revoke insert on public.group_members from authenticated;

create or replace function public.request_group_join(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  request_id uuid;
  target_group public.groups%rowtype;
begin
  if requester is null then
    raise exception 'Giriş yapmadan katılma isteği gönderemezsin.';
  end if;

  select g.*
  into target_group
  from public.groups g
  where g.id = target_group_id;

  if not found
    or target_group.is_hidden
    or not (
      target_group.scope = 'global'
      or exists (
        select 1
        from public.profiles p
        where p.id = requester
          and p.university_id = target_group.university_id
          and p.institution_verified_at is not null
      )
    )
  then
    raise exception 'Bu topluluğa katılma isteği gönderilemiyor.';
  end if;

  if target_group.owner_id = requester then
    raise exception 'Kendi oluşturduğun topluluğa zaten katıldın.';
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = requester
  ) then
    raise exception 'Bu topluluğun zaten üyesisin.';
  end if;

  insert into public.group_join_requests as existing_request (
    group_id,
    requester_id
  )
  values (target_group_id, requester)
  on conflict (group_id, requester_id) do update
    set status = 'pending', created_at = now(), updated_at = now()
    where existing_request.status <> 'pending'
  returning id into request_id;

  if request_id is null then
    select r.id into request_id
    from public.group_join_requests r
    where r.group_id = target_group_id
      and r.requester_id = requester;
  end if;

  return request_id;
end;
$$;

revoke all on function public.request_group_join(uuid) from public, anon;
grant execute on function public.request_group_join(uuid) to authenticated;

create or replace function public.review_group_join_request(
  target_request_id uuid,
  approve boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
  requester uuid;
  request_status text;
  group_owner uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Giriş yapmadan istekleri değerlendiremezsin.';
  end if;
  if approve is null then
    raise exception 'İstek için bir karar seç.';
  end if;

  select r.group_id, r.requester_id, r.status, g.owner_id
  into target_group_id, requester, request_status, group_owner
  from public.group_join_requests r
  join public.groups g on g.id = r.group_id
  where r.id = target_request_id
  for update of r;

  if not found then
    raise exception 'Katılma isteği bulunamadı.';
  end if;
  if group_owner <> (select auth.uid()) then
    raise exception 'Bu isteği yalnızca topluluğu oluşturan kişi değerlendirebilir.';
  end if;
  if request_status <> 'pending' then
    raise exception 'Bu katılma isteği daha önce değerlendirilmiş.';
  end if;

  if approve then
    insert into public.group_members (group_id, user_id)
    values (target_group_id, requester)
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.group_join_requests
  set status = case when approve then 'approved' else 'rejected' end,
      updated_at = now()
  where id = target_request_id;
end;
$$;

revoke all on function public.review_group_join_request(uuid, boolean)
  from public, anon;
grant execute on function public.review_group_join_request(uuid, boolean)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_join_requests'
  ) then
    alter publication supabase_realtime
      add table public.group_join_requests;
  end if;
end;
$$;
