create table if not exists public.domain_events (
  event_id uuid primary key,
  event_type text not null,
  payload jsonb not null,
  actor_id uuid not null,
  household_id uuid null,
  operation_id uuid not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  constraint domain_events_event_type_check check (char_length(trim(event_type)) > 0),
  constraint domain_events_payload_check check (jsonb_typeof(payload) = 'object'),
  constraint domain_events_version_check check (version > 0)
);

create unique index if not exists domain_events_operation_id_event_type_idx
  on public.domain_events (operation_id, event_type);

create index if not exists domain_events_occurred_at_idx
  on public.domain_events (occurred_at desc);

alter table public.domain_events enable row level security;

create or replace function public.notify_domain_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform pg_notify(
    'domain_events',
    json_build_object(
      'event_id', new.event_id,
      'event_type', new.event_type
    )::text
  );

  return new;
end;
$$;

drop trigger if exists domain_events_notify on public.domain_events;

create trigger domain_events_notify
after insert on public.domain_events
for each row
execute function public.notify_domain_event();
