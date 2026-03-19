-- AI Todo Manager (Supabase) schema
-- PRD 기준: public.users(프로필) + public.todos(할 일) + RLS/Policy

-- 확장(필요 시)
create extension if not exists "pgcrypto";

-- updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) public.users: auth.users(id)와 1:1 프로필 테이블
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- RLS
alter table public.users enable row level security;

-- 정책: 소유자만 읽기/쓰기
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own"
on public.users
for delete
using (auth.uid() = id);

-- 2) public.todos: 사용자(user_id)별 할 일 관리 테이블
-- PRD 필드: id, user_id, title, description, created_date, due_date, priority, category, completed
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  created_date timestamptz not null default now(),
  due_date timestamptz,
  priority text not null check (priority in ('high','medium','low')),
  category text[] not null default '{}'::text[],
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_todos_user_id on public.todos(user_id);
create index if not exists idx_todos_completed on public.todos(completed);
create index if not exists idx_todos_due_date on public.todos(due_date);
create index if not exists idx_todos_priority on public.todos(priority);

drop trigger if exists trg_todos_set_updated_at on public.todos;
create trigger trg_todos_set_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

-- RLS
alter table public.todos enable row level security;

-- 정책: 소유자만 읽기/쓰기
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own"
on public.todos
for select
using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own"
on public.todos
for insert
with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own"
on public.todos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own"
on public.todos
for delete
using (auth.uid() = user_id);

