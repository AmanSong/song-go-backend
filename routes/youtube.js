import express from "express";
import axios from "axios";
import 'dotenv/config'

const router = express.Router();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// search and return list of videos based on query
router.get("/search", async (req, res) => {
    const { q, maxResults = 1 } = req.query; 
    const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

    if (!q) {
        return res.status(400).json({ error: "Search query 'q' is required" });
    }

    try {
        console.log("Fetching YouTube data for query:", q);
        const response = await axios.get(YOUTUBE_API_URL, {
            params: {
                part: "snippet",
                q: q,
                maxResults: parseInt(maxResults), 
                type: "video",
                key: YOUTUBE_API_KEY,
                videoCategoryId: "10",
            },
        });

        console.log("Sending response:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching YouTube data:", error);
        res.status(500).json({ error: "Failed to fetch YouTube data" });
    }
});

export default router;