import express from "express";
import SUPABASE from "./clients/supabaseClient.js";
import 'dotenv/config'

const router = express.Router();

router.post("/backup", async (req, res) => {
    try {
        const { userId, musicList } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log(musicList)
        if (!musicList) {
            return res.status(400).json({ error: 'Music array required' });
        }

        // 1. Delete existing music data from supabase
        const { error: deleteError } = await SUPABASE 
            .from('music')
            .delete()
            .eq('auth_id', userId);

        if (deleteError) {
            console.log('Delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete existing music', details: deleteError.message });
        }

        // 2. Insert new music (if any)
        let result = [];
        if (musicList.length > 0) {
            // Prepare data with user_id
            const musicWithUser = musicList.map(music => ({
                auth_id: userId,
                title: music.name,
                cover: music.image,
                url: music.music,
            }));

            const { error: insertError } = await SUPABASE
                .from('music')
                .insert(musicWithUser)

            if (insertError) {
                console.error('Insert error:', insertError);
                return res.status(500).json({ error: 'Failed to insert music', details: insertError.message });
            }
        }

        // 3. Return success
        return res.status(200).json({
            success: true,
            message: `Synced ${result.length} tracks`,
            data: result
        });

    } catch (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;