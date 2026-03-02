import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";
import reactionsRouter from "./routes/reactions";
import reviewRouter from "./routes/review";
import rdkitRouter from "./routes/rdkit";
import reactdicRouter from "./routes/reactdic"

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

app.listen(port, () => {
  console.log(`Better Auth app listening on port ${port}`);
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
