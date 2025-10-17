import express, { Request, Response } from "express";
import cors from "cors";
import conn from "../db_conn/db_conn"; 

const app = express();
app.use(cors());
app.use(express.json());

app.post("/savePatientData", async (req: Request, res: Response) => {
  const payload = req.body ?? {};
  const {
    patient,
    visit,
    vitalSigns,
    medications,
    medicalHistory,
    allergies,
    labResults,
    prescriptions,
  } = payload;

  let connection: any;

  try {
    connection = await conn.getConnection();
    await connection.beginTransaction();

    // --- 1) UPSERT PATIENT ---
    let patientId: number | null = null;

    if (!patient || !patient.id_number) {
      throw new Error("patient object with id_number is required");
    }

    const [existingRows]: any = await connection.execute(
      `SELECT patient_id FROM patients WHERE id_number = ? LIMIT 1`,
      [patient.id_number]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      patientId = existingRows[0].patient_id;

      // Update patient info
      await connection.execute(
        `UPDATE patients 
         SET first_name = ?, middle_name = ?, last_name = ?, date_of_birth = ?, gender = ?, 
             contact_number = ?, email_address = ?, home_address = ?, emergency_contact_number = ? 
         WHERE patient_id = ?`,
        [
          patient.first_name ?? "",
          patient.middle_name ?? "",
          patient.last_name ?? "",
          patient.date_of_birth ?? null,
          patient.gender ?? null,
          patient.contact_number ?? null,
          patient.email_address ?? null,
          patient.home_address ?? null,
          patient.emergency_contact_number ?? null,
          patientId,
        ]
      );
    } else {
      const [patientResult]: any = await connection.execute(
        `INSERT INTO patients 
         (first_name, middle_name, last_name, id_number, date_of_birth, gender, contact_number, email_address, home_address, emergency_contact_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.first_name ?? "",
          patient.middle_name ?? "",
          patient.last_name ?? "",
          patient.id_number,
          patient.date_of_birth ?? null,
          patient.gender ?? null,
          patient.contact_number ?? null,
          patient.email_address ?? null,
          patient.home_address ?? null,
          patient.emergency_contact_number ?? null,
        ]
      );
      patientId = patientResult.insertId;
    }

    if (!patientId) throw new Error("Failed to obtain patient_id");

    // --- 2) INSERT VISIT ---
    // Get provider name from prescriptions array (first item)
    const providerName =
      Array.isArray(prescriptions) && prescriptions.length > 0
        ? prescriptions[0].prescribing_provider ?? "Unknown"
        : "Unknown";

    const [visitResult]: any = await connection.execute(
      `INSERT INTO visits (patient_id, visit_date, reason_for_visit, provider_name)
       VALUES (?, NOW(), ?, ?)`,
      [patientId, visit?.reason_for_visit ?? "N/A", providerName]
    );

    const visitId = visitResult.insertId;

    // --- 3) INSERT VITAL SIGNS ---
    if (vitalSigns) {
      await connection.execute(
        `INSERT INTO vital_signs (visit_id, patient_id, body_temperature, heart_pulse, respiratory_rate, blood_pressure, date_recorded)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          visitId,
          patientId,
          vitalSigns.body_temperature ?? null,
          vitalSigns.heart_pulse ?? null,
          vitalSigns.respiratory_rate ?? null,
          vitalSigns.blood_pressure ?? null,
        ]
      );
    }

    // Helper to handle arrays safely
    const safeArray = (x: any) => (Array.isArray(x) ? x : []);

    // --- 4) MEDICATIONS ---
    for (const med of safeArray(medications)) {
      await connection.execute(
        `INSERT INTO medications (patient_id, medication_name, start_date, dosage, frequency)
         VALUES (?, ?, ?, ?, ?)`,
        [
          patientId,
          med.medication_name ?? null,
          med.start_date ?? null,
          med.dosage ?? null,
          med.frequency ?? null,
        ]
      );
    }

    // --- 5) MEDICAL HISTORY ---
    for (const mh of safeArray(medicalHistory)) {
      await connection.execute(
        `INSERT INTO medical_history (patient_id, condition_type, condition_name, diagnosis_date, severity, status, resolution_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          mh.condition_type ?? null,
          mh.condition_name ?? null,
          mh.diagnosis_date ?? null,
          mh.severity ?? null,
          mh.status ?? null,
          mh.resolution_date ?? null,
        ]
      );
    }

    // --- 6) ALLERGIES ---
    for (const al of safeArray(allergies)) {
      await connection.execute(
        `INSERT INTO allergies (patient_id, allergen_name, allergy_type, reaction, severity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          patientId,
          al.allergen_name ?? null,
          al.allergy_type ?? null,
          al.reaction ?? null,
          al.severity ?? null,
        ]
      );
    }

    // --- 7) LAB RESULTS ---
    for (const lab of safeArray(labResults)) {
      await connection.execute(
        `INSERT INTO lab_results (patient_id, visit_id, test_name, test_date, test_result, reference_range, abnormal_flag)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          visitId,
          lab.test_name ?? null,
          lab.test_date ?? null,
          lab.test_result ?? null,
          lab.reference_range ?? null,
          lab.abnormal_flag ?? null,
        ]
      );
    }

    // --- 8) PRESCRIPTIONS ---
    for (const p of safeArray(prescriptions)) {
      await connection.execute(
        `INSERT INTO prescriptions (patient_id, visit_id, medication_name, dosage, quantity, frequency, date_prescribed, prescribing_provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          visitId,
          p.medication_name ?? null,
          p.dosage ?? null,
          p.quantity ?? null,
          p.frequency ?? null,
          p.date_prescribed ?? null,
          p.prescribing_provider ?? providerName, // fallback to visit provider
        ]
      );
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "✅ Patient and related records saved successfully",
      patientId,
      visitId,
      providerName,
    });

  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr);
      }
    }
    console.error("SavePatientData error:", err);
    res.status(500).json({
      success: false,
      message: err.message ?? "Server error",
      error: err,
    });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.warn("Connection release warning:", releaseErr);
      }
    }
  }
});

const PORT = 9090;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on ${PORT}`);
});
