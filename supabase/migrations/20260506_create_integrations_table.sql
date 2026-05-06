create extension if not exists pgcrypto;

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  category text not null default 'other',
  status text not null default 'pending',
  access_token text not null default '',
  refresh_token text not null default '',
  expires_at timestamptz null,
  external_account_id text not null default '',
  external_location_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integrations_business_id_provider_key
  on public.integrations (business_id, provider);

create index if not exists integrations_business_id_idx
  on public.integrations (business_id);

create or replace function public.set_integrations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
before update on public.integrations
for each row
execute function public.set_integrations_updated_at();

alter table public.integrations enable row level security;

drop policy if exists "Owners can view integrations" on public.integrations;
create policy "Owners can view integrations"
on public.integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.business_users bu
    where bu.business_id = integrations.business_id
      and bu.user_id = auth.uid()
      and bu.role = 'owner'
  )
);

drop policy if exists "Owners can create integrations" on public.integrations;
create policy "Owners can create integrations"
on public.integrations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_users bu
    where bu.business_id = integrations.business_id
      and bu.user_id = auth.uid()
      and bu.role = 'owner'
  )
);

drop policy if exists "Owners can update integrations" on public.integrations;
create policy "Owners can update integrations"
on public.integrations
for update
to authenticated
using (
  exists (
    select 1
    from public.business_users bu
    where bu.business_id = integrations.business_id
      and bu.user_id = auth.uid()
      and bu.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.business_users bu
    where bu.business_id = integrations.business_id
      and bu.user_id = auth.uid()
      and bu.role = 'owner'
  )
);

drop policy if exists "Owners can delete integrations" on public.integrations;
create policy "Owners can delete integrations"
on public.integrations
for delete
to authenticated
using (
  exists (
    select 1
    from public.business_users bu
    where bu.business_id = integrations.business_id
      and bu.user_id = auth.uid()
      and bu.role = 'owner'
  )
);
