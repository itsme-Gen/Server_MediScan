import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import conn from "../db_conn/db_conn";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.SECRET_KEY

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const data = req.body;

    //Validation
    if (!data.email || !data.password || !data.firstName || !data.lastName || !data.role || !data.department) {
      return res.status(400).json({ 
        message: "Email, password, first name, last name, role, and department are required" 
      });
    }

    // Check if user already exists
    const checkUserQuery = `SELECT id FROM users WHERE email = ?`;
    const [existingUser] = await conn.query(checkUserQuery, [data.email]);
    
    if ((existingUser as any[]).length > 0) {
      return res.status(409).json({ message: "Invalid Email. Try Another" });
    }

    const hashPassword = await bcrypt.hash(data.password, 10);

    const query = `
      INSERT INTO users 
      (first_name, middle_name, last_name, role, department, license_number, hospital_id, email, phone_number, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.firstName || '',
      data.middleName || '',
      data.lastName || '',
      data.role || '',
      data.department || '',
      data.licenseNumber || '',
      data.hospitalId || '',
      data.email || '',
      data.phoneNumber || '',
      hashPassword,
    ];

    const [result] = await conn.query(query, values);
    res.status(201).json({ 
      message: "User Registered!"
    });
  } catch (error) {
    console.error("Register Error", error);
    
  
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return res.status(409).json({ message: "Invalid Email.Please try another" });
    }
    
    res.status(500).json({ message: "Server Error" });
  }
});

// SIGN IN
app.post("/signin", async (req, res) => {
  const { email, password} = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    const query = `SELECT * FROM users WHERE email = ?`;
    const values = [email];
    const [rows] = await conn.query(query, values);

    if ((rows as any[]).length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user: any = (rows as any[])[0];
    const match = await bcrypt.compare(password, user.password_hash);
    

    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({id:user.id, email:user.email},SECRET_KEY as string,{
      expiresIn: "1h"
    })
    
    res.status(200).json({ 
      message: "Login Successful",
      token: token,
      user:{
        user:user.id
      }
    })
  } catch (error) {
    console.error("Signin Error", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});