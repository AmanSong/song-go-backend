import express from "express";
import multer from "multer";
import SUPABASE from "./clients/supabaseClient.js";
import 'dotenv/config'

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

        // store music in supabase storage
        const uploadedFiles = [];
        for (const file of files) {
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
            });
        }

        // Save metadata to database
        const { error: dbError } = await SUPABASE
            .from("music_backup")
            .insert(
                uploadedFiles.map((f) => ({
                    auth_id: userId,
                    file_name: f.fileName,
                    storage_path: f.supabasePath,
                }))
            );

        if (dbError) {
            console.error(dbError);
            return res.status(500).json({ error: "Database insert failed" });
        }

        res.json({ success: true, uploadedFiles });

    } catch (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


// AI template code (need to look at it again)

// /**
//  * GET /restore/list?userId=...
//  * Returns the saved metadata for the user.
//  */
// router.get("/list", async (req, res) => {
//     try {
//         const { userId } = req.query;
//         if (!userId) return res.status(400).json({ error: "userId required" });

//         const { data, error } = await supabase
//             .from("music_backup")
//             .select("id, user_id, file_name, storage_path, created_at")
//             .eq("user_id", userId)
//             .order("created_at", { ascending: false });

//         if (error) {
//             console.error("DB read error:", error);
//             return res.status(500).json({ error: "Database read error" });
//         }

//         res.json({ files: data });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// /**
//  * POST /restore/url
//  * Body: { storagePath: string, expiresInSeconds?: number }
//  * Returns a signed URL for direct download from Supabase Storage.
//  */
// router.post("/url", async (req, res) => {
//     try {
//         const { storagePath, expiresInSeconds } = req.body;
//         if (!storagePath) return res.status(400).json({ error: "storagePath required" });

//         // default expiry e.g. 1 hour
//         const expires = typeof expiresInSeconds === "number" ? expiresInSeconds : 60 * 60;

//         const { data, error } = await supabase.storage
//             .from(BUCKET)
//             .createSignedUrl(storagePath, expires);

//         if (error) {
//             console.error("createSignedUrl error:", error);
//             return res.status(500).json({ error: "Failed to create signed URL" });
//         }

//         res.json({ signedUrl: data.signedUrl, expiresAt: data.signedUrlExpiration });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

export default router;