-- Create a table for managing material requests
create table if not exists public.material_requests (
  id uuid default gen_random_uuid() primary key,
  request_code text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  area text not null check (area in ('Mantención', 'SADEMA', 'Packing', 'Frío', 'Administración', 'Otro')),
  items_detail jsonb not null, -- Stores array of { item_name: string, quantity: number, details: string }
  status text not null default 'Pendiente' check (status in ('Pendiente', 'Aprobado', 'Rechazado', 'Entregado', 'Parcialmente Entregado')),
  delivery_date timestamptz,
  delivered_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.material_requests enable row level security;

-- Policy: Users can view their own requests
create policy "Users can view own requests"
  on public.material_requests for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own requests
create policy "Users can insert own requests"
  on public.material_requests for insert
  with check (auth.uid() = user_id);

-- Policy: Admins/Pañoleros (configured via role or specific email for now, simpler: allow read all for authenticated if we had roles)
-- For this MVP, let's allow all authenticated users to view for simplicity of the admin dashboard, 
-- or ideally we'd have a 'panolero' role. I'll add a policy for specific emails or just allow all for now and filter in UI.
-- A better approach for this prompt is to allow Service Role to manage everything (which Server Actions use) 
-- and users to see only theirs.
-- The admin interface will strictly use Service Role in the Server Actions/Server Components, 
-- but client-side fetching needs policies.
-- Let's stick to Server Actions mainly for security so RLS can be strict.

-- Function to handle status updates?
-- We'll handle logic in the application layer for now.
