import express from "express";
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import SUPABASE from "../routes/clients/supabaseClient.js";

const router = express.Router();

// Endpoint for user login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await SUPABASE.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const user = data.user;

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                displayName: user.user_metadata?.displayName || null
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.user_metadata?.displayName || null
            }
        });

    } catch (err) {
        return res.status(500).json({ error: "Internal server error" });
    }
});


//Endpoint for user signup
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }

        const { data, error } = await SUPABASE.auth.signUp({
            email,
            password,
            options: {
                data: { displayName: name }
            }
        });

        if (error) {
            console.error("Error signing up: ", error.message);
            return res.status(400).json({ error: error.message });
        }

        const { error: userError } = await SUPABASE
            .from('users')
            .insert({
                auth_id: data.user.id,
                name: name,
                email: email,
                created_at: new Date().toISOString()
            });

        if (userError) {
            console.error("Error creating profile: ", userError.message);
            return res.status(400).json({ error: "Profile creation failed" });
        }

        // Success response
        console.log("User created:", data.user);
        return res.status(201).json({
            data: {
                user: data.user,
                session: data.session
            },
            error: null
        });


    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

//Endpoint to get session
router.get("/session", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.json({ isAuthenticated: false, user: null });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return res.json({
            isAuthenticated: true,
            user: {
                id: decoded.id,
                email: decoded.email,
                displayName: decoded.displayName
            }
        });

    } catch (err) {
        console.log("JWT error:", err);
        return res.json({ isAuthenticated: false, user: null });
    }
});


export default router;