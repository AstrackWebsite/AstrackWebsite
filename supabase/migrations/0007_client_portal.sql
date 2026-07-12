-- AsTrack — Client Portal (read-only shareable link per project)
-- A private token grants anonymous read of a safe, curated view of one job.

alter table project add column portal_token   uuid unique default gen_random_uuid();
alter table project add column portal_enabled boolean not null default false;

-- ensure existing rows get a token
update project set portal_token = gen_random_uuid() where portal_token is null;

-- Curated, read-only view returned to anonymous portal visitors. SECURITY
-- DEFINER so it can bypass RLS, but it only ever exposes the single project
-- matching the token, and only when the portal is enabled.
create or replace function get_portal(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when p.portal_enabled then json_build_object(
    'company',        c.name,
    'reference',      p.reference,
    'address',        p.address,
    'status',         p.status,
    'classification', p.classification,
    'start_date',     p.start_date,
    'end_date',       p.end_date,
    'supervisor',     s.name,
    'client',         cl.name,
    'air', coalesce((
      select json_agg(json_build_object(
        'type', a.type, 'result', a.result_fml, 'pass', a.pass, 'date', a.sampled_on
      ) order by a.sampled_on desc)
      from air_monitoring_result a where a.project_id = p.id
    ), '[]'::json)
  ) else null end
  from project p
  join company c on c.id = p.company_id
  left join staff  s  on s.id  = p.supervisor_id
  left join client cl on cl.id = p.client_id
  where p.portal_token = p_token;
$$;

grant execute on function get_portal(uuid) to anon, authenticated;
