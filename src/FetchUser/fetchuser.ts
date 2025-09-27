import conn from "../db_conn/db_conn";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/users/:user_id", async (req, res) => {
  const userId = req.params.user_id;

  try {
    const query = `SELECT * FROM users WHERE user_id = ?`;
    const values = [userId];
    const [rows] = await conn.query(query, values);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = (rows as any[])[0];
    res.status(200).json({ user });
  } catch (error) {
    console.error("Fetch User Error", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.listen(8000,()=>{
    console.log('Server is Running to port 8000')
})
