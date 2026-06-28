import { Client } from "pg";
import { loadEnvFile } from "./utils.mjs";

loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.SHIN_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing SHIN_DATABASE_URL.");
}

const client = new Client({ connectionString });

await client.connect();

try {
  await client.query("ALTER TABLE patient ADD COLUMN IF NOT EXISTS assigned_doctor_id BIGINT");
  const labExists = await client.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'lab'
    LIMIT 1
  `);

  if (labExists.rowCount) {
    await client.query(`
      WITH latest_lab_request AS (
        SELECT DISTINCT ON (lab.patient)
          lab.patient,
          NULLIF(regexp_replace(lab.doctor, '\\D', '', 'g'), '')::bigint AS doctor_id,
          btrim(COALESCE(lab.doctor, '')) AS doctor_value
        FROM lab
        WHERE lab.doctor IS NOT NULL
          AND btrim(lab.doctor) <> ''
        ORDER BY lab.patient, lab.date_string DESC, lab.id DESC
      )
      UPDATE patient
      SET assigned_doctor_id = CASE
        WHEN latest_lab_request.doctor_value = 'self_request' THEN NULL
        ELSE latest_lab_request.doctor_id
      END
      FROM latest_lab_request
      WHERE patient.id::text = latest_lab_request.patient
        AND (
          patient.assigned_doctor_id IS DISTINCT FROM CASE
            WHEN latest_lab_request.doctor_value = 'self_request' THEN NULL
            ELSE latest_lab_request.doctor_id
          END
        );
    `);
  }
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'patient'
          AND constraint_name = 'patient_assigned_doctor_id_fkey'
      ) THEN
        ALTER TABLE patient
          ADD CONSTRAINT patient_assigned_doctor_id_fkey
          FOREIGN KEY (assigned_doctor_id) REFERENCES doctor(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await client.query("CREATE INDEX IF NOT EXISTS patient_assigned_doctor_id_idx ON patient (assigned_doctor_id)");
  console.log("Applied patient.assigned_doctor_id migration");
} finally {
  await client.end();
}
