import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import type { Request, Response } from "express";

const router = Router();

// Get user's drafts
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });

    if (!session || !session.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const drafts = await prisma.draft.findMany({
      where: { authorId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    res.json(drafts);
    return;
  } catch (error) {
    console.error("GET /drafts error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

// Create or update a draft
router.post("/", async (req: Request, res: Response): Promise<void> => {
  console.log("[Drafts API] Received draft POST request");
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });

    if (!session || !session.user) {
      console.log("[Drafts API] No session or user found via getSession");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id, name, data } = req.body; // Full JSON data
    console.log(
      `[Drafts API] Payload: id=${id}, name=${name}, sessionUserId=${session.user.id}`,
    );

    if (!data) {
      res.status(400).json({ error: "Data is required" });
      return;
    }

    const reactionName = name?.trim() || "未命名草稿";

    // Update if Draft has the same Name (and not "未命名草稿") or if we passed a draftId (we'll just search by ID if it's there)
    // Wait, the client can just pass the same draftId if they edit one they loaded.
    // Let's check if the client passed `id`.
    let existingDraft = null;

    if (id) {
      existingDraft = await prisma.draft.findUnique({
        where: { id: id, authorId: session.user.id },
      });
    }

    if (!existingDraft && reactionName !== "未命名草稿") {
      // Find by name
      existingDraft = await prisma.draft.findFirst({
        where: { name: reactionName, authorId: session.user.id },
      });
    }

    if (existingDraft) {
      console.log(
        "[Drafts API] Found existing draft, updating:",
        existingDraft.id,
      );
      const updated = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          name: reactionName,
          data: data,
        },
      });
      res.json(updated);
    } else {
      console.log(
        "[Drafts API] No existing draft, creating new under name:",
        reactionName,
      );
      const created = await prisma.draft.create({
        data: {
          authorId: session.user.id,
          name: reactionName,
          data: data,
        },
      });
      console.log("[Drafts API] Created DB draft with ID:", created.id);
      res.status(201).json(created);
    }
    return;
  } catch (error) {
    console.error("POST /drafts error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

// Delete a draft
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });

    if (!session || !session.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const draftId = req.params.id as string;

    // Optional Check ownership
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft || draft.authorId !== session.user.id) {
      res.status(404).json({ error: "Draft not found or permission denied" });
      return;
    }

    await prisma.draft.delete({
      where: { id: draftId },
    });

    res.json({ success: true });
    return;
  } catch (error) {
    console.error("DELETE /drafts error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

export default router;
