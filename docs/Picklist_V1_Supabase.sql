-- Picklist V1 schema + RPCs
-- Run this in Supabase SQL Editor before using the Picklist page.

begin;

create extension if not exists pgcrypto;

create table if not exists public.picklist_boards (
  id bigserial primary key,
  event_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.picklist_lists (
  id bigserial primary key,
  board_id bigint not null references public.picklist_boards(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_picklist_lists_board_position
  on public.picklist_lists(board_id, position, id);

create table if not exists public.picklist_entries (
  id bigserial primary key,
  list_id bigint not null references public.picklist_lists(id) on delete cascade,
  team_number integer not null check (team_number > 0),
  position integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, team_number)
);

create index if not exists idx_picklist_entries_list_position
  on public.picklist_entries(list_id, position, id);

create table if not exists public.picklist_settings (
  id smallint primary key default 1 check (id = 1),
  passcode_hash text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.picklist_settings(id)
values (1)
on conflict (id) do nothing;

create or replace function public.set_picklist_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_picklist_boards_updated_at on public.picklist_boards;
create trigger trg_picklist_boards_updated_at
before update on public.picklist_boards
for each row execute function public.set_picklist_updated_at();

drop trigger if exists trg_picklist_lists_updated_at on public.picklist_lists;
create trigger trg_picklist_lists_updated_at
before update on public.picklist_lists
for each row execute function public.set_picklist_updated_at();

drop trigger if exists trg_picklist_entries_updated_at on public.picklist_entries;
create trigger trg_picklist_entries_updated_at
before update on public.picklist_entries
for each row execute function public.set_picklist_updated_at();

drop trigger if exists trg_picklist_settings_updated_at on public.picklist_settings;
create trigger trg_picklist_settings_updated_at
before update on public.picklist_settings
for each row execute function public.set_picklist_updated_at();

alter table public.picklist_boards enable row level security;
alter table public.picklist_lists enable row level security;
alter table public.picklist_entries enable row level security;
alter table public.picklist_settings enable row level security;

drop policy if exists "picklist_boards_public_read" on public.picklist_boards;
create policy "picklist_boards_public_read"
on public.picklist_boards
for select
using (true);

drop policy if exists "picklist_lists_public_read" on public.picklist_lists;
create policy "picklist_lists_public_read"
on public.picklist_lists
for select
using (true);

drop policy if exists "picklist_entries_public_read" on public.picklist_entries;
create policy "picklist_entries_public_read"
on public.picklist_entries
for select
using (true);

revoke all on public.picklist_boards from anon, authenticated;
revoke all on public.picklist_lists from anon, authenticated;
revoke all on public.picklist_entries from anon, authenticated;
revoke all on public.picklist_settings from anon, authenticated;

grant select on public.picklist_boards to anon, authenticated;
grant select on public.picklist_lists to anon, authenticated;
grant select on public.picklist_entries to anon, authenticated;

create or replace function public.picklist_is_passcode_valid(p_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_hash text;
begin
  if p_passcode is null or length(trim(p_passcode)) = 0 then
    return false;
  end if;

  select passcode_hash
    into v_hash
  from public.picklist_settings
  where id = 1;

  if v_hash is null then
    return false;
  end if;

  return crypt(p_passcode, v_hash) = v_hash;
end;
$$;

create or replace function public.picklist_assert_passcode(p_passcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.picklist_is_passcode_valid(p_passcode) then
    raise exception 'Invalid picklist passcode';
  end if;
end;
$$;

create or replace function public.picklist_has_passcode()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.picklist_settings
    where id = 1 and passcode_hash is not null
  );
$$;

create or replace function public.picklist_verify_passcode(p_passcode text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.picklist_is_passcode_valid(p_passcode);
$$;

create or replace function public.picklist_set_passcode(
  p_current_passcode text,
  p_new_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if p_new_passcode is null or length(trim(p_new_passcode)) < 4 then
    raise exception 'New passcode must be at least 4 characters.';
  end if;

  select passcode_hash
    into v_hash
  from public.picklist_settings
  where id = 1
  for update;

  if v_hash is not null then
    if p_current_passcode is null or crypt(p_current_passcode, v_hash) <> v_hash then
      return false;
    end if;
  end if;

  update public.picklist_settings
  set
    passcode_hash = crypt(p_new_passcode, gen_salt('bf')),
    updated_by = 'picklist_ui'
  where id = 1;

  return true;
end;
$$;

create or replace function public.picklist_get_or_create_board(p_event_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_key text;
  v_board_id bigint;
  v_lists_count integer;
  v_result jsonb;
begin
  v_event_key := trim(coalesce(p_event_key, ''));
  if v_event_key = '' then
    raise exception 'Event key is required.';
  end if;

  insert into public.picklist_boards(event_key)
  values (v_event_key)
  on conflict (event_key)
  do update set updated_at = now()
  returning id into v_board_id;

  if v_board_id is null then
    select id into v_board_id
    from public.picklist_boards
    where event_key = v_event_key;
  end if;

  select count(*)
    into v_lists_count
  from public.picklist_lists
  where board_id = v_board_id;

  if v_lists_count = 0 then
    insert into public.picklist_lists(board_id, title, position)
    values
      (v_board_id, '1st Pick Req', 0),
      (v_board_id, '2nd Pick Req', 1);
  end if;

  select jsonb_build_object(
    'board_id', b.id,
    'event_key', b.event_key,
    'lists',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'title', l.title,
            'position', l.position,
            'entries',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', e.id,
                    'team_number', e.team_number,
                    'position', e.position,
                    'note', e.note
                  )
                  order by e.position, e.id
                )
                from public.picklist_entries e
                where e.list_id = l.id
              ),
              '[]'::jsonb
            )
          )
          order by l.position, l.id
        )
        from public.picklist_lists l
        where l.board_id = b.id
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.picklist_boards b
  where b.id = v_board_id;

  return v_result;
end;
$$;

create or replace function public.picklist_create_list(
  p_event_key text,
  p_title text,
  p_passcode text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_key text;
  v_title text;
  v_board_id bigint;
  v_position integer;
  v_list_id bigint;
begin
  perform public.picklist_assert_passcode(p_passcode);

  v_event_key := trim(coalesce(p_event_key, ''));
  v_title := trim(coalesce(p_title, ''));
  if v_event_key = '' then
    raise exception 'Event key is required.';
  end if;
  if v_title = '' then
    raise exception 'List title is required.';
  end if;

  insert into public.picklist_boards(event_key)
  values (v_event_key)
  on conflict (event_key)
  do update set updated_at = now()
  returning id into v_board_id;

  select coalesce(max(position), -1) + 1
    into v_position
  from public.picklist_lists
  where board_id = v_board_id;

  insert into public.picklist_lists(board_id, title, position)
  values (v_board_id, v_title, v_position)
  returning id into v_list_id;

  return v_list_id;
end;
$$;

create or replace function public.picklist_rename_list(
  p_list_id bigint,
  p_title text,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_rows integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  v_title := trim(coalesce(p_title, ''));
  if v_title = '' then
    raise exception 'List title is required.';
  end if;

  update public.picklist_lists
  set title = v_title
  where id = p_list_id;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

create or replace function public.picklist_delete_list(
  p_list_id bigint,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id bigint;
  v_rows integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  select board_id
    into v_board_id
  from public.picklist_lists
  where id = p_list_id;

  delete from public.picklist_lists
  where id = p_list_id;

  get diagnostics v_rows = row_count;

  if v_rows > 0 and v_board_id is not null then
    with ranked as (
      select id, row_number() over (order by position, id) - 1 as new_position
      from public.picklist_lists
      where board_id = v_board_id
    )
    update public.picklist_lists l
    set position = ranked.new_position
    from ranked
    where l.id = ranked.id;
  end if;

  return v_rows > 0;
end;
$$;

create or replace function public.picklist_add_entry(
  p_list_id bigint,
  p_team_number integer,
  p_target_position integer,
  p_note text,
  p_passcode text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_position integer;
  v_max_position integer;
  v_entry_id bigint;
begin
  perform public.picklist_assert_passcode(p_passcode);

  if not exists (select 1 from public.picklist_lists where id = p_list_id) then
    raise exception 'Target list does not exist.';
  end if;

  if exists (
    select 1
    from public.picklist_entries
    where list_id = p_list_id and team_number = p_team_number
  ) then
    raise exception 'Team already exists in this list.';
  end if;

  select coalesce(max(position), -1)
    into v_max_position
  from public.picklist_entries
  where list_id = p_list_id;

  if p_target_position is null or p_target_position < 0 or p_target_position > v_max_position + 1 then
    v_target_position := v_max_position + 1;
  else
    v_target_position := p_target_position;
  end if;

  update public.picklist_entries
  set position = position + 1
  where list_id = p_list_id and position >= v_target_position;

  insert into public.picklist_entries(list_id, team_number, position, note)
  values (p_list_id, p_team_number, v_target_position, coalesce(p_note, ''))
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function public.picklist_move_entry(
  p_entry_id bigint,
  p_target_list_id bigint,
  p_target_position integer,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_list_id bigint;
  v_source_position integer;
  v_team_number integer;
  v_target_position integer;
  v_target_max integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  select list_id, position, team_number
    into v_source_list_id, v_source_position, v_team_number
  from public.picklist_entries
  where id = p_entry_id;

  if v_source_list_id is null then
    raise exception 'Entry does not exist.';
  end if;

  if not exists (select 1 from public.picklist_lists where id = p_target_list_id) then
    raise exception 'Target list does not exist.';
  end if;

  if v_source_list_id <> p_target_list_id and exists (
    select 1
    from public.picklist_entries
    where list_id = p_target_list_id and team_number = v_team_number
  ) then
    raise exception 'Team already exists in target list.';
  end if;

  if v_source_list_id = p_target_list_id then
    select coalesce(max(position), 0)
      into v_target_max
    from public.picklist_entries
    where list_id = p_target_list_id;

    if p_target_position is null then
      v_target_position := v_source_position;
    elsif p_target_position < 0 then
      v_target_position := 0;
    elsif p_target_position > v_target_max then
      v_target_position := v_target_max;
    else
      v_target_position := p_target_position;
    end if;

    if v_target_position = v_source_position then
      return true;
    end if;

    if v_target_position > v_source_position then
      update public.picklist_entries
      set position = position - 1
      where list_id = v_source_list_id
        and id <> p_entry_id
        and position > v_source_position
        and position <= v_target_position;
    else
      update public.picklist_entries
      set position = position + 1
      where list_id = v_source_list_id
        and id <> p_entry_id
        and position >= v_target_position
        and position < v_source_position;
    end if;

    update public.picklist_entries
    set position = v_target_position
    where id = p_entry_id;
  else
    select coalesce(max(position), -1)
      into v_target_max
    from public.picklist_entries
    where list_id = p_target_list_id;

    if p_target_position is null or p_target_position < 0 then
      v_target_position := v_target_max + 1;
    elsif p_target_position > v_target_max + 1 then
      v_target_position := v_target_max + 1;
    else
      v_target_position := p_target_position;
    end if;

    update public.picklist_entries
    set position = position - 1
    where list_id = v_source_list_id and position > v_source_position;

    update public.picklist_entries
    set position = position + 1
    where list_id = p_target_list_id and position >= v_target_position;

    update public.picklist_entries
    set list_id = p_target_list_id, position = v_target_position
    where id = p_entry_id;
  end if;

  return true;
end;
$$;

create or replace function public.picklist_reorder_entries(
  p_list_id bigint,
  p_entry_ids bigint[],
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_ids bigint[];
  v_entry_id bigint;
  v_position integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  select array_agg(id order by position, id)
    into v_existing_ids
  from public.picklist_entries
  where list_id = p_list_id;

  if coalesce(array_length(v_existing_ids, 1), 0) = 0 then
    return true;
  end if;

  if p_entry_ids is null or array_length(p_entry_ids, 1) <> array_length(v_existing_ids, 1) then
    raise exception 'Entry ID list does not match list contents.';
  end if;

  if exists (
    select 1
    from unnest(p_entry_ids) as u(entry_id)
    where not exists (
      select 1
      from public.picklist_entries e
      where e.id = u.entry_id and e.list_id = p_list_id
    )
  ) then
    raise exception 'Entry list contains IDs outside target list.';
  end if;

  for v_entry_id, v_position in
    select entry_id, ordinality::integer - 1
    from unnest(p_entry_ids) with ordinality as u(entry_id, ordinality)
  loop
    update public.picklist_entries
    set position = v_position
    where id = v_entry_id;
  end loop;

  return true;
end;
$$;

create or replace function public.picklist_remove_entry(
  p_entry_id bigint,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id bigint;
  v_position integer;
  v_rows integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  select list_id, position
    into v_list_id, v_position
  from public.picklist_entries
  where id = p_entry_id;

  delete from public.picklist_entries
  where id = p_entry_id;

  get diagnostics v_rows = row_count;

  if v_rows > 0 and v_list_id is not null then
    update public.picklist_entries
    set position = position - 1
    where list_id = v_list_id and position > v_position;
  end if;

  return v_rows > 0;
end;
$$;

create or replace function public.picklist_update_entry_note(
  p_entry_id bigint,
  p_note text,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  perform public.picklist_assert_passcode(p_passcode);

  update public.picklist_entries
  set note = coalesce(p_note, '')
  where id = p_entry_id;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.picklist_has_passcode() to anon, authenticated;
grant execute on function public.picklist_verify_passcode(text) to anon, authenticated;
grant execute on function public.picklist_set_passcode(text, text) to anon, authenticated;
grant execute on function public.picklist_get_or_create_board(text) to anon, authenticated;
grant execute on function public.picklist_create_list(text, text, text) to anon, authenticated;
grant execute on function public.picklist_rename_list(bigint, text, text) to anon, authenticated;
grant execute on function public.picklist_delete_list(bigint, text) to anon, authenticated;
grant execute on function public.picklist_add_entry(bigint, integer, integer, text, text) to anon, authenticated;
grant execute on function public.picklist_move_entry(bigint, bigint, integer, text) to anon, authenticated;
grant execute on function public.picklist_reorder_entries(bigint, bigint[], text) to anon, authenticated;
grant execute on function public.picklist_remove_entry(bigint, text) to anon, authenticated;
grant execute on function public.picklist_update_entry_note(bigint, text, text) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'picklist_boards'
    ) then
      execute 'alter publication supabase_realtime add table public.picklist_boards';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'picklist_lists'
    ) then
      execute 'alter publication supabase_realtime add table public.picklist_lists';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'picklist_entries'
    ) then
      execute 'alter publication supabase_realtime add table public.picklist_entries';
    end if;
  end if;
end;
$$;

commit;

