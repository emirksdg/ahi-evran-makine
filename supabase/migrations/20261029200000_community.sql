create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  department text not null check (char_length(department) between 2 and 100),
  avatar_path text check (
    avatar_path is null or avatar_path like id::text || '/%'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  category text not null check (category in ('Fikir', 'Ders', 'Kampüs')),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 48),
  description text not null default '' check (char_length(description) <= 140),
  created_at timestamptz not null default now()
);

create unique index groups_name_case_insensitive_idx
  on public.groups (lower(name));

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_group_created_at_idx
  on public.messages (group_id, created_at desc);

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, department, avatar_path)
  on public.profiles to authenticated;

grant select, insert, delete on public.posts to authenticated;
grant update (content, category) on public.posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, delete on public.messages to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  requested_department text := nullif(btrim(new.raw_user_meta_data ->> 'department'), '');
begin
  if requested_name is null or char_length(requested_name) not between 2 and 60 then
    raise exception 'Geçerli bir görünen ad girilmelidir.';
  end if;
  if requested_department is null or char_length(requested_department) not between 2 and 100 then
    raise exception 'Geçerli bir bölüm girilmelidir.';
  end if;

  insert into public.profiles (id, display_name, department)
  values (new.id, requested_name, requested_department);
  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.add_group_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.owner_id);
  return new;
end;
$$;

create trigger on_group_created_add_owner
  after insert on public.groups
  for each row execute function public.add_group_owner_as_member();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

create or replace function public.refresh_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts
  set like_count = (
    select count(*)::integer
    from public.post_likes
    where post_id = target_post_id
  )
  where id = target_post_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger on_post_like_change_refresh_count
  after insert or delete on public.post_likes
  for each row execute function public.refresh_post_like_count();

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.add_group_owner_as_member() from public, anon, authenticated;
revoke all on function public.refresh_post_like_count() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

create policy "Signed-in users can read profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Signed-in users can read posts"
  on public.posts for select to authenticated
  using (true);

create policy "Users can create posts as themselves"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = author_id and like_count = 0);

create policy "Authors can update their own posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors can delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = author_id);

revoke update on public.posts from authenticated;
grant update (content, category) on public.posts to authenticated;

create policy "Signed-in users can read likes"
  on public.post_likes for select to authenticated
  using (true);

create policy "Users can like as themselves"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own likes"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Signed-in users can discover groups"
  on public.groups for select to authenticated
  using (true);

create policy "Users can create groups as themselves"
  on public.groups for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Group owners can update their groups"
  on public.groups for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Group owners can delete their groups"
  on public.groups for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Members can see group memberships"
  on public.group_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_group_member(group_id)
  );

create policy "Users can join groups as themselves"
  on public.group_members for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can leave groups"
  on public.group_members for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Group members can read messages"
  on public.messages for select to authenticated
  using (public.is_group_member(group_id));

create policy "Group members can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_group_member(group_id)
  );

create policy "Authors can delete their own group messages"
  on public.messages for delete to authenticated
  using (author_id = (select auth.uid()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'student-avatars',
  'student-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, update, delete on storage.objects to authenticated;

create policy "Signed-in users can view profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'student-avatars');

create policy "Users can upload their own profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'groups'
  ) then
    alter publication supabase_realtime add table public.groups;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
