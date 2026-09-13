-- AquaFlow AI production target schema (PostgreSQL)
-- This is a deployment target, not a claim that the hackathon JSON store already uses PostgreSQL.

create extension if not exists pgcrypto;

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'municipality',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  external_subject text not null,
  email text,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organisation_id, external_subject)
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  name text not null,
  permissions jsonb not null default '[]'::jsonb,
  unique (organisation_id, name)
);

create table if not exists user_roles (
  user_id uuid references users(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  name text not null,
  status text not null default 'active',
  owner text,
  manager text,
  baseline_nrw_percent numeric(8,3),
  target_nrw_percent numeric(8,3),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  programme_id uuid references programmes(id),
  name text not null,
  owner text not null,
  status text not null,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  risk text,
  budget numeric(18,2) not null default 0,
  actual_expenditure numeric(18,2) not null default 0,
  next_milestone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  status text not null default 'not-started',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  due_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id),
  name text not null,
  owner text,
  priority text,
  status text not null default 'todo',
  due_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  name text not null,
  ward text,
  geometry jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  zone_id uuid references zones(id),
  name text not null,
  type text not null,
  condition text,
  criticality text,
  geometry jsonb,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  zone_id uuid references zones(id),
  asset_id uuid references assets(id),
  category text not null,
  severity text not null,
  status text not null,
  estimated_loss_kl_per_day numeric(18,3),
  population_affected integer,
  critical_facility_affected boolean not null default false,
  assigned_team text,
  detected_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  incident_id uuid references incidents(id),
  project_id uuid references projects(id),
  description text not null,
  priority text,
  assigned_team text,
  contractor_id uuid,
  status text not null,
  sla_hours integer,
  estimated_cost numeric(18,2),
  actual_cost numeric(18,2),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  verified_at timestamptz
);

create table if not exists meters (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  zone_id uuid references zones(id),
  account_reference text not null,
  status text,
  current_reading numeric(18,3),
  average_consumption_kl numeric(18,3),
  current_consumption_kl numeric(18,3),
  last_read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists nrw_observations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  zone_id uuid references zones(id),
  period_start date not null,
  period_end date not null,
  system_input_volume_kl numeric(18,3),
  billed_authorised_consumption_kl numeric(18,3),
  unbilled_authorised_consumption_kl numeric(18,3),
  apparent_losses_kl numeric(18,3),
  real_losses_kl numeric(18,3),
  methodology text,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  name text not null,
  mime_type text,
  storage_key text not null,
  sha256 text,
  record_type text,
  record_id text,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  subject text not null,
  record_type text not null,
  record_id text not null,
  status text not null default 'pending',
  requested_by uuid references users(id),
  decided_by uuid references users(id),
  decision_comment text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  actor_id uuid references users(id),
  actor_label text,
  action text not null,
  record_type text,
  record_id text,
  correlation_id uuid,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_org on projects(organisation_id);
create index if not exists idx_incidents_org_status on incidents(organisation_id,status);
create index if not exists idx_work_orders_org_status on work_orders(organisation_id,status);
create index if not exists idx_assets_org_zone on assets(organisation_id,zone_id);
create index if not exists idx_meters_org_zone on meters(organisation_id,zone_id);
create index if not exists idx_audit_org_created on audit_events(organisation_id,created_at desc);

-- Production application queries must always scope by organisation_id.
-- Consider PostgreSQL Row Level Security in deployment as an additional defence-in-depth layer.
