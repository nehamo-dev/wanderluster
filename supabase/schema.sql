-- ============================================================
-- Wanderluster schema
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── folios ───────────────────────────────────────────────────
create table if not exists folios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  slug        text,                        -- 'tokyo' | 'salzburg' etc. (optional, for dev compat)
  title       text not null,
  destination text not null,
  country     text not null,
  dates       text,
  duration    text,
  season      text,
  vibe        text,
  teaser      text,
  palette     jsonb,                       -- { a, b, c, accent }
  visa        jsonb,                       -- { label, status } | null
  status      text default 'draft',        -- 'draft' | 'confirmed' | 'archived'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── folio_days ───────────────────────────────────────────────
create table if not exists folio_days (
  id        uuid primary key default gen_random_uuid(),
  folio_id  uuid references folios(id) on delete cascade not null,
  n         integer not null,              -- day number (1-based)
  date      text not null,                 -- 'Tue · Mar 25'
  label     text,
  confirmed boolean default false,
  empty     boolean default false,
  created_at timestamptz default now()
);

-- ── folio_events ─────────────────────────────────────────────
create table if not exists folio_events (
  id         uuid primary key default gen_random_uuid(),
  day_id     uuid references folio_days(id) on delete cascade not null,
  folio_id   uuid references folios(id) on delete cascade not null,
  kind       text not null,               -- 'flight' | 'hotel' | 'food' | 'activity' | 'transport' | 'flag'
  time       text,                        -- '15:40' | null
  title      text not null,
  meta       text,
  confirmed  boolean default false,
  alert      boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ── folio_docs ───────────────────────────────────────────────
create table if not exists folio_docs (
  id        uuid primary key default gen_random_uuid(),
  folio_id  uuid references folios(id) on delete cascade not null,
  name      text not null,
  state     text not null,               -- 'awaiting upload' | 'attached' | 'flagged — action required'
  file_url  text,
  created_at timestamptz default now()
);

-- ── wishlist ─────────────────────────────────────────────────
create table if not exists wishlist (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade not null,
  slug      text,
  name      text not null,
  season    text,
  vibe      text,
  flight    text,
  visa      text,
  budget    text,
  palette   jsonb,                       -- { a, b, c }
  notes     text,
  created_at timestamptz default now()
);

-- ── updated_at trigger ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger folios_updated_at
  before update on folios
  for each row execute procedure set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table folios       enable row level security;
alter table folio_days   enable row level security;
alter table folio_events enable row level security;
alter table folio_docs   enable row level security;
alter table wishlist     enable row level security;

-- folios: owner only
create policy "owner" on folios
  for all using (auth.uid() = user_id);

-- folio_days: inherit from parent folio
create policy "owner" on folio_days
  for all using (
    exists (select 1 from folios where folios.id = folio_days.folio_id and folios.user_id = auth.uid())
  );

-- folio_events: inherit from parent folio
create policy "owner" on folio_events
  for all using (
    exists (select 1 from folios where folios.id = folio_events.folio_id and folios.user_id = auth.uid())
  );

-- folio_docs: inherit from parent folio
create policy "owner" on folio_docs
  for all using (
    exists (select 1 from folios where folios.id = folio_docs.folio_id and folios.user_id = auth.uid())
  );

-- wishlist: owner only
create policy "owner" on wishlist
  for all using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists folio_days_folio_id_idx   on folio_days(folio_id);
create index if not exists folio_events_day_id_idx   on folio_events(day_id);
create index if not exists folio_events_folio_id_idx on folio_events(folio_id);
create index if not exists folio_docs_folio_id_idx   on folio_docs(folio_id);
create index if not exists wishlist_user_id_idx       on wishlist(user_id);
