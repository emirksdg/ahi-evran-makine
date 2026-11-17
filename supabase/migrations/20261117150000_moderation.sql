create table public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;
revoke all on public.moderators from public, anon, authenticated;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderators
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

alter table public.posts
  add column is_hidden boolean not null default false;

alter table public.post_comments
  add column is_hidden boolean not null default false;

alter table public.messages
  add column is_hidden boolean not null default false;

alter table public.groups
  add column is_hidden boolean not null default false;

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (
    target_type in ('post', 'comment', 'message', 'group')
  ),
  target_id uuid not null,
  target_excerpt text not null check (char_length(target_excerpt) <= 500),
  target_author_name text not null check (
    char_length(target_author_name) between 2 and 60
  ),
  target_hidden boolean not null default false,
  reason text not null check (
    reason in ('spam', 'harassment', 'inappropriate', 'privacy', 'other')
  ),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (
    status in ('open', 'reviewed', 'dismissed')
  ),
  reviewed_by uuid references public.moderators (user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index content_reports_status_created_idx
  on public.content_reports (status, created_at desc);

create index content_reports_target_idx
  on public.content_reports (target_type, target_id);

create index content_reports_reporter_created_idx
  on public.content_reports (reporter_id, created_at desc);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from public, anon, authenticated;
grant select on public.content_reports to authenticated;

create policy "Users can read their own reports"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "Moderators can read all reports"
  on public.content_reports for select to authenticated
  using (public.is_moderator());

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
      and not g.is_hidden
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

drop policy "Users can join eligible groups as themselves"
  on public.group_members;
create policy "Users can join visible eligible groups as themselves"
  on public.group_members for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and not g.is_hidden
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

drop policy "Users can discover global and own-university groups"
  on public.groups;
create policy "Users can discover visible groups"
  on public.groups for select to authenticated
  using (
    public.is_moderator()
    or owner_id = (select auth.uid())
    or (
      not is_hidden
      and (
        scope = 'global'
        or exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.university_id = groups.university_id
            and p.institution_verified_at is not null
        )
      )
    )
  );

drop policy "Verified students can create university groups"
  on public.groups;
create policy "Verified students can create visible university groups"
  on public.groups for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not is_hidden
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

drop policy "Group owners can update group details"
  on public.groups;
create policy "Group owners can update visible group details"
  on public.groups for update to authenticated
  using ((select auth.uid()) = owner_id and not is_hidden)
  with check ((select auth.uid()) = owner_id and not is_hidden);

drop policy "Users can read global and member posts"
  on public.posts;
create policy "Users can read visible posts"
  on public.posts for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (
      not is_hidden
      and (group_id is null or public.is_group_member(group_id))
    )
  );

drop policy "Users can create posts in accessible groups"
  on public.posts;
create policy "Users can create visible posts in accessible groups"
  on public.posts for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and like_count = 0
    and not is_hidden
    and (group_id is null or public.is_group_member(group_id))
  );

drop policy "Authors can update their own posts"
  on public.posts;
create policy "Authors can update their visible posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = author_id and not is_hidden)
  with check ((select auth.uid()) = author_id and not is_hidden);

drop policy "Users can like accessible posts"
  on public.post_likes;
create policy "Users can like visible accessible posts"
  on public.post_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_likes.post_id
        and not p.is_hidden
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Users can read likes on accessible posts"
  on public.post_likes;
create policy "Users can read likes on visible accessible posts"
  on public.post_likes for select to authenticated
  using (
    public.is_moderator()
    or exists (
      select 1
      from public.posts p
      where p.id = post_likes.post_id
        and not p.is_hidden
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Users can read comments on accessible posts"
  on public.post_comments;
create policy "Users can read visible comments on accessible posts"
  on public.post_comments for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (
      not is_hidden
      and exists (
        select 1
        from public.posts p
        where p.id = post_comments.post_id
          and not p.is_hidden
          and (p.group_id is null or public.is_group_member(p.group_id))
      )
    )
  );

drop policy "Users can comment on accessible posts as themselves"
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
        and (p.group_id is null or public.is_group_member(p.group_id))
    )
  );

drop policy "Group members can read messages"
  on public.messages;
create policy "Users can read visible messages in accessible groups"
  on public.messages for select to authenticated
  using (
    public.is_moderator()
    or author_id = (select auth.uid())
    or (not is_hidden and public.is_group_member(group_id))
  );

drop policy "Group members can send messages as themselves"
  on public.messages;
create policy "Members can send visible messages as themselves"
  on public.messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not is_hidden
    and public.is_group_member(group_id)
  );

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  target_author uuid;
  target_author_name text;
  target_content text;
  new_report_id uuid;
  normalized_details text := btrim(coalesce(p_details, ''));
begin
  if requesting_user is null then
    raise exception 'Şikâyet göndermek için giriş yapmalısın.';
  end if;

  if p_reason is null
    or p_reason not in ('spam', 'harassment', 'inappropriate', 'privacy', 'other')
  then
    raise exception 'Geçerli bir şikâyet nedeni seç.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(requesting_user::text, 0)
  );

  if char_length(normalized_details) > 500 then
    raise exception 'Açıklama en fazla 500 karakter olabilir.';
  end if;

  if (
    select count(*)
    from public.content_reports r
    where r.reporter_id = requesting_user
      and r.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Günlük şikâyet sınırına ulaştın.';
  end if;

  if exists (
    select 1
    from public.content_reports r
    where r.reporter_id = requesting_user
      and r.target_type = p_target_type
      and r.target_id = p_target_id
  ) then
    raise exception 'Bu içerik için zaten bir şikâyet gönderdin.';
  end if;

  case p_target_type
    when 'post' then
      select p.author_id, pr.display_name, left(p.content, 500)
        into target_author, target_author_name, target_content
      from public.posts p
      join public.profiles pr on pr.id = p.author_id
      where p.id = p_target_id
        and p.author_id <> requesting_user
        and not p.is_hidden
        and (p.group_id is null or public.is_group_member(p.group_id));
    when 'comment' then
      select c.author_id, pr.display_name, left(c.content, 500)
        into target_author, target_author_name, target_content
      from public.post_comments c
      join public.profiles pr on pr.id = c.author_id
      join public.posts p on p.id = c.post_id
      where c.id = p_target_id
        and c.author_id <> requesting_user
        and not c.is_hidden
        and not p.is_hidden
        and (p.group_id is null or public.is_group_member(p.group_id));
    when 'message' then
      select m.author_id, pr.display_name, left(m.content, 500)
        into target_author, target_author_name, target_content
      from public.messages m
      join public.profiles pr on pr.id = m.author_id
      where m.id = p_target_id
        and m.author_id <> requesting_user
        and not m.is_hidden
        and public.is_group_member(m.group_id);
    when 'group' then
      select g.owner_id, pr.display_name,
             left(g.name || case when g.description = '' then '' else ': ' || g.description end, 500)
        into target_author, target_author_name, target_content
      from public.groups g
      join public.profiles pr on pr.id = g.owner_id
      where g.id = p_target_id
        and g.owner_id <> requesting_user
        and not g.is_hidden
        and (
          g.scope = 'global'
          or exists (
            select 1
            from public.profiles p
            where p.id = requesting_user
              and p.university_id = g.university_id
              and p.institution_verified_at is not null
          )
        );
    else
      raise exception 'Bu içerik türü için şikâyet gönderilemez.';
  end case;

  if target_author is null then
    raise exception 'İçerik bulunamadı veya şikâyet edilemiyor.';
  end if;

  insert into public.content_reports (
    reporter_id,
    target_type,
    target_id,
    target_excerpt,
    target_author_name,
    reason,
    details
  )
  values (
    requesting_user,
    p_target_type,
    p_target_id,
    target_content,
    target_author_name,
    p_reason,
    normalized_details
  )
  returning id into new_report_id;

  return new_report_id;
end;
$$;

create or replace function public.moderate_content_report(
  p_report_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_report public.content_reports%rowtype;
  target_found boolean := false;
  should_hide boolean;
begin
  if not public.is_moderator() then
    raise exception 'Bu işlem moderatör yetkisi gerektirir.';
  end if;

  if p_decision is null
    or p_decision not in ('hide', 'restore', 'dismiss')
  then
    raise exception 'Geçersiz moderasyon kararı.';
  end if;

  select * into current_report
  from public.content_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Şikâyet bulunamadı.';
  end if;

  if current_report.status = 'dismissed' then
    raise exception 'Reddedilmiş bir şikâyet yeniden işleme alınamaz.';
  end if;

  if p_decision in ('hide', 'restore') then
    should_hide := p_decision = 'hide';
    case current_report.target_type
      when 'post' then
        update public.posts set is_hidden = should_hide
        where id = current_report.target_id;
      when 'comment' then
        update public.post_comments set is_hidden = should_hide
        where id = current_report.target_id;
      when 'message' then
        update public.messages set is_hidden = should_hide
        where id = current_report.target_id;
      when 'group' then
        update public.groups set is_hidden = should_hide
        where id = current_report.target_id;
    end case;
    target_found := found;

    if not target_found then
      raise exception 'Şikâyet edilen içerik artık bulunamıyor.';
    end if;

    update public.content_reports
    set target_hidden = should_hide,
        status = case when status = 'open' then 'reviewed' else status end,
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where target_type = current_report.target_type
      and target_id = current_report.target_id;
  else
    update public.content_reports
    set status = 'dismissed',
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = p_report_id;
  end if;
end;
$$;

revoke all on function public.submit_content_report(text, uuid, text, text)
  from public, anon;
grant execute on function public.submit_content_report(text, uuid, text, text)
  to authenticated;

revoke all on function public.moderate_content_report(uuid, text)
  from public, anon;
grant execute on function public.moderate_content_report(uuid, text)
  to authenticated;
