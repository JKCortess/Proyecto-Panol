alter table if exists public.request_status_log
  add column if not exists request_code text;

update public.request_status_log l
set request_code = r.request_code
from public.material_requests r
where l.request_id = r.id
  and l.request_code is null;

create index if not exists idx_request_status_log_created_at
  on public.request_status_log (created_at desc);

create index if not exists idx_request_status_log_new_status_created_at
  on public.request_status_log (new_status, created_at desc);

create index if not exists idx_request_status_log_request_code_created_at
  on public.request_status_log (request_code, created_at desc);
