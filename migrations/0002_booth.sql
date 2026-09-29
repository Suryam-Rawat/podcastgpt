create table if not exists bots (
  id text primary key,
  name text not null,
  host_name text not null,
  system_prompt text not null,
  threshold double precision not null default 0.72,
  namespace text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  bot_id text not null references bots(id) on delete cascade,
  url text not null,
  kind text not null,
  title text,
  status text not null default 'pending',
  detail text,
  chunk_count integer not null default 0,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sources_bot_idx on sources (bot_id);

create table if not exists chunks (
  id text primary key,
  bot_id text not null references bots(id) on delete cascade,
  source_id text references sources(id) on delete cascade,
  video_id text not null default '',
  video_title text not null default '',
  source_url text not null default '',
  origin text not null default 'captions',
  start_sec integer not null default 0,
  end_sec integer not null default 0,
  text text not null,
  token_count integer not null default 0,
  embedding text not null,
  created_at timestamptz not null default now()
);

create index if not exists chunks_bot_idx on chunks (bot_id);

create table if not exists messages (
  id text primary key,
  bot_id text not null references bots(id) on delete cascade,
  role text not null,
  content text not null,
  citations text,
  refused boolean not null default false,
  score double precision,
  created_at timestamptz not null default now()
);

create index if not exists messages_bot_idx on messages (bot_id, created_at);
