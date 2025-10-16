import conn from "../db_conn/db_conn";
import express from "express";
import cors from "cors"

const app = express();
app.use(cors())
app.use(express.json());

app.post("/verify", async (req, res) => {
  const { idNumber } = req.body;
  console.log("Id number:", idNumber);

    try{
        const sql = "SELECT * FROM patients WHERE id_number = ?"

        const [rows] = await conn.query(sql,[idNumber])

        if((rows as any []).length === 0){
            return res.status(200).json({success: false , message: "Patient Not Found" })
        }
        
        const patient = (rows as any [])[0];

        return res.status(200).json({ success: true , patient})

    }catch(error){
        return res.status(500).json(error)
    }

});

app.listen(8080, () => {
  console.log("Server is Running on Port 8080");
});
