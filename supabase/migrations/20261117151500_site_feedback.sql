create table public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_display_name text not null check (
    char_length(user_display_name) between 2 and 60
  ),
  category text not null check (
    category in ('design', 'feature', 'issue', 'other')
  ),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'new' check (
    status in ('new', 'reviewed')
  ),
  reviewed_by uuid references public.moderators (user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index site_feedback_status_created_idx
  on public.site_feedback (status, created_at desc);

create index site_feedback_user_created_idx
  on public.site_feedback (user_id, created_at desc);

alter table public.site_feedback enable row level security;
revoke all on public.site_feedback from public, anon, authenticated;
grant select on public.site_feedback to authenticated;

create policy "Moderators can read site feedback"
  on public.site_feedback for select to authenticated
  using (public.is_moderator());

create or replace function public.submit_site_feedback(
  p_category text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  sender_name text;
  normalized_message text := btrim(coalesce(p_message, ''));
  new_feedback_id uuid;
begin
  if requesting_user is null then
    raise exception 'Geri bildirim göndermek için giriş yapmalısın.';
  end if;

  if p_category is null
    or p_category not in ('design', 'feature', 'issue', 'other')
  then
    raise exception 'Geçerli bir geri bildirim konusu seç.';
  end if;

  if char_length(normalized_message) not between 10 and 1000 then
    raise exception 'Geri bildirim 10–1000 karakter arasında olmalı.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(requesting_user::text, 0)
  );

  if (
    select count(*)
    from public.site_feedback f
    where f.user_id = requesting_user
      and f.created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Günlük geri bildirim sınırına ulaştın.';
  end if;

  select p.display_name into sender_name
  from public.profiles p
  where p.id = requesting_user;

  if sender_name is null then
    raise exception 'Profil bilgisi bulunamadı.';
  end if;

  insert into public.site_feedback (
    user_id,
    user_display_name,
    category,
    message
  )
  values (
    requesting_user,
    sender_name,
    p_category,
    normalized_message
  )
  returning id into new_feedback_id;

  return new_feedback_id;
end;
$$;

create or replace function public.mark_site_feedback_reviewed(
  p_feedback_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Bu işlem moderatör yetkisi gerektirir.';
  end if;

  update public.site_feedback
  set status = 'reviewed',
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_feedback_id
    and status = 'new';

  if not found then
    raise exception 'Yeni geri bildirim bulunamadı.';
  end if;
end;
$$;

revoke all on function public.submit_site_feedback(text, text)
  from public, anon;
grant execute on function public.submit_site_feedback(text, text)
  to authenticated;

revoke all on function public.mark_site_feedback_reviewed(uuid)
  from public, anon;
grant execute on function public.mark_site_feedback_reviewed(uuid)
  to authenticated;
