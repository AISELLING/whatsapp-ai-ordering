alter table public.integrations
add column if not exists category text not null default 'other';

update public.integrations
set category = 'other'
where category is null or btrim(category) = '';
