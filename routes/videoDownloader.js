import express from "express";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import fs from "fs"

const router = express.Router();

// Determine the correct Python executable path based on OS
const isRender = process.env.RENDER === 'true';

const pythonPath = isRender
    ? 'python3' // on Render (no venv)
    : os.platform() === 'win32'
        ? 'venv\\Scripts\\python.exe'
        : './venv/bin/python';


// Endpoint to stream audio of a YouTube video by its ID
router.get("/stream/:videoId", async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const scriptPath = path.resolve("python/getURL.py");
    const py = spawn(pythonPath, [scriptPath]);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', chunk => (output += chunk));
    py.stderr.on('data', chunk => (errorOutput += chunk));

    py.on('close', () => {
        try {
            const { audio_url, error } = JSON.parse(output);
            if (error) {
                console.error("Python error:", error);
                return res.status(500).json({ error });
            }

            // Choose HTTP or HTTPS
            const client = audio_url.startsWith("https") ? https : http;

            // Stream audio directly
            client.get(audio_url, response => {
                // Copy headers
                res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
                res.setHeader('Transfer-Encoding', 'chunked');

                // Stream directly
                response.pipe(res);
            }).on("error", err => {
                console.error("Streaming error:", err);
                res.status(500).send("Error streaming audio");
            });
        } catch (err) {
            console.error('JSON parse failed. Output was:', output);
            res.status(500).json({ error: 'Invalid JSON from Python' });
        }
    });

    py.stdin.write(JSON.stringify({ url: videoUrl }));
    py.stdin.end();
});


//Endpoint to download and return a MP3 file
router.get("/download/:videoId", async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const scriptPath = path.resolve("python/download.py");
    const py = spawn(pythonPath, [scriptPath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (chunk) => (output += chunk));
    py.stderr.on("data", (chunk) => (errorOutput += chunk));

    py.on("close", () => {
        try {
            const { file_path, error } = JSON.parse(output);

            if (error) {
                console.error("Python error:", error);
                return res.status(500).json({ error });
            }

            if (!fs.existsSync(file_path)) {
                return res.status(500).send("MP3 file not found");
            }

            // Stream the MP3 file to client
            res.setHeader("Content-Type", "audio/mpeg");
            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);

            // Optional: delete temp file after streaming
            fileStream.on("close", () => {
                fs.unlink(file_path, (err) => {
                    if (err) console.error("Failed to delete temp file:", err);
                });
            });
        } catch (err) {
            console.error("Failed to parse Python output:", err);
            res.status(500).send("Server error");
        }
    });

    // Send the video URL to Python script
    py.stdin.write(JSON.stringify({ url: videoUrl }));
    py.stdin.end();
});

export default router;
