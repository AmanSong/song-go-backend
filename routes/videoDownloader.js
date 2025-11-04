import express from "express";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

const router = express.Router();

// Determine the correct Python executable path based on OS
const pythonPath =
    os.platform() === 'win32'
        ? path.join('venv', 'Scripts', 'python.exe')
        : path.join('venv', 'bin', 'python');


// Endpoint to stream audio of a YouTube video by its ID
router.get("/stream/:videoId", async (req, res) => {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const scriptPath = path.resolve('python/stream.py');
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

export default router;
