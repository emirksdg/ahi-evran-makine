create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;
grant select on public.user_blocks to authenticated;

create policy "Users can read their own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function public.is_user_blocked(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = target_user_id)
       or (b.blocker_id = target_user_id and b.blocked_id = (select auth.uid()))
  );
$$;

revoke all on function public.is_user_blocked(uuid) from public, anon;
grant execute on function public.is_user_blocked(uuid) to authenticated;

create or replace function public.block_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Bir kullanıcıyı engellemek için giriş yapmalısın.';
  end if;
  if target_user_id is null or target_user_id = (select auth.uid()) then
    raise exception 'Kendini engelleyemezsin.';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id)
  values ((select auth.uid()), target_user_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.user_blocks
  where blocker_id = (select auth.uid())
    and blocked_id = target_user_id;
$$;

revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (
    type in (
      'group_join_request',
      'group_join_approved',
      'group_join_rejected',
      'group_message',
      'post_comment',
      'post_like'
    )
  ),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 240),
  group_id uuid references public.groups (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_recipient_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Users can mark their notifications as read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.emit_user_notification(
  target_recipient_id uuid,
  target_actor_id uuid,
  target_type text,
  target_title text,
  target_body text,
  target_group_id uuid default null,
  target_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_recipient_id is null
    or target_recipient_id = target_actor_id
    or exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = target_recipient_id and b.blocked_id = target_actor_id)
         or (b.blocker_id = target_actor_id and b.blocked_id = target_recipient_id)
    )
  then
    return;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    group_id,
    post_id
  )
  values (
    target_recipient_id,
    target_actor_id,
    target_type,
    target_title,
    target_body,
    target_group_id,
    target_post_id
  );
end;
$$;

revoke all on function public.emit_user_notification(
  uuid, uuid, text, text, text, uuid, uuid
) from public, anon, authenticated;

create or replace function public.notify_group_join_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_owner uuid;
  requester_name text;
  group_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select g.owner_id, g.name
  into group_owner, group_name
  from public.groups g
  where g.id = new.group_id;
  select p.display_name into requester_name
  from public.profiles p
  where p.id = new.requester_id;

  perform public.emit_user_notification(
    group_owner,
    new.requester_id,
    'group_join_request',
    'Yeni katılma isteği',
    coalesce(requester_name, 'Bir kullanıcı') || ' "' || group_name || '" topluluğuna katılmak istiyor.',
    new.group_id
  );
  return new;
end;
$$;

create trigger on_group_join_request_notify_owner
  after insert on public.group_join_requests
  for each row execute function public.notify_group_join_request();

create trigger on_group_join_request_resend_notify_owner
  after update of status on public.group_join_requests
  for each row
  when (old.status <> 'pending' and new.status = 'pending')
  execute function public.notify_group_join_request();

create or replace function public.notify_group_join_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_owner uuid;
  group_name text;
begin
  if old.status = new.status
    or new.status not in ('approved', 'rejected')
  then
    return new;
  end if;

  select g.owner_id, g.name
  into group_owner, group_name
  from public.groups g
  where g.id = new.group_id;

  if new.status = 'approved' then
    perform public.emit_user_notification(
      new.requester_id,
      group_owner,
      'group_join_approved',
      'Katılma isteğin onaylandı',
      '"' || group_name || '" sohbetine katılabilirsin.',
      new.group_id
    );
  else
    perform public.emit_user_notification(
      new.requester_id,
      group_owner,
      'group_join_rejected',
      'Katılma isteğin reddedildi',
      '"' || group_name || '" topluluğuna katılma isteğin kabul edilmedi.',
      new.group_id
    );
  end if;
  return new;
end;
$$;

create trigger on_group_join_decision_notify_requester
  after update of status on public.group_join_requests
  for each row execute function public.notify_group_join_decision();

create or replace function public.notify_group_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
  group_name text;
  recipient_id uuid;
begin
  select p.display_name into sender_name
  from public.profiles p
  where p.id = new.author_id;
  select g.name into group_name
  from public.groups g
  where g.id = new.group_id;

  for recipient_id in
    select gm.user_id
    from public.group_members gm
    where gm.group_id = new.group_id
      and gm.user_id <> new.author_id
  loop
    perform public.emit_user_notification(
      recipient_id,
      new.author_id,
      'group_message',
      coalesce(sender_name, 'Yeni mesaj'),
      '"' || coalesce(group_name, 'Topluluk') || '" sohbetinde yeni mesaj var.',
      new.group_id
    );
  end loop;
  return new;
end;
$$;

create trigger on_group_message_notify_members
  after insert on public.messages
  for each row when (new.is_hidden = false)
  execute function public.notify_group_message();

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  commenter_name text;
begin
  if new.is_hidden then
    return new;
  end if;
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;
  select p.display_name into commenter_name
  from public.profiles p
  where p.id = new.author_id;

  perform public.emit_user_notification(
    post_author,
    new.author_id,
    'post_comment',
    'Yeni yorum',
    coalesce(commenter_name, 'Bir kullanıcı') || ' paylaşımına yorum yaptı.',
    null,
    new.post_id
  );
  return new;
end;
$$;

create trigger on_post_comment_notify_author
  after insert on public.post_comments
  for each row execute function public.notify_post_comment();

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  liker_name text;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;
  select p.display_name into liker_name
  from public.profiles p
  where p.id = new.user_id;

  perform public.emit_user_notification(
    post_author,
    new.user_id,
    'post_like',
    'Yeni beğeni',
    coalesce(liker_name, 'Bir kullanıcı') || ' paylaşımını beğendi.',
    null,
    new.post_id
  );
  return new;
end;
$$;

create trigger on_post_like_notify_author
  after insert on public.post_likes
  for each row execute function public.notify_post_like();

revoke all on function public.notify_group_join_request()
  from public, anon, authenticated;
revoke all on function public.notify_group_join_decision()
  from public, anon, authenticated;
revoke all on function public.notify_group_message()
  from public, anon, authenticated;
revoke all on function public.notify_post_comment()
  from public, anon, authenticated;
revoke all on function public.notify_post_like()
  from public, anon, authenticated;

create or replace function public.get_group_summaries(target_group_ids uuid[])
returns table (
  group_id uuid,
  owner_name text,
  member_count integer,
  last_message_at timestamptz,
  last_message_preview text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    p.display_name,
    count(gm.user_id)::integer,
    latest.created_at,
    case
      when public.is_group_member(g.id) then left(latest.content, 120)
      else null
    end
  from public.groups g
  join public.profiles p on p.id = g.owner_id
  left join public.group_members gm on gm.group_id = g.id
  left join lateral (
    select m.created_at, m.content
    from public.messages m
    where m.group_id = g.id
      and not m.is_hidden
      and not public.is_user_blocked(m.author_id)
    order by m.created_at desc
    limit 1
  ) latest on true
  where g.id = any(target_group_ids)
    and (
      public.is_moderator()
      or g.owner_id = (select auth.uid())
      or (
        not g.is_hidden
        and (
          g.scope = 'global'
          or exists (
            select 1
            from public.profiles viewer
            where viewer.id = (select auth.uid())
              and viewer.university_id = g.university_id
              and viewer.institution_verified_at is not null
          )
        )
      )
    )
  group by g.id, p.display_name, latest.created_at, latest.content;
$$;

revoke all on function public.get_group_summaries(uuid[]) from public, anon;
grant execute on function public.get_group_summaries(uuid[]) to authenticated;

create or replace function public.enforce_community_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  new.created_at := clock_timestamp();

  perform pg_advisory_xact_lock(
    hashtextextended(new.author_id::text || ':' || tg_table_name, 0)
  );

  if tg_table_name = 'posts' then
    select count(*) into recent_count
    from public.posts p
    where p.author_id = new.author_id
      and p.created_at >= clock_timestamp() - interval '10 minutes';
    if recent_count >= 5 then
      raise exception 'Çok sık paylaşım yapıyorsun. 10 dakika sonra tekrar dene.';
    end if;
  elsif tg_table_name = 'post_comments' then
    select count(*) into recent_count
    from public.post_comments c
    where c.author_id = new.author_id
      and c.created_at >= clock_timestamp() - interval '1 minute';
    if recent_count >= 12 then
      raise exception 'Çok hızlı yorum gönderiyorsun. Bir dakika sonra tekrar dene.';
    end if;
  elsif tg_table_name = 'messages' then
    select count(*) into recent_count
    from public.messages m
    where m.author_id = new.author_id
      and m.created_at >= clock_timestamp() - interval '1 minute';
    if recent_count >= 20 then
      raise exception 'Çok hızlı mesaj gönderiyorsun. Bir dakika sonra tekrar dene.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_community_rate_limit() from public, anon, authenticated;

create index posts_author_created_at_idx
  on public.posts (author_id, created_at desc);
create index post_comments_author_created_at_idx
  on public.post_comments (author_id, created_at desc);
create index messages_author_created_at_idx
  on public.messages (author_id, created_at desc);

create trigger enforce_post_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_community_rate_limit();

create trigger enforce_comment_rate_limit
  before insert on public.post_comments
  for each row execute function public.enforce_community_rate_limit();

create trigger enforce_message_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_community_rate_limit();

drop policy "Users can read visible posts" on public.posts;
create policy "Users can read visible posts"
  on public.posts for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (
      not is_hidden
      and not public.is_user_blocked(author_id)
      and (group_id is null or public.is_group_member(group_id))
    )
  );

drop policy "Users can read visible comments on accessible posts"
  on public.post_comments;
create policy "Users can read visible comments on accessible posts"
  on public.post_comments for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (
      not is_hidden
      and not public.is_user_blocked(author_id)
      and exists (
        select 1
        from public.posts p
        where p.id = post_comments.post_id
          and not p.is_hidden
          and (p.group_id is null or public.is_group_member(p.group_id))
      )
    )
  );

drop policy "Users can add visible comments on accessible posts"
  on public.post_comments;
create policy "Users can add visible comments on accessible posts"
  on public.post_comments for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and not is_hidden
    and exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
        and not p.is_hidden
        and not public.is_user_blocked(p.author_id)
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Users can read visible messages in accessible groups"
  on public.messages;
create policy "Users can read visible messages in accessible groups"
  on public.messages for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (
      not is_hidden
      and not public.is_user_blocked(author_id)
      and public.is_group_member(group_id)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
