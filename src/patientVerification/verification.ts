import conn from "../db_conn/db_conn";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());


app.post("/verify", async (req, res) => {
  const { idNumber } = req.body;
  console.log("Id number:", idNumber);

  try {
    const sql = "SELECT * FROM patients WHERE id_number = ?";
    const [rows] = await conn.query(sql, [idNumber]);

    if ((rows as any[]).length === 0) {
      return res.status(200).json({ success: false, message: "Patient Not Found" });
    }

    const patient = (rows as any[])[0];
    return res.status(200).json({ success: true, patient });
  } catch (error) {
    console.error("Verify Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

app.get("/medical_history/:patient_id", async (req, res) => {
  const patientId = req.params.patient_id;

  try {
    // Check if patient exists
    const [checkPatient] = await conn.query(
      "SELECT * FROM patients WHERE patient_id = ?",
      [patientId]
    );

    if ((checkPatient as any[]).length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Get medical history records
    const [history] = await conn.query(
      "SELECT * FROM medical_history WHERE patient_id = ?",
      [patientId]
    );

    if ((history as any[]).length === 0) {
      return res.status(200).json({ message: "No medical history found", data: [] });
    }

    return res.status(200).json({
      message: "Medical history retrieved successfully",
      data: history,
    });
  } catch (error) {
    console.error("Fetch Medical History Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server is Running on Port 8080");
});
