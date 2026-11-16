create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  created_at timestamptz not null default now()
);

create unique index universities_name_case_insensitive_idx
  on public.universities (lower(name));

create table public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  email_domain text not null check (
    email_domain = lower(btrim(email_domain))
    and char_length(email_domain) between 3 and 253
    and email_domain !~ '[@/[:space:]]'
    and position('.' in email_domain) > 0
  ),
  evidence_url text not null check (evidence_url ~* '^https?://[^[:space:]]+$'),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint university_email_domains_domain_unique unique (email_domain)
);

create index university_email_domains_university_id_idx
  on public.university_email_domains (university_id);

alter table public.profiles
  add column university_id uuid references public.universities (id) on delete restrict,
  add column institution_verified_at timestamptz;

create index profiles_university_verified_idx
  on public.profiles (university_id, institution_verified_at)
  where institution_verified_at is not null;

alter table public.groups
  add column scope text not null default 'global',
  add column university_id uuid references public.universities (id) on delete restrict,
  add column department text,
  add constraint groups_scope_check check (scope in ('global', 'university')),
  add constraint groups_university_scope_check check (
    (scope = 'global' and university_id is null)
    or (scope = 'university' and university_id is not null)
  );

drop index public.groups_name_case_insensitive_idx;
create unique index groups_name_scope_case_insensitive_idx
  on public.groups (
    lower(name),
    scope,
    coalesce(university_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index groups_university_id_idx
  on public.groups (university_id)
  where scope = 'university';

alter table public.posts
  add column group_id uuid references public.groups (id) on delete set null;

create index posts_group_created_at_idx
  on public.posts (group_id, created_at desc)
  where group_id is not null;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at);

create index post_comments_author_id_idx
  on public.post_comments (author_id);

create index group_members_user_group_idx
  on public.group_members (user_id, group_id);

revoke all on public.universities from public, anon, authenticated;
revoke all on public.university_email_domains from public, anon, authenticated;
revoke all on public.post_comments from public, anon, authenticated;
grant select on public.universities to anon, authenticated;
grant select on public.university_email_domains to anon, authenticated;
grant select on public.post_comments to authenticated;
grant insert, delete on public.post_comments to authenticated;
grant insert on public.groups to authenticated;
revoke update on public.groups from authenticated;
grant update (name, description, department) on public.groups to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  requested_department text := nullif(btrim(new.raw_user_meta_data ->> 'department'), '');
  requested_university_id uuid;
  requested_email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
  verified_at timestamptz;
begin
  if requested_name is null or char_length(requested_name) not between 2 and 60 then
    raise exception 'Geçerli bir görünen ad girilmelidir.';
  end if;
  if requested_department is null or char_length(requested_department) not between 2 and 100 then
    raise exception 'Geçerli bir bölüm girilmelidir.';
  end if;

  begin
    requested_university_id :=
      nullif(btrim(new.raw_user_meta_data ->> 'university_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Geçerli bir üniversite seçilmelidir.';
  end;

  if requested_university_id is not null then
    if not exists (
      select 1 from public.universities where id = requested_university_id
    ) then
      raise exception 'Seçilen üniversite bulunamadı.';
    end if;

    if exists (
      select 1
      from public.university_email_domains d
      where d.email_domain = requested_email_domain
        and d.university_id <> requested_university_id
    ) then
      raise exception 'E-posta alan adı seçilen üniversiteyle eşleşmiyor.';
    end if;

    if new.email_confirmed_at is not null then
      select now()
        into verified_at
        from public.university_email_domains d
        where d.email_domain = requested_email_domain
          and d.university_id = requested_university_id;
    end if;
  end if;

  insert into public.profiles (
    id, display_name, department, university_id, institution_verified_at
  )
  values (
    new.id, requested_name, requested_department, requested_university_id, verified_at
  );
  return new;
end;
$$;

create or replace function public.sync_profile_institution_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_university_id uuid;
  requested_email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
begin
  select university_id into profile_university_id
  from public.profiles
  where id = new.id;

  if profile_university_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.university_email_domains d
    where d.email_domain = requested_email_domain
      and d.university_id <> profile_university_id
  ) then
    raise exception 'E-posta alan adı seçilen üniversiteyle eşleşmiyor.';
  end if;

  update public.profiles
  set institution_verified_at = case
    when new.email_confirmed_at is not null and exists (
      select 1
      from public.university_email_domains d
      where d.email_domain = requested_email_domain
        and d.university_id = profile_university_id
    ) then coalesce(institution_verified_at, now())
    else null
  end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_institution_verification_changed
  after update of email, email_confirmed_at on auth.users
  for each row
  when (
    old.email is distinct from new.email
    or old.email_confirmed_at is distinct from new.email_confirmed_at
  )
  execute function public.sync_profile_institution_verification();

create or replace function public.sync_profiles_for_verified_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (
      old.university_id is distinct from new.university_id
      or old.email_domain is distinct from new.email_domain
    ) then
      update public.profiles p
      set institution_verified_at = null
      from auth.users u
      where p.id = u.id
        and p.university_id = old.university_id
        and u.email_confirmed_at is not null
        and lower(split_part(coalesce(u.email, ''), '@', 2)) = old.email_domain;
    end if;
  end if;

  update public.profiles p
  set institution_verified_at = coalesce(p.institution_verified_at, now())
  from auth.users u
  where p.id = u.id
    and p.university_id = new.university_id
    and u.email_confirmed_at is not null
    and lower(split_part(coalesce(u.email, ''), '@', 2)) = new.email_domain;
  return new;
end;
$$;

create trigger on_verified_domain_sync_profiles
  after insert or update of university_id, email_domain, verified_at
  on public.university_email_domains
  for each row
  execute function public.sync_profiles_for_verified_domain();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.group_id = target_group_id
      and gm.user_id = (select auth.uid())
      and (
        g.scope = 'global'
        or exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.university_id = g.university_id
            and p.institution_verified_at is not null
        )
      )
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.sync_profile_institution_verification() from public, anon, authenticated;
revoke all on function public.sync_profiles_for_verified_domain() from public, anon, authenticated;

drop policy "Signed-in users can discover groups" on public.groups;
create policy "Users can discover global and own-university groups"
  on public.groups for select to authenticated
  using (
    scope = 'global'
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.university_id = groups.university_id
        and p.institution_verified_at is not null
    )
  );

drop policy "Users can create groups as themselves" on public.groups;
create policy "Verified students can create university groups"
  on public.groups for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      (scope = 'global' and university_id is null)
      or (
        scope = 'university'
        and exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.university_id = groups.university_id
            and p.institution_verified_at is not null
        )
      )
    )
  );

drop policy "Group owners can update their groups" on public.groups;
create policy "Group owners can update group details"
  on public.groups for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy "Users can join groups as themselves" on public.group_members;
create policy "Users can join eligible groups as themselves"
  on public.group_members for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and (
          g.scope = 'global'
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.university_id = g.university_id
              and p.institution_verified_at is not null
          )
        )
    )
  );

drop policy "Signed-in users can read posts" on public.posts;
create policy "Users can read global and member posts"
  on public.posts for select to authenticated
  using (group_id is null or public.is_group_member(group_id));

drop policy "Users can create posts as themselves" on public.posts;
create policy "Users can create posts in accessible groups"
  on public.posts for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and like_count = 0
    and (group_id is null or public.is_group_member(group_id))
  );

drop policy "Signed-in users can read likes" on public.post_likes;
create policy "Users can read likes on accessible posts"
  on public.post_likes for select to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_likes.post_id
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Users can like as themselves" on public.post_likes;
create policy "Users can like accessible posts"
  on public.post_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_likes.post_id
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

create policy "Users can read comments on accessible posts"
  on public.post_comments for select to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

create policy "Users can comment on accessible posts as themselves"
  on public.post_comments for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

create policy "Authors can delete their own comments"
  on public.post_comments for delete to authenticated
  using (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Authors can delete their own group messages" on public.messages;
create policy "Members can delete their own group messages"
  on public.messages for delete to authenticated
  using (
    author_id = (select auth.uid())
    and public.is_group_member(group_id)
  );

alter table public.universities enable row level security;
alter table public.university_email_domains enable row level security;
alter table public.post_comments enable row level security;

create policy "Universities are publicly readable"
  on public.universities for select to anon, authenticated
  using (true);

create policy "Verified university domains are publicly readable"
  on public.university_email_domains for select to anon, authenticated
  using (true);
