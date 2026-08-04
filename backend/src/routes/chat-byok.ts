import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { decryptApiKey, encryptApiKey } from "../../lib/byok-crypto";

const router = Router();

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

// 脱敏尾号：绝不下发明文 key，前端只展示「••••xxxx」
function keyHint(apiKey: string): string {
  return "••••" + apiKey.slice(-4);
}

// GET /api/chat/byok —— 当前用户是否已配置自带 key（只回脱敏信息）
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: "请先登录" });
      return;
    }

    const cfg = await prisma.userLlmConfig.findUnique({ where: { userId } });
    if (!cfg) {
      res.json({ configured: false });
      return;
    }
    res.json({
      configured: true,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      keyHint: keyHint(decryptApiKey(cfg.apiKeyEnc)),
    });
  } catch (err) {
    console.error("GET /chat/byok error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/chat/byok —— 新增/更新自带 key；入库前先做真实连通性测试，避免存下无效配置
router.put("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: "请先登录" });
      return;
    }

    const body = req.body as {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    };
    const apiKey = body.apiKey?.trim();
    if (!apiKey) {
      res.status(400).json({ error: "缺少 apiKey" });
      return;
    }
    const baseUrl = body.baseUrl?.trim() || DEFAULT_BASE_URL;
    const model = body.model?.trim() || DEFAULT_MODEL;

    // 连接测试：非 2xx 或网络失败都视为配置无效，拒绝入库
    let testOk = false;
    let upstreamStatus: number | undefined;
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      upstreamStatus = resp.status;
      testOk = resp.ok;
    } catch {
      testOk = false;
    }
    if (!testOk) {
      res.status(400).json({
        error:
          "连接测试失败，请检查 API Key / Base URL / 模型名" +
          (upstreamStatus ? `: ${upstreamStatus}` : ""),
      });
      return;
    }

    const apiKeyEnc = encryptApiKey(apiKey);
    await prisma.userLlmConfig.upsert({
      where: { userId },
      update: { apiKeyEnc, baseUrl, model },
      create: { userId, apiKeyEnc, baseUrl, model },
    });
    res.json({ configured: true, baseUrl, model, keyHint: keyHint(apiKey) });
  } catch (err) {
    console.error("PUT /chat/byok error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/chat/byok —— 删除自带 key（无配置时静默成功）
router.delete("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: "请先登录" });
      return;
    }

    await prisma.userLlmConfig.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /chat/byok error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
