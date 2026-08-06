import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireUser } from "../../lib/guard";

const router = Router();

const POST_TYPES = ["suggestion", "bug", "feature", "other"] as const;
const ADMIN_ROLES = ["ADMIN", "SUPERADMIN"] as const;

async function getUserRole(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? "USER";
}

function isAdminRole(role: string) {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

async function displayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name || user?.email?.split("@")[0] || "用户";
}

// 新反馈 → 通知全体管理员；公告 → 通知全体用户
async function notifyOnPost(post: { id: string; title: string; authorId: string; isAnnouncement: boolean }) {
  const actorName = await displayName(post.authorId);
  if (post.isAnnouncement) {
    const users = await prisma.user.findMany({
      where: { NOT: { id: post.authorId } },
      select: { id: true },
    });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "ANNOUNCEMENT",
        postId: post.id,
        actorId: post.authorId,
        message: `管理员发布了公告《${post.title}》`,
      })),
    });
  } else {
    const admins = await prisma.user.findMany({
      where: { role: { in: [...ADMIN_ROLES] }, NOT: { id: post.authorId } },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "NEW_POST",
        postId: post.id,
        actorId: post.authorId,
        message: `${actorName} 发布了新反馈《${post.title}》`,
      })),
    });
  }
}

// 给一批帖子附带当前用户的 liked 标记
async function attachPostLiked<T extends { id: string }>(posts: T[], userId: string) {
  if (posts.length === 0) return posts.map((p) => ({ ...p, liked: false }));
  const likes = await prisma.feedbackPostLike.findMany({
    where: { userId, postId: { in: posts.map((p) => p.id) } },
    select: { postId: true },
  });
  const likedSet = new Set(likes.map((l) => l.postId));
  return posts.map((p) => ({ ...p, liked: likedSet.has(p.id) }));
}

const authorSelect = {
  select: { id: true, name: true, email: true, image: true, role: true },
} as const;

// 帖子列表（置顶优先，私密帖仅作者/管理员可见）
router.get("/posts", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const role = await getUserRole(userId);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const type = req.query.type as string;

    const visibility = isAdminRole(role)
      ? {}
      : { OR: [{ isPrivate: false }, { authorId: userId }] };

    const where: any = { ...visibility };
    if (type && (POST_TYPES as readonly string[]).includes(type)) where.type = type;

    const [total, posts] = await Promise.all([
      prisma.feedbackPost.count({ where }),
      prisma.feedbackPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { isAnnouncement: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          isPrivate: true,
          isAnnouncement: true,
          isPinned: true,
          likeCount: true,
          replyCount: true,
          createdAt: true,
          author: authorSelect,
        },
      }),
    ]);

    const data = await attachPostLiked(posts, userId);
    res.json({ success: true, data: { posts: data, total, page, pageSize } });
  } catch (error: any) {
    console.error("Error listing feedback posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 发帖（公告仅管理员可发）
router.post("/posts", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { title, type, content, isPrivate, isAnnouncement } = req.body ?? {};

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!trimmedTitle || trimmedTitle.length > 100) {
      return res.status(400).json({ error: "请填写标题（100 字以内）" });
    }
    if (!(POST_TYPES as readonly string[]).includes(type)) {
      return res.status(400).json({ error: "无效的反馈类型" });
    }
    if (!trimmedContent || trimmedContent.length > 10000) {
      return res.status(400).json({ error: "请填写内容（10000 字以内）" });
    }

    const role = await getUserRole(userId);
    const announcement = isAnnouncement === true;
    if (announcement && !isAdminRole(role)) {
      return res.status(403).json({ error: "仅管理员可发布公告" });
    }

    const post = await prisma.feedbackPost.create({
      data: {
        authorId: userId,
        title: trimmedTitle,
        type,
        content: trimmedContent,
        isPrivate: isPrivate === true && !announcement,
        isAnnouncement: announcement,
      },
    });

    await notifyOnPost(post);

    res.json({ success: true, data: { id: post.id } });
  } catch (error: any) {
    console.error("Error creating feedback post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 帖子详情（含回复）
router.get("/posts/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const role = await getUserRole(userId);

    const { id } = req.params;
    const post = await prisma.feedbackPost.findUnique({
      where: { id },
      include: {
        author: authorSelect,
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: authorSelect },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "帖子不存在" });
    }
    if (post.isPrivate && post.authorId !== userId && !isAdminRole(role)) {
      return res.status(403).json({ error: "无权限查看该帖子" });
    }

    const [postWithLiked] = await attachPostLiked([post], userId);

    const replyIds = post.replies.map((r) => r.id);
    const replyLikes = replyIds.length
      ? await prisma.feedbackReplyLike.findMany({
          where: { userId, replyId: { in: replyIds } },
          select: { replyId: true },
        })
      : [];
    const likedReplies = new Set(replyLikes.map((l) => l.replyId));

    res.json({
      success: true,
      data: {
        ...postWithLiked,
        replies: post.replies.map((r) => ({ ...r, liked: likedReplies.has(r.id) })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching feedback post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 删帖（作者或管理员）
router.delete("/posts/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const post = await prisma.feedbackPost.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "帖子不存在" });
    }

    const role = await getUserRole(userId);
    if (post.authorId !== userId && !isAdminRole(role)) {
      return res.status(403).json({ error: "无权限" });
    }

    await prisma.feedbackPost.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting feedback post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 置顶/取消置顶（仅管理员）
router.patch("/posts/:id/pin", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const role = await getUserRole(userId);
    if (!isAdminRole(role)) {
      return res.status(403).json({ error: "仅管理员可置顶" });
    }

    const { id } = req.params;
    const post = await prisma.feedbackPost.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "帖子不存在" });
    }

    const updated = await prisma.feedbackPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
    res.json({ success: true, data: { isPinned: updated.isPinned } });
  } catch (error: any) {
    console.error("Error toggling pin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 标记状态（作者或管理员）：OPEN ↔ RESOLVED
router.patch("/posts/:id/status", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { status } = req.body ?? {};
    if (status !== "OPEN" && status !== "RESOLVED") {
      return res.status(400).json({ error: "无效的状态值" });
    }

    const post = await prisma.feedbackPost.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "帖子不存在" });
    }

    const role = await getUserRole(userId);
    if (post.authorId !== userId && !isAdminRole(role)) {
      return res.status(403).json({ error: "无权限" });
    }

    await prisma.feedbackPost.update({ where: { id }, data: { status } });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating post status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 帖子点赞切换
router.post("/posts/:id/like", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.feedbackPostLike.findUnique({
        where: { userId_postId: { userId, postId: id } },
      });
      if (existing) {
        await tx.feedbackPostLike.delete({ where: { id: existing.id } });
        const post = await tx.feedbackPost.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false, likeCount: post.likeCount };
      }
      await tx.feedbackPostLike.create({ data: { userId, postId: id } });
      const post = await tx.feedbackPost.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true, likeCount: post.likeCount };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "帖子不存在" });
    }
    console.error("Error toggling post like:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 回复帖子（通知作者；管理员回复显示为"管理员"）
router.post("/posts/:id/replies", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { content } = req.body ?? {};
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!trimmed || trimmed.length > 5000) {
      return res.status(400).json({ error: "请填写回复内容（5000 字以内）" });
    }

    const post = await prisma.feedbackPost.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "帖子不存在" });
    }

    const role = await getUserRole(userId);
    if (post.isPrivate && post.authorId !== userId && !isAdminRole(role)) {
      return res.status(403).json({ error: "无权限" });
    }

    const [reply] = await prisma.$transaction([
      prisma.feedbackReply.create({
        data: { postId: id, authorId: userId, content: trimmed },
        include: { author: authorSelect },
      }),
      prisma.feedbackPost.update({
        where: { id },
        data: { replyCount: { increment: 1 } },
      }),
    ]);

    if (post.authorId !== userId) {
      const actorName = isAdminRole(role) ? "管理员" : await displayName(userId);
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "REPLY",
          postId: id,
          actorId: userId,
          message: `${actorName} 回复了你的帖子《${post.title}》`,
        },
      });
    }

    res.json({ success: true, data: { ...reply, liked: false } });
  } catch (error: any) {
    console.error("Error creating reply:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 删除回复（作者或管理员）
router.delete("/replies/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const reply = await prisma.feedbackReply.findUnique({ where: { id } });
    if (!reply) {
      return res.status(404).json({ error: "回复不存在" });
    }

    const role = await getUserRole(userId);
    if (reply.authorId !== userId && !isAdminRole(role)) {
      return res.status(403).json({ error: "无权限" });
    }

    await prisma.$transaction([
      prisma.feedbackReply.delete({ where: { id } }),
      prisma.feedbackPost.update({
        where: { id: reply.postId },
        data: { replyCount: { decrement: 1 } },
      }),
    ]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting reply:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 回复点赞切换
router.post("/replies/:id/like", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.feedbackReplyLike.findUnique({
        where: { userId_replyId: { userId, replyId: id } },
      });
      if (existing) {
        await tx.feedbackReplyLike.delete({ where: { id: existing.id } });
        const reply = await tx.feedbackReply.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false, likeCount: reply.likeCount };
      }
      await tx.feedbackReplyLike.create({ data: { userId, replyId: id } });
      const reply = await tx.feedbackReply.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true, likeCount: reply.likeCount };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "回复不存在" });
    }
    console.error("Error toggling reply like:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
