-- Migration to add upgrade_feedback table
create table if not exists public.upgrade_feedback (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    plan_selected text, -- 'Pro', 'Enterprise'
    payment_method text, -- 'card', 'crypto', 'waitlist'
    crypto_type text, -- 'USDC', 'USDT', 'BTC', 'ETH', 'Other'
    desired_plans jsonb, -- Array of { plan: string, value: string }
    rating integer check (rating >= 1 and rating <= 5),
    comments text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.upgrade_feedback enable row level security;

-- Users can insert their own upgrade feedback
drop policy if exists "Users can insert own upgrade feedback" on public.upgrade_feedback;
create policy "Users can insert own upgrade feedback" on public.upgrade_feedback
    for insert with check (auth.uid() = user_id);

-- Admins can see all upgrade feedback
drop policy if exists "Admins can see upgrade feedback" on public.upgrade_feedback;
create policy "Admins can see upgrade feedback" on public.upgrade_feedback
    for select using (public.is_admin());

-- Users can see their own upgrade feedback
drop policy if exists "Users can see own upgrade feedback" on public.upgrade_feedback;
create policy "Users can see own upgrade feedback" on public.upgrade_feedback
    for select using (auth.uid() = user_id);
