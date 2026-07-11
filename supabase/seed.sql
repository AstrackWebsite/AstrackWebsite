-- ART Asbestos — browser-runnable demo seed (data only).
--
-- HOW TO USE (all in the Supabase dashboard, no local tools):
--   1. SQL Editor → run migrations/0001_schema.sql, then 0002_rls.sql
--   2. SQL Editor → run THIS file
--   3. Create a login: Authentication → Users → Add user (email + password,
--      tick "Auto Confirm"). Then run the linking SQL at the bottom of this
--      file to make that user an admin.
--
-- Dates are relative to today, so the demo always shows a live project,
-- an expired face-fit (M. Singh → BLOCKED) and a DOP cert expiring soon.
-- Safe-guard: aborts if data already exists (reset the DB to reseed).

begin;

do $$
begin
  if (select count(*) from staff) > 0 then
    raise exception 'Seed skipped: staff already present. Reset the database to reseed.';
  end if;
end $$;

-- ── Staff (12) ──────────────────────────────────────────────────────────────
insert into staff (name, role, contact, email, asbestos_training_expiry, medical_expiry,
                   face_fit_expiry, mask_service_expiry, smsts_expiry, sssts_expiry,
                   cm_training_expiry, years_in_trade) values
  ('D. Williams','contracts_manager','07700 900101','dwilliams@artasbestos.co.uk',
     null,null,null,null,null,null,(current_date + interval '10 months')::date,null),
  ('A. Clarke','contracts_manager','07700 900102','aclarke@artasbestos.co.uk',
     null,null,null,null,null,null,(current_date + interval '7 months')::date,null),
  ('S. Khan','site_manager','07700 900111','skhan@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,
     (current_date + interval '8 months')::date,null,null,null),
  ('R. Ford','site_manager','07700 900112','rford@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,
     (current_date + interval '4 months')::date,null,null,null),
  ('J. Patel','site_supervisor','07700 900121','jpatel@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '20 days')::date, -- medical expiring soon
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,
     null,(current_date + interval '6 months')::date,null,null),
  ('M. Singh','site_supervisor','07700 900122','msingh@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date - interval '95 days')::date, -- FACE FIT EXPIRED → BLOCKED
     (current_date + interval '5 months')::date,null,(current_date + interval '3 months')::date,null,null),
  ('L. Green','site_supervisor','07700 900123','lgreen@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,null,null,null,null),
  ('T. Osei','site_supervisor','07700 900124','tosei@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '25 days')::date, -- mask expiring soon
     null,null,null,null),
  ('A. Brown','operative','07700 900131','abrown@artasbestos.co.uk',
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,null,null,null,5),
  ('K. Hughes','operative','07700 900132',null,
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,null,null,null,3),
  ('P. Novak','operative','07700 900133',null,
     (current_date + interval '11 months')::date,(current_date + interval '9 months')::date,
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,null,null,null,8),
  ('D. Reid','operative','07700 900134',null,
     (current_date + interval '11 months')::date,(current_date - interval '40 days')::date, -- medical EXPIRED
     (current_date + interval '6 months')::date,(current_date + interval '5 months')::date,null,null,null,2);

-- ── Clients ────────────────────────────────────────────────────────────────
insert into client (name, contact, address, email) values
  ('Acme Ltd','0161 555 0101','14 Mill Lane, Stockport SK1 2AB','facilities@acme.example'),
  ('Bowman Co','0161 555 0102','Unit 7, Trafford Park, M17 1AA','ops@bowman.example'),
  ('Bury Council','0161 555 0103','Knowsley St, Bury BL9 0SW','estates@bury.example'),
  ('Trafford Estates','0161 555 0104','Salford M5 3EN','admin@trafford.example');

-- ── Projects ───────────────────────────────────────────────────────────────
insert into project (reference, address, classification, status, start_date, end_date,
                     max_operatives, contracts_manager_id, supervisor_id, client_id,
                     asb5_notification_date, contract_value) values
  ('ART-2401','14 Mill Lane, Stockport','licensed','live',
     (current_date - interval '4 days')::date,(current_date + interval '6 days')::date,6,
     (select id from staff where name='D. Williams'),(select id from staff where name='J. Patel'),
     (select id from client where name='Acme Ltd'),(current_date - interval '25 days')::date,32000),
  ('ART-2402','Unit 7, Trafford Park','nnlw','setup',
     (current_date + interval '3 days')::date,(current_date + interval '12 days')::date,4,
     (select id from staff where name='D. Williams'),(select id from staff where name='M. Singh'),
     (select id from client where name='Bowman Co'),null,18500),
  ('ART-2403','School Annexe, Bury','licensed','pending',
     (current_date + interval '18 days')::date,(current_date + interval '30 days')::date,8,
     (select id from staff where name='A. Clarke'),(select id from staff where name='L. Green'),
     (select id from client where name='Bury Council'),(current_date + interval '4 days')::date,47000),
  ('ART-2398','Old Depot, Salford','general','completed',
     (current_date - interval '40 days')::date,(current_date - interval '18 days')::date,5,
     (select id from staff where name='A. Clarke'),(select id from staff where name='T. Osei'),
     (select id from client where name='Trafford Estates'),null,9500);

-- ── Plant ──────────────────────────────────────────────────────────────────
insert into plant (asset_id, type, name, cert_number, cert_expiry, test_reading,
                   latest_service, retest_date, dop_test_date) values
  ('NPU-014','npu','Negative Pressure Unit','NPU-C-014',(current_date + interval '7 months')::date,
     1240,(current_date - interval '30 days')::date,(current_date + interval '7 months')::date,null),
  ('VAC-022','vacuum','M-Class Vacuum','VAC-C-022',(current_date + interval '5 months')::date,
     null,null,(current_date + interval '5 months')::date,null),
  ('DCU-003','dcu','3-Stage DCU','DCU-C-003',(current_date + interval '5 days')::date, -- DOP expiring soon
     null,null,(current_date + interval '5 days')::date,(current_date + interval '5 days')::date),
  ('VAC-030','vacuum','M-Class Vacuum','VAC-C-030',(current_date + interval '9 months')::date,
     null,null,(current_date + interval '9 months')::date,null),
  ('SM-002','smoke_machine','Smoke Machine','SM-C-002',(current_date + interval '6 months')::date,
     null,null,null,null);

-- Assign core plant to the live project
insert into project_plant (project_id, plant_id)
select (select id from project where reference='ART-2401'), id
from plant where asset_id in ('NPU-014','VAC-022','DCU-003');

-- ── Site register (today, live project) ─────────────────────────────────────
insert into site_register_entry (project_id, staff_id, entry_date, check_in, blocked, block_reason)
values
  ((select id from project where reference='ART-2401'),(select id from staff where name='J. Patel'),
     current_date,(current_date + time '07:42')::timestamptz,false,null),
  ((select id from project where reference='ART-2401'),(select id from staff where name='A. Brown'),
     current_date,(current_date + time '07:48')::timestamptz,false,null),
  ((select id from project where reference='ART-2401'),(select id from staff where name='K. Hughes'),
     current_date,(current_date + time '07:50')::timestamptz,false,null),
  ((select id from project where reference='ART-2401'),(select id from staff where name='M. Singh'),
     current_date,null,true,'Face fit expired');

-- ── Plant daily checks: start-of-project + today ────────────────────────────
insert into plant_daily_check (project_id, plant_id, check_date, passed, is_start_of_project)
select (select id from project where reference='ART-2401'), p.id,
       (current_date - interval '4 days')::date, true, true
from plant p where p.asset_id in ('NPU-014','VAC-022','DCU-003');

insert into plant_daily_check (project_id, plant_id, check_date, passed, is_start_of_project)
select (select id from project where reference='ART-2401'), p.id, current_date, true, false
from plant p where p.asset_id in ('NPU-014','VAC-022','DCU-003');

-- ── Exposure records (last two days on the live project) ────────────────────
insert into exposure_record (project_id, staff_id, entry_date, task, asbestos_type,
                             shift1_start, shift1_end, shift2_start, shift2_end,
                             mask_worn, mask_service_expiry_at_time, hours_exposure, fibre_level)
values
  ((select id from project where reference='ART-2401'),(select id from staff where name='A. Brown'),
     (current_date - interval '2 days')::date,'Stripping AIB','amosite','08:00','12:00',null,null,
     'Sundström SR500',(current_date + interval '5 months')::date,4,0.04),
  ((select id from project where reference='ART-2401'),(select id from staff where name='A. Brown'),
     (current_date - interval '2 days')::date,'Bagging','amosite',null,null,'13:00','16:30',
     'Sundström SR500',(current_date + interval '5 months')::date,3.5,0.02),
  ((select id from project where reference='ART-2401'),(select id from staff where name='K. Hughes'),
     (current_date - interval '2 days')::date,'Stripping AIB','amosite','08:00','12:00',null,null,
     '3M Versaflo',(current_date + interval '5 months')::date,4,0.05),
  ((select id from project where reference='ART-2401'),(select id from staff where name='A. Brown'),
     (current_date - interval '1 days')::date,'Stripping AIB','amosite','08:00','11:30',null,null,
     'Sundström SR500',(current_date + interval '5 months')::date,3.5,0.03),
  ((select id from project where reference='ART-2401'),(select id from staff where name='K. Hughes'),
     (current_date - interval '1 days')::date,'Decontamination','chrysotile','08:00','12:00',null,null,
     '3M Versaflo',(current_date + interval '5 months')::date,4,0.02);

-- ── Air monitoring ──────────────────────────────────────────────────────────
insert into air_monitoring_result (project_id, type, result_fml, pass, supervisor_id, sampled_on)
values
  ((select id from project where reference='ART-2401'),'background',0.005,true,
     (select id from staff where name='J. Patel'),(current_date - interval '4 days')::date),
  ((select id from project where reference='ART-2401'),'leak',0.008,true,
     (select id from staff where name='J. Patel'),(current_date - interval '2 days')::date);

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- AFTER creating a login user (Authentication → Users → Add user), link it as
-- an admin so you can add/edit staff & projects. Replace the email below:
--
--   insert into profiles (id, app_role, staff_id)
--   select u.id, 'admin', (select id from staff where name = 'D. Williams')
--   from auth.users u
--   where u.email = 'YOUR-LOGIN-EMAIL@example.com'
--   on conflict (id) do update set app_role = 'admin';
--
-- A user with no profile row still works but is treated as a site user
-- (can capture data, cannot edit project-level data).
