import conn from "../db_conn/db_conn";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/sentData", async (req, res) => {
  const saveData = req.body;

  const {
    formData,
    contact,
    reasonForVisit,
    vitalSigns,
    medications,
    medicalHistory,
    allergies,
    labResults,
    prescriptions
  } = saveData;

  console.log("SaveData:", saveData);

});

app.listen(9090, () => {
  console.log("Server is Running on Port 9090");
});
