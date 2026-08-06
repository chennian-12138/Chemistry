import { auth } from "./auth";
import { prisma } from "./prisma";

// 统一鉴权守卫：在路由处理器顶部调用。
// 返回 null 表示响应已发送（401/403），处理器应立即 return。

export async function getSession(req: any) {
  return auth.api.getSession({
    headers: new Headers(req.headers as any),
  });
}

// 要求登录：匿名 → 401，返回 null；否则返回 userId
export async function requireUser(req: any, res: any): Promise<string | null> {
  const session = await getSession(req);
  const userId = session?.user?.id;

  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return null;
  }
  return userId;
}

// 要求管理员：先 requireUser；角色非 ADMIN/SUPERADMIN → 403，返回 null
export async function requireAdmin(req: any, res: any): Promise<string | null> {
  const userId = await requireUser(req, res);
  if (!userId) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (currentUser?.role !== "ADMIN" && currentUser?.role !== "SUPERADMIN") {
    res.status(403).json({ error: "无权限" });
    return null;
  }
  return userId;
}

// 要求超级管理员：先 requireUser；角色非 SUPERADMIN → 403，返回 null
// 用于角色升降级、平台级配置等仅限 SUPERADMIN 的操作
export async function requireSuperAdmin(
  req: any,
  res: any,
): Promise<string | null> {
  const userId = await requireUser(req, res);
  if (!userId) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (currentUser?.role !== "SUPERADMIN") {
    res.status(403).json({ error: "仅超级管理员可执行此操作" });
    return null;
  }
  return userId;
}

// 获取当前登录用户角色（USER/ADMIN/SUPERADMIN），未登录返回 null
export async function getCurrentRole(req: any): Promise<string | null> {
  const session = await getSession(req);
  const userId = session?.user?.id;
  if (!userId) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return currentUser?.role ?? null;
}
