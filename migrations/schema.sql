-- BLUEPRINTS MANAGER COMPLETE SCHEMA (with RBAC)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (RBAC)
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text,
    role text not null default 'user' check (role in ('user', 'admin_read', 'super_admin')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
    for select using (true);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
    for update using (auth.uid() = id);

-- 2. Projects table
create table if not exists public.projects (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    tier text not null default 'free', -- 'free', 'pro', 'enterprise'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Runtimes table
create table if not exists public.runtimes (
    id uuid default uuid_generate_v4() primary key,
    name text unique not null,
    eliza_api_url text not null,
    auth_token text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Agents table
create table if not exists public.agents (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    name text not null,
    version text default 'latest',
    framework text default 'eliza', -- 'eliza', 'openclaw'
    template_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Agent Desired State
create table if not exists public.agent_desired_state (
    agent_id uuid references public.agents(id) on delete cascade primary key,
    enabled boolean default false,
    config jsonb not null default '{}'::jsonb,
    purge_at timestamp with time zone,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Agent Actual State
create table if not exists public.agent_actual_state (
    agent_id uuid references public.agents(id) on delete cascade primary key,
    status text default 'stopped',
    last_sync timestamp with time zone,
    runtime_id uuid references public.runtimes(id) on delete set null,
    endpoint_url text,
    error_message text
);

-- 7. Agent Conversations
create table if not exists public.agent_conversations (
    id uuid default uuid_generate_v4() primary key,
    agent_id uuid references public.agents(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    sender text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Enable RLS for all tables
alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.agent_desired_state enable row level security;
alter table public.agent_actual_state enable row level security;
alter table public.runtimes enable row level security;
alter table public.agent_conversations enable row level security;

-- 9. RBAC Helper Function
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    select role in ('admin_read', 'super_admin')
    from public.profiles
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 10. Policies

-- Projects: Owner or Admin
drop policy if exists "Users and Admins can see projects" on public.projects;
create policy "Users and Admins can see projects" on public.projects
    for all using (auth.uid() = user_id or public.is_admin());

-- Agents: Project Owner or Admin
drop policy if exists "Users and Admins can see agents" on public.agents;
create policy "Users and Admins can see agents" on public.agents
    for all using (
        exists (
            select 1 from public.projects
            where public.projects.id = public.agents.project_id
            and (public.projects.user_id = auth.uid() or public.is_admin())
        )
    );

-- Desired State
drop policy if exists "Users and Admins can see desired state" on public.agent_desired_state;
create policy "Users and Admins can see desired state" on public.agent_desired_state
    for all using (
        exists (
            select 1 from public.agents
            join public.projects on public.projects.id = public.agents.project_id
            where public.agents.id = public.agent_desired_state.agent_id
            and (public.projects.user_id = auth.uid() or public.is_admin())
        )
    );

-- Actual State
drop policy if exists "Users and Admins can see actual state" on public.agent_actual_state;
create policy "Users and Admins can see actual state" on public.agent_actual_state
    for all using (
        exists (
            select 1 from public.agents
            join public.projects on public.projects.id = public.agents.project_id
            where public.agents.id = public.agent_actual_state.agent_id
            and (public.projects.user_id = auth.uid() or public.is_admin())
        )
    );

-- Conversations
drop policy if exists "Users and Admins can see conversations" on public.agent_conversations;
create policy "Users and Admins can see conversations" on public.agent_conversations
    for all using (user_id = auth.uid() or public.is_admin());

-- Runtimes
drop policy if exists "Admins manage runtimes" on public.runtimes;
create policy "Admins manage runtimes" on public.runtimes
    for all using (public.is_admin());

drop policy if exists "Users see runtimes" on public.runtimes;
create policy "Users see runtimes" on public.runtimes
    for select using (true);

-- 11. Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'user');
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 12. Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'agent_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
    END IF;
END $$;
