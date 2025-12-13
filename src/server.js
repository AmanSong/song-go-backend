import express from "express";
import cors from "cors";
import 'dotenv/config'

import youtubeRoutes from "../routes/youtube.js";
import videoDownloader from "../routes/videoDownloader.js";
import authRoutes from "../routes/auth.js";
import databaseRoutes from "../routes/database.js"
import { rateLimit } from 'express-rate-limit'

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json())

app.use(rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30
}));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


app.use("/api/youtube", youtubeRoutes);
app.use("/api/video", videoDownloader);
app.use("/api/user", authRoutes);
app.use("/api/database", databaseRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
