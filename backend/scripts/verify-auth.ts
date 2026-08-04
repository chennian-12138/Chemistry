/**
 * 后端鉴权契约验证脚本（零依赖，使用 Node 18+ 全局 fetch）。
 *
 * 用法:
 *   npx tsx scripts/verify-auth.ts
 *
 * 环境变量:
 *   BASE_URL                                  默认 http://localhost:8000
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD      可选，提供后追加验证普通用户行
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD    可选，提供后追加验证管理员行
 *
 * 匿名用户的用例始终执行；任意一行 FAIL 则以非零码退出。
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

interface Row {
  name: string;
  method: string;
  path: string;
  expected: number;
  cookie?: string;
  withBody?: boolean;
}

let passed = 0;
let failed = 0;

async function runRow(row: Row) {
  const headers: Record<string, string> = {};
  if (row.cookie) headers.cookie = row.cookie;
  if (row.withBody) headers["content-type"] = "application/json";

  let status: number;
  try {
    const res = await fetch(`${BASE_URL}${row.path}`, {
      method: row.method,
      headers,
      ...(row.withBody ? { body: JSON.stringify({}) } : {}),
      redirect: "manual",
    });
    status = res.status;
    // 排空响应体，避免连接悬挂
    await res.text();
  } catch (error: any) {
    console.log(
      `FAIL  ${row.name}  ${row.method} ${row.path}  -> 请求失败: ${error?.message ?? error}（服务是否在 ${BASE_URL} 运行？）`,
    );
    failed++;
    return;
  }

  if (status === row.expected) {
    console.log(`PASS  ${row.name}  ${row.method} ${row.path}  -> ${status}`);
    passed++;
  } else {
    console.log(
      `FAIL  ${row.name}  ${row.method} ${row.path}  -> 期望 ${row.expected}，实际 ${status}`,
    );
    failed++;
  }
}

// 通过 better-auth 邮箱登录拿会话 cookie；失败时返回 null 并跳过相关行
async function signIn(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // better-auth 校验 trustedOrigins；默认用本地前端地址
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });
    if (!res.ok) {
      console.log(`SKIP  登录失败（${email}）: HTTP ${res.status}，相关行跳过`);
      return null;
    }
    const cookies = res.headers.getSetCookie();
    if (cookies.length === 0) {
      console.log(`SKIP  登录成功但未返回 cookie（${email}），相关行跳过`);
      return null;
    }
    return cookies.map((c) => c.split(";")[0]).join("; ");
  } catch (error: any) {
    console.log(
      `SKIP  登录请求失败（${email}）: ${error?.message ?? error}，相关行跳过`,
    );
    return null;
  }
}

async function main() {
  console.log(`🔐 验证后端鉴权契约: ${BASE_URL}\n`);

  // ===== 匿名（无 cookie）：始终执行 =====
  const anonymousRows: Row[] = [
    { name: "[anon]", method: "POST", path: "/api/reactions", expected: 401, withBody: true },
    { name: "[anon]", method: "GET", path: "/api/reactions", expected: 401 },
    { name: "[anon]", method: "PUT", path: "/api/reactions/any-id", expected: 401, withBody: true },
    { name: "[anon]", method: "GET", path: "/api/review/list", expected: 401 },
    { name: "[anon]", method: "GET", path: "/api/review/rejected", expected: 401 },
  ];
  for (const row of anonymousRows) await runRow(row);

  // ===== 普通用户：提供 TEST_USER_EMAIL/TEST_USER_PASSWORD 时执行 =====
  const userEmail = process.env.TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD;
  if (userEmail && userPassword) {
    const cookie = await signIn(userEmail, userPassword);
    if (cookie) {
      const userRows: Row[] = [
        { name: "[user]", method: "GET", path: "/api/reactions", expected: 200, cookie },
        { name: "[user]", method: "GET", path: "/api/review/list", expected: 403, cookie },
        { name: "[user]", method: "GET", path: "/api/review/rejected", expected: 200, cookie },
      ];
      for (const row of userRows) await runRow(row);
    }
  } else {
    console.log("SKIP  未提供 TEST_USER_EMAIL/TEST_USER_PASSWORD，普通用户行跳过");
  }

  // ===== 管理员：提供 TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD 时执行 =====
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const cookie = await signIn(adminEmail, adminPassword);
    if (cookie) {
      const adminRows: Row[] = [
        { name: "[admin]", method: "GET", path: "/api/review/list", expected: 200, cookie },
        { name: "[admin]", method: "GET", path: "/api/review/rejected", expected: 200, cookie },
      ];
      for (const row of adminRows) await runRow(row);
    }
  } else {
    console.log("SKIP  未提供 TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD，管理员行跳过");
  }

  console.log(`\n结果: ${passed} PASS, ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
