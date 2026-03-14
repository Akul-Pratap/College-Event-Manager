-- Sensitive data permissions + CR delegation model
-- Apply in Supabase SQL editor after schema creation.

-- 1) Delegation table: class_incharge (or above) can delegate sensitive writes to CR.
create table if not exists role_delegations (
    id uuid primary key default gen_random_uuid(),
    department_id uuid references departments(id),
    granter_user_id uuid not null references users(id),
    grantee_user_id uuid not null references users(id),
    permission_type text not null check (permission_type in ('sensitive_data_write')),
    active boolean not null default true,
    expires_at timestamptz,
    created_at timestamptz not null default now()
);

alter table role_delegations enable row level security;

-- Granter can manage delegations they create.
drop policy if exists role_delegations_manage_own on role_delegations;
create policy role_delegations_manage_own
on role_delegations
for all
using (
    granter_user_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
)
with check (
    granter_user_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
);

-- 2) Student self-service profile update (non-sensitive).
-- Sensitive fields role, department_id are protected by trigger below.
alter table users enable row level security;

drop policy if exists users_self_read on users;
create policy users_self_read
on users
for select
using (clerk_id = auth.jwt() ->> 'sub');

drop policy if exists users_self_update on users;
create policy users_self_update
on users
for update
using (clerk_id = auth.jwt() ->> 'sub')
with check (clerk_id = auth.jwt() ->> 'sub');

-- Elevated roles can update user profiles in their department.
drop policy if exists users_elevated_update on users;
create policy users_elevated_update
on users
for update
using (
    exists (
        select 1
        from users actor
        where actor.clerk_id = auth.jwt() ->> 'sub'
          and actor.role in ('class_incharge', 'faculty_coordinator', 'hod', 'super_admin')
          and (
            actor.role = 'super_admin'
            or actor.department_id = users.department_id
          )
    )
)
with check (true);

-- Prevent student/CR from changing sensitive profile fields directly.
create or replace function prevent_sensitive_user_field_changes()
returns trigger
language plpgsql
as $$
declare
  actor_role text;
  actor_id uuid;
begin
  select role, id
    into actor_role, actor_id
  from users
  where clerk_id = auth.jwt() ->> 'sub'
  limit 1;

  if actor_role in ('student', 'cr') and actor_id = old.id then
    if new.role is distinct from old.role
       or new.department_id is distinct from old.department_id then
      raise exception 'Not allowed to modify sensitive profile fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_sensitive_user_field_changes on users;
create trigger trg_prevent_sensitive_user_field_changes
before update on users
for each row
execute function prevent_sensitive_user_field_changes();

-- 3) Sensitive tables: only class_incharge+ OR delegated CR can write.
alter table payments enable row level security;
alter table money_collection enable row level security;
alter table duty_leaves enable row level security;

-- Helper condition repeated via policy EXISTS expressions.
-- payments
 drop policy if exists payments_sensitive_write on payments;
create policy payments_sensitive_write
on payments
for all
using (
    exists (
        select 1
        from users actor
        where actor.clerk_id = auth.jwt() ->> 'sub'
          and (
            actor.role in ('class_incharge', 'faculty_coordinator', 'hod', 'super_admin')
            or (
              actor.role = 'cr'
              and exists (
                select 1
                from role_delegations rd
                where rd.grantee_user_id = actor.id
                  and rd.permission_type = 'sensitive_data_write'
                  and rd.active = true
                  and (rd.expires_at is null or rd.expires_at > now())
                  and (rd.department_id is null or rd.department_id = payments.department_id)
              )
            )
          )
    )
)
with check (true);

-- money_collection
 drop policy if exists money_collection_sensitive_write on money_collection;
create policy money_collection_sensitive_write
on money_collection
for all
using (
    exists (
        select 1
        from users actor
        where actor.clerk_id = auth.jwt() ->> 'sub'
          and (
            actor.role in ('class_incharge', 'faculty_coordinator', 'hod', 'super_admin')
            or (
              actor.role = 'cr'
              and exists (
                select 1
                from role_delegations rd
                where rd.grantee_user_id = actor.id
                  and rd.permission_type = 'sensitive_data_write'
                  and rd.active = true
                  and (rd.expires_at is null or rd.expires_at > now())
                  and (rd.department_id is null or rd.department_id = money_collection.department_id)
              )
            )
          )
    )
)
with check (true);

-- duty_leaves
 drop policy if exists duty_leaves_sensitive_write on duty_leaves;
create policy duty_leaves_sensitive_write
on duty_leaves
for all
using (
    exists (
        select 1
        from users actor
        where actor.clerk_id = auth.jwt() ->> 'sub'
          and (
            actor.role in ('class_incharge', 'faculty_coordinator', 'hod', 'super_admin')
            or (
              actor.role = 'cr'
              and exists (
                select 1
                from role_delegations rd
                where rd.grantee_user_id = actor.id
                  and rd.permission_type = 'sensitive_data_write'
                  and rd.active = true
                  and (rd.expires_at is null or rd.expires_at > now())
                  and (rd.department_id is null or rd.department_id = duty_leaves.department_id)
              )
            )
          )
    )
)
with check (true);
