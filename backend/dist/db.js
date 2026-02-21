"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const DB_PATH = path_1.default.join(__dirname, '..', 'health.db');
const db = new better_sqlite3_1.default(DB_PATH);
// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    village TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    vitals TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed'))
  );

  CREATE TABLE IF NOT EXISTS consultation_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    raw_note TEXT NOT NULL,
    structured_summary TEXT,
    follow_up_days INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'patient')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Doctor availability slots
  CREATE TABLE IF NOT EXISTS doctor_availability (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id  INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    is_booked  INTEGER NOT NULL DEFAULT 0
  );

  -- Base vitals per patient (jitter applied at query time to simulate live data)
  CREATE TABLE IF NOT EXISTS patient_vitals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    heart_rate  INTEGER NOT NULL DEFAULT 75,
    spo2        INTEGER NOT NULL DEFAULT 97,
    glucose     INTEGER NOT NULL DEFAULT 100
  );

  -- Migration tracking table
  CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY
  );
`);
// Migration: add user_id to appointments and make patient_id nullable.
// SQLite can't ALTER COLUMN, so we recreate the table once.
const migDone = db.prepare(`SELECT name FROM migrations WHERE name = 'appointments_add_user_id'`).get();
if (!migDone) {
    db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE appointments_new (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      doctor_id  INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK(status IN ('scheduled', 'completed'))
    );

    INSERT INTO appointments_new (id, patient_id, user_id, doctor_id, date, status)
    SELECT id, patient_id, NULL, doctor_id, date, status FROM appointments;

    DROP TABLE appointments;

    ALTER TABLE appointments_new RENAME TO appointments;

    PRAGMA foreign_keys = ON;
  `);
    db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run('appointments_add_user_id');
    console.log('✅ Migration applied: appointments_add_user_id');
}
// Migration: add user_id to patients and make clinical fields nullable
// (needed so self-registered patient users can have a minimal profile row)
const patMigDone = db.prepare(`SELECT name FROM migrations WHERE name = 'patients_add_user_id'`).get();
if (!patMigDone) {
    db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE patients_new (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      age        INTEGER,
      gender     TEXT,
      village    TEXT,
      symptoms   TEXT,
      vitals     TEXT,
      risk_level TEXT NOT NULL DEFAULT 'low'
                   CHECK(risk_level IN ('low', 'medium', 'high')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO patients_new (id, user_id, name, age, gender, village, symptoms, vitals, risk_level, created_at)
    SELECT id, NULL, name, age, gender, village, symptoms, vitals, risk_level, created_at FROM patients;

    DROP TABLE patients;

    ALTER TABLE patients_new RENAME TO patients;

    PRAGMA foreign_keys = ON;
  `);
    db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run('patients_add_user_id');
    console.log('✅ Migration applied: patients_add_user_id');
}
// Migration: add availability_id to appointments
const availMigDone = db.prepare(`SELECT name FROM migrations WHERE name = 'appointments_add_availability_id'`).get();
if (!availMigDone) {
    db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE appointments_avail_new (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
      doctor_id       INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      availability_id INTEGER REFERENCES doctor_availability(id) ON DELETE SET NULL,
      date            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK(status IN ('scheduled', 'completed'))
    );

    INSERT INTO appointments_avail_new (id, patient_id, user_id, doctor_id, date, status)
    SELECT id, patient_id, user_id, doctor_id, date, status FROM appointments;

    DROP TABLE appointments;

    ALTER TABLE appointments_avail_new RENAME TO appointments;

    PRAGMA foreign_keys = ON;
  `);
    db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run('appointments_add_availability_id');
    console.log('✅ Migration applied: appointments_add_availability_id');
}
// Seed initial doctors if none exist
const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get().count;
if (doctorCount === 0) {
    const insert = db.prepare('INSERT INTO doctors (name, specialization) VALUES (?, ?)');
    insert.run('Dr. Priya Sharma', 'General Medicine');
    insert.run('Dr. Ravi Kumar', 'Pediatrics');
    insert.run('Dr. Anita Patel', 'Obstetrics & Gynecology');
    insert.run('Dr. Suresh Rao', 'Emergency Medicine');
}
// Seed sample patients if none exist
const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
if (patientCount === 0) {
    const insert = db.prepare(`INSERT INTO patients (name, age, gender, village, symptoms, vitals, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insert.run('Ramesh Kumar', 45, 'Male', 'Khandwa', 'Chest pain, shortness of breath', 'BP: 160/100, HR: 92, Temp: 98.6F', 'high');
    insert.run('Sunita Devi', 32, 'Female', 'Bharatpur', 'Fever, cough for 3 days', 'BP: 110/70, HR: 80, Temp: 101.2F', 'medium');
    insert.run('Arjun Singh', 8, 'Male', 'Rajpur', 'Stomach ache, vomiting', 'BP: 100/65, HR: 88, Temp: 100.4F', 'medium');
    insert.run('Meena Bai', 60, 'Female', 'Khandwa', 'Joint pain, swelling in knees', 'BP: 130/85, HR: 74, Temp: 98.4F', 'low');
    insert.run('Vijay Yadav', 28, 'Male', 'Nandpur', 'Minor cut on hand', 'BP: 118/76, HR: 70, Temp: 98.6F', 'low');
}
// Seed base vitals for every patient that doesn't have one yet.
// Varied values so the live monitor shows interesting mix of risk levels.
const vitalsBases = {
    high: { hr: 128, spo2: 91, glucose: 195 }, // near-critical
    medium: { hr: 108, spo2: 93, glucose: 155 }, // warning zone
    low: { hr: 78, spo2: 98, glucose: 92 }, // normal
};
const insertVitals = db.prepare('INSERT OR IGNORE INTO patient_vitals (patient_id, heart_rate, spo2, glucose) VALUES (?, ?, ?, ?)');
const patientsForVitals = db.prepare('SELECT id, risk_level FROM patients').all();
for (const p of patientsForVitals) {
    const base = vitalsBases[p.risk_level] ?? vitalsBases['low'];
    insertVitals.run(p.id, base.hr, base.spo2, base.glucose);
}
// Seed default admin user if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
    const hashedPassword = bcryptjs_1.default.hashSync('Admin@1234', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Super Admin', 'admin@ruralcare.com', hashedPassword, 'admin');
    console.log('✅ Default admin seeded: admin@ruralcare.com / Admin@1234');
}
exports.default = db;
