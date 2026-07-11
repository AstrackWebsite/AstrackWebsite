/**
 * Seed script for the ART Asbestos demo database.
 *
 * Run with:  npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Dates are relative to "today" so the demo always shows a live project,
 * an expired face-fit (M. Singh → BLOCKED), and a DOP cert expiring soon.
 *
 * Idempotent guard: if staff already exist, it skips data seeding (evidence
 * rows are append-only and cannot be deleted). To reseed from scratch, reset
 * the database (e.g. `supabase db reset`) first.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// minimal .env.local loader (no dotenv dependency)
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on the environment */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local."
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── date helpers ───────────────────────────────────────────────────────────
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const days = (n: number) => iso(new Date(Date.now() + n * DAY));
const months = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return iso(d);
};
const at = (dayOffset: number, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.now() + dayOffset * DAY);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

async function ensureAuthUser(email: string, password: string) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already/i.test(error.message)) {
      const { data: list } = await db.auth.admin.listUsers();
      const found = list.users.find((u) => u.email === email);
      return found?.id ?? null;
    }
    throw error;
  }
  return data.user?.id ?? null;
}

async function main() {
  const { count } = await db.from("staff").select("*", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`Staff table already has ${count} rows — skipping data seed.`);
    console.log("Reset the database first if you want to reseed.");
    await seedAuth();
    return;
  }

  // ── Staff (~12 across four roles) ─────────────────────────────────────────
  const validMedical = months(9);
  const validFaceFit = months(6);
  const validMask = months(5);
  const validTraining = months(11);

  const staffRows = [
    // Contracts Managers
    { name: "D. Williams", role: "contracts_manager", contact: "07700 900101", email: "dwilliams@artasbestos.co.uk", cm_training_expiry: months(10) },
    { name: "A. Clarke",   role: "contracts_manager", contact: "07700 900102", email: "aclarke@artasbestos.co.uk",   cm_training_expiry: months(7) },
    // Site Managers
    { name: "S. Khan", role: "site_manager", contact: "07700 900111", email: "skhan@artasbestos.co.uk", smsts_expiry: months(8), asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask },
    { name: "R. Ford", role: "site_manager", contact: "07700 900112", email: "rford@artasbestos.co.uk", smsts_expiry: months(4), asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask },
    // Site Supervisors
    { name: "J. Patel", role: "site_supervisor", contact: "07700 900121", email: "jpatel@artasbestos.co.uk", asbestos_training_expiry: validTraining, medical_expiry: days(20) /* expiring soon */, face_fit_expiry: validFaceFit, mask_service_expiry: validMask, sssts_expiry: months(6) },
    { name: "M. Singh", role: "site_supervisor", contact: "07700 900122", email: "msingh@artasbestos.co.uk", asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: days(-95) /* EXPIRED → BLOCKED */, mask_service_expiry: validMask, sssts_expiry: months(3) },
    { name: "L. Green", role: "site_supervisor", contact: "07700 900123", email: "lgreen@artasbestos.co.uk", asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask },
    { name: "T. Osei",  role: "site_supervisor", contact: "07700 900124", email: "tosei@artasbestos.co.uk",  asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: days(25) /* expiring soon */ },
    // Operatives
    { name: "A. Brown",  role: "operative", contact: "07700 900131", email: "abrown@artasbestos.co.uk",  asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask, years_in_trade: 5 },
    { name: "K. Hughes", role: "operative", contact: "07700 900132", asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask, years_in_trade: 3 },
    { name: "P. Novak",  role: "operative", contact: "07700 900133", asbestos_training_expiry: validTraining, medical_expiry: validMedical, face_fit_expiry: validFaceFit, mask_service_expiry: validMask, years_in_trade: 8 },
    { name: "D. Reid",   role: "operative", contact: "07700 900134", asbestos_training_expiry: validTraining, medical_expiry: days(-40) /* EXPIRED */, face_fit_expiry: validFaceFit, mask_service_expiry: validMask, years_in_trade: 2 },
  ];

  const { data: staff, error: staffErr } = await db.from("staff").insert(staffRows).select();
  if (staffErr) throw staffErr;
  const S = (name: string) => staff!.find((s) => s.name === name)!.id;
  console.log(`Inserted ${staff!.length} staff.`);

  // ── Clients ────────────────────────────────────────────────────────────
  const { data: clients, error: clientErr } = await db
    .from("client")
    .insert([
      { name: "Acme Ltd",         contact: "0161 555 0101", address: "14 Mill Lane, Stockport SK1 2AB", email: "facilities@acme.example" },
      { name: "Bowman Co",        contact: "0161 555 0102", address: "Unit 7, Trafford Park, M17 1AA",   email: "ops@bowman.example" },
      { name: "Bury Council",     contact: "0161 555 0103", address: "Knowsley St, Bury BL9 0SW",         email: "estates@bury.example" },
      { name: "Trafford Estates", contact: "0161 555 0104", address: "Salford M5 3EN",                    email: "admin@trafford.example" },
    ])
    .select();
  if (clientErr) throw clientErr;
  const C = (name: string) => clients!.find((c) => c.name === name)!.id;

  // ── Projects ─────────────────────────────────────────────────────────────
  const { data: projects, error: projErr } = await db
    .from("project")
    .insert([
      {
        reference: "ART-2401", address: "14 Mill Lane, Stockport", classification: "licensed",
        status: "live", start_date: days(-4), end_date: days(6), max_operatives: 6,
        contracts_manager_id: S("D. Williams"), supervisor_id: S("J. Patel"), client_id: C("Acme Ltd"),
        asb5_notification_date: days(-25), contract_value: 32000,
      },
      {
        reference: "ART-2402", address: "Unit 7, Trafford Park", classification: "nnlw",
        status: "setup", start_date: days(3), end_date: days(12), max_operatives: 4,
        contracts_manager_id: S("D. Williams"), supervisor_id: S("M. Singh"), client_id: C("Bowman Co"),
        contract_value: 18500,
      },
      {
        reference: "ART-2403", address: "School Annexe, Bury", classification: "licensed",
        status: "pending", start_date: days(18), end_date: days(30), max_operatives: 8,
        contracts_manager_id: S("A. Clarke"), supervisor_id: S("L. Green"), client_id: C("Bury Council"),
        asb5_notification_date: days(4), contract_value: 47000,
      },
      {
        reference: "ART-2398", address: "Old Depot, Salford", classification: "general",
        status: "completed", start_date: days(-40), end_date: days(-18), max_operatives: 5,
        contracts_manager_id: S("A. Clarke"), supervisor_id: S("T. Osei"), client_id: C("Trafford Estates"),
        contract_value: 9500,
      },
    ])
    .select();
  if (projErr) throw projErr;
  const P = (ref: string) => projects!.find((p) => p.reference === ref)!.id;
  const mill = P("ART-2401");

  // ── Plant ────────────────────────────────────────────────────────────────
  const { data: plant, error: plantErr } = await db
    .from("plant")
    .insert([
      { asset_id: "NPU-014", type: "npu",    name: "Negative Pressure Unit", cert_number: "NPU-C-014", cert_expiry: months(7), test_reading: 1240, latest_service: days(-30), retest_date: months(7) },
      { asset_id: "VAC-022", type: "vacuum", name: "M-Class Vacuum",         cert_number: "VAC-C-022", cert_expiry: months(5), retest_date: months(5) },
      { asset_id: "DCU-003", type: "dcu",    name: "3-Stage DCU",            cert_number: "DCU-C-003", cert_expiry: days(5) /* DOP expiring soon */, dop_test_date: days(5), retest_date: days(5) },
      { asset_id: "VAC-030", type: "vacuum", name: "M-Class Vacuum",         cert_number: "VAC-C-030", cert_expiry: months(9), retest_date: months(9) },
      { asset_id: "SM-002",  type: "smoke_machine", name: "Smoke Machine",   cert_number: "SM-C-002",  cert_expiry: months(6) },
    ])
    .select();
  if (plantErr) throw plantErr;
  const PL = (asset: string) => plant!.find((p) => p.asset_id === asset)!.id;

  // Assign core plant to the live project
  await db.from("project_plant").insert([
    { project_id: mill, plant_id: PL("NPU-014") },
    { project_id: mill, plant_id: PL("VAC-022") },
    { project_id: mill, plant_id: PL("DCU-003") },
  ]);

  // ── Site register (today, live project) ──────────────────────────────────
  await db.from("site_register_entry").insert([
    { project_id: mill, staff_id: S("J. Patel"), entry_date: days(0), check_in: at(0, "07:42") },
    { project_id: mill, staff_id: S("A. Brown"), entry_date: days(0), check_in: at(0, "07:48") },
    { project_id: mill, staff_id: S("K. Hughes"), entry_date: days(0), check_in: at(0, "07:50") },
    { project_id: mill, staff_id: S("M. Singh"), entry_date: days(0), blocked: true, block_reason: "Face fit expired" },
  ]);

  // ── Plant daily checks: start-of-project + today ─────────────────────────
  const checkPlant = ["NPU-014", "VAC-022", "DCU-003"];
  await db.from("plant_daily_check").insert(
    checkPlant.flatMap((a) => [
      { project_id: mill, plant_id: PL(a), check_date: days(-4), passed: true, is_start_of_project: true },
      { project_id: mill, plant_id: PL(a), check_date: days(0), passed: true },
    ])
  );

  // ── Exposure records (a few days on the live project) ────────────────────
  await db.from("exposure_record").insert([
    { project_id: mill, staff_id: S("A. Brown"), entry_date: days(-2), task: "Stripping AIB", asbestos_type: "amosite", shift1_start: "08:00", shift1_end: "12:00", mask_worn: "Sundström SR500", mask_service_expiry_at_time: validMask, hours_exposure: 4, fibre_level: 0.04 },
    { project_id: mill, staff_id: S("A. Brown"), entry_date: days(-2), task: "Bagging", asbestos_type: "amosite", shift2_start: "13:00", shift2_end: "16:30", mask_worn: "Sundström SR500", mask_service_expiry_at_time: validMask, hours_exposure: 3.5, fibre_level: 0.02 },
    { project_id: mill, staff_id: S("K. Hughes"), entry_date: days(-2), task: "Stripping AIB", asbestos_type: "amosite", shift1_start: "08:00", shift1_end: "12:00", mask_worn: "3M Versaflo", mask_service_expiry_at_time: validMask, hours_exposure: 4, fibre_level: 0.05 },
    { project_id: mill, staff_id: S("A. Brown"), entry_date: days(-1), task: "Stripping AIB", asbestos_type: "amosite", shift1_start: "08:00", shift1_end: "11:30", mask_worn: "Sundström SR500", mask_service_expiry_at_time: validMask, hours_exposure: 3.5, fibre_level: 0.03 },
    { project_id: mill, staff_id: S("K. Hughes"), entry_date: days(-1), task: "Decontamination", asbestos_type: "chrysotile", shift1_start: "08:00", shift1_end: "12:00", mask_worn: "3M Versaflo", mask_service_expiry_at_time: validMask, hours_exposure: 4, fibre_level: 0.02 },
  ]);

  // ── Air monitoring ───────────────────────────────────────────────────────
  await db.from("air_monitoring_result").insert([
    { project_id: mill, type: "background", result_fml: 0.005, pass: true, supervisor_id: S("J. Patel"), sampled_on: days(-4) },
    { project_id: mill, type: "leak",       result_fml: 0.008, pass: true, supervisor_id: S("J. Patel"), sampled_on: days(-2) },
  ]);

  console.log("Data seeded.");
  await seedAuth();
}

/** Create the two demo logins and link them to their staff records. */
async function seedAuth() {
  const mgmtId = await ensureAuthUser("admin@artasbestos.co.uk", "Passw0rd!Demo");
  const supId = await ensureAuthUser("jpatel@artasbestos.co.uk", "Passw0rd!Demo");

  const { data: staff } = await db.from("staff").select("id,name,email");
  const williams = staff?.find((s) => s.name === "D. Williams")?.id ?? null;
  const patel = staff?.find((s) => s.name === "J. Patel")?.id ?? null;

  if (mgmtId) await db.from("profiles").upsert({ id: mgmtId, app_role: "admin", staff_id: williams });
  if (supId) await db.from("profiles").upsert({ id: supId, app_role: "site", staff_id: patel });

  console.log("\nDemo logins (password: Passw0rd!Demo):");
  console.log("  Management: admin@artasbestos.co.uk");
  console.log("  Supervisor: jpatel@artasbestos.co.uk");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
