import express from "express";
import axios from "axios";
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const router = express.Router();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

const SUPABASE = createClient(SUPABASE_URL, SUPABASE_API_KEY);

// Endpoint for user login
router.post("/login", async (req, res) => {
    const {email, password} = req.body;

    // 
    console.log(`Attempting login for email: ${email}`);
})

//Endpoint for user signup
router.post("/signup", async (req, res) =>  {
    const {name, email, password} = req.body;

    // Dummy signup logic (replace with real logic)
    console.log(`Attempting signup for email: ${email} with name: ${name}`);
})

export default router;