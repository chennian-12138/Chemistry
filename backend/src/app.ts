import express from "express";
import path from "node:path";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";
import reactionsRouter from "./routes/reactions";
import reviewRouter from "./routes/review";
import rdkitRouter from "./routes/rdkit";
import reactdicRouter from "./routes/reactdic";
import historyRouter from "./routes/history";
import avatarRouter from "./routes/avatar";
import analyticsRouter from "./routes/analytics";
import draftsRouter from "./routes/drafts";

const app = express();
const port = 8000;

// Add CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());
app.use("/api/reactions", reactionsRouter);
app.use("/api/review", reviewRouter);
app.use("/api/rdkit", rdkitRouter);
app.use("/api/reactdic", reactdicRouter);
app.use("/api/history", historyRouter);
app.use("/api/avatar", avatarRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/drafts", draftsRouter);

// 提供静态文件访问 (头像等)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.listen(port, () => {
  console.log(`Better Auth app listening on port ${port}`);
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
