-- Migration to add feedback table
create table if not exists public.feedback (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.feedback enable row level security;

-- Users can insert their own feedback
drop policy if exists "Users can insert own feedback" on public.feedback;
create policy "Users can insert own feedback" on public.feedback
    for insert with check (auth.uid() = user_id);

-- Admins can see all feedback
drop policy if exists "Admins can see feedback" on public.feedback;
create policy "Admins can see feedback" on public.feedback
    for select using (public.is_admin());

-- Users can see their own feedback
drop policy if exists "Users can see own feedback" on public.feedback;
create policy "Users can see own feedback" on public.feedback
    for select using (auth.uid() = user_id);
