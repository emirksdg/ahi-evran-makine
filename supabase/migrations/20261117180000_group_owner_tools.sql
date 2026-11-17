alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'group_join_request',
      'group_join_approved',
      'group_join_rejected',
      'group_member_removed',
      'group_message',
      'post_comment',
      'post_like'
    )
  );

create or replace function public.remove_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  group_owner uuid;
  group_name text;
begin
  if requesting_user is null then
    raise exception 'Üyeleri yönetmek için giriş yapmalısın.';
  end if;
  if target_user_id is null or target_user_id = requesting_user then
    raise exception 'Topluluk sahibi kendi üyeliğini bu menüden kaldıramaz.';
  end if;

  select g.owner_id, g.name
  into group_owner, group_name
  from public.groups g
  where g.id = target_group_id
  for update;

  if not found or group_owner <> requesting_user then
    raise exception 'Üyeleri yalnızca topluluk sahibi yönetebilir.';
  end if;

  delete from public.group_members
  where group_id = target_group_id
    and user_id = target_user_id;

  if not found then
    raise exception 'Bu kullanıcı artık topluluğun üyesi değil.';
  end if;

  perform public.emit_user_notification(
    target_user_id,
    requesting_user,
    'group_member_removed',
    'Topluluktan çıkarıldın',
    '"' || group_name || '" topluluğundaki üyeliğin topluluk sahibi tarafından kaldırıldı.',
    target_group_id
  );
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid)
  from public, anon;
grant execute on function public.remove_group_member(uuid, uuid)
  to authenticated;

drop policy if exists "Authors can delete their own group messages"
  on public.messages;
drop policy if exists "Members can delete their own group messages"
  on public.messages;
drop policy if exists "Authors and group owners can delete group messages"
  on public.messages;
create policy "Authors and group owners can delete group messages"
  on public.messages for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = messages.group_id
        and g.owner_id = (select auth.uid())
    )
  );
