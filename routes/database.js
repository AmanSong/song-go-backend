import express from "express";
import multer from "multer";
import SUPABASE from "./clients/supabaseClient.js";
import 'dotenv/config'
import crypto from 'crypto'

const router = express.Router();

// Store files in memory buffer so we can upload to Supabase
const upload = multer({ storage: multer.memoryStorage() });


function sanitizeFileName(name) {
    // Extract extension
    const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";
    const base = name.replace(ext, "");

    const safeBase = base
        .normalize("NFKD")
        .replace(/[^\w.-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    const safeExt = ext.replace(/[^\w.]+/g, "");

    return safeBase + safeExt;
}

// Generate file hash
function generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

router.post("/backup", upload.array("files"), async (req, res) => {
    try {
        const { userId } = req.body;
        const files = req.files;

        if (!userId) {
            return res.status(400).json({ error: "User ID required" });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const uploadedFiles = [];
        const skippedFiles = [];

        for (const file of files) {
            // Generate unique hash for this file
            const fileHash = generateFileHash(file.buffer);

            // Check if file already exists for this user
            const { data: existingFiles } = await SUPABASE
                .from("music_backup")
                .select("storage_path, file_name")
                .eq("auth_id", userId)
                .eq("file_hash", fileHash)
                .limit(1);

            if (existingFiles && existingFiles.length > 0) {
                // File already backed up - skip upload
                skippedFiles.push({
                    fileName: file.originalname,
                    supabasePath: existingFiles[0].storage_path,
                    existingName: existingFiles[0].file_name,
                    message: "Already backed up"
                });
                continue;
            }

            // File is new - upload with timestamp
            const supabasePath = `${userId}/${Date.now()}_${sanitizeFileName(file.originalname)}`;

            const { error: uploadError } = await SUPABASE.storage
                .from("music_storage")
                .upload(supabasePath, file.buffer, {
                    contentType: file.mimetype,
                });

            if (uploadError) {
                console.error(uploadError);
                return res.status(500).json({ error: "Supabase upload failed" });
            }

            uploadedFiles.push({
                fileName: file.originalname,
                supabasePath,
                fileHash,
            });
        }

        // Save metadata to database (only for new files)
        if (uploadedFiles.length > 0) {
            const { error: dbError } = await SUPABASE
                .from("music_backup")
                .insert(
                    uploadedFiles.map((f) => ({
                        auth_id: userId,
                        file_name: f.fileName,
                        storage_path: f.supabasePath,
                        file_hash: f.fileHash,
                    }))
                );

            if (dbError) {
                console.error(dbError);
                return res.status(500).json({ error: "Database insert failed" });
            }
        }

        res.json({
            success: true,
            uploaded: uploadedFiles.length,
            skipped: skippedFiles.length,
            uploadedFiles,
            skippedFiles
        });

    } catch (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


router.get("/retrieve", async (req, res) => {
    try {
        const { userId } = req.query;

        // get paths from database
        const { data: userFiles, error: dbError } = await SUPABASE
            .from("music_backup")
            .select("id, file_name, storage_path")
            .eq("auth_id", userId)

        if (dbError) throw dbError;

        // get signed urls from storage
        const filesWithUrls = await Promise.all(
            userFiles.map(async (file) => {
                const { data: signedUrl } = await SUPABASE.storage
                    .from("music_storage")
                    .createSignedUrl(file.storage_path, 3600);

                return {
                    ...file,
                    downloadUrl: signedUrl?.signedUrl,
                    // Optional: Public URL if bucket is public
                    publicUrl: SUPABASE.storage
                        .from("music_storage")
                        .getPublicUrl(file.storage_path).data.publicUrl
                };
            })
        );

        res.json({ success: true, files: filesWithUrls });

    } catch (error) {
        console.error('Retrieve error:', error);
        res.status(500).json({ error: 'Failed to retrieve files' });
    }
});

export default router;