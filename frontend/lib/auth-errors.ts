// better-auth 的错误信息是英文原文，这里统一翻译成中文友好提示。
// better-auth 在 error 对象上提供 code（稳定的错误码）和 message（英文文案），
// 我们优先用 code 映射，兜底再看 message 关键字，最后回退到传入的默认文案。

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
} | null | undefined;

// 常见 better-auth 错误码 -> 中文
const CODE_MAP: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "邮箱或密码错误",
  INVALID_PASSWORD: "密码错误",
  INVALID_EMAIL: "邮箱格式不正确",
  USER_NOT_FOUND: "该邮箱尚未注册",
  USER_ALREADY_EXISTS: "该邮箱已被注册",
  EMAIL_NOT_VERIFIED: "邮箱尚未验证",
  PASSWORD_TOO_SHORT: "密码太短，至少 8 位",
  PASSWORD_TOO_LONG: "密码太长",
  INVALID_TOKEN: "验证码无效或已过期",
  OTP_EXPIRED: "验证码已过期，请重新获取",
  INVALID_OTP: "验证码错误",
  TOO_MANY_ATTEMPTS: "尝试次数过多，请稍后再试",
  TOO_MANY_REQUESTS: "操作过于频繁，请稍后再试",
};

// message 关键字兜底（某些版本不带 code 或 code 未覆盖）
const MESSAGE_KEYWORDS: [RegExp, string][] = [
  [/invalid email or password/i, "邮箱或密码错误"],
  [/invalid password/i, "密码错误"],
  [/user (already )?exists|already registered/i, "该邮箱已被注册"],
  [/user not found/i, "该邮箱尚未注册"],
  [/email not verified/i, "邮箱尚未验证"],
  [/otp|verification code/i, "验证码无效或已过期"],
  [/too many/i, "操作过于频繁，请稍后再试"],
  [/network|fetch/i, "网络异常，请检查网络后重试"],
];

/**
 * 把 better-auth 的错误对象翻译成中文提示。
 * @param error better-auth onError 回调里的 ctx.error，或 { error } 解构里的 error
 * @param fallback 都匹配不到时的兜底文案
 */
export function authErrorMessage(
  error: AuthErrorLike,
  fallback = "操作失败，请稍后重试",
): string {
  if (!error) return fallback;

  if (error.code && CODE_MAP[error.code]) {
    return CODE_MAP[error.code];
  }

  if (error.message) {
    for (const [re, zh] of MESSAGE_KEYWORDS) {
      if (re.test(error.message)) return zh;
    }
  }

  return fallback;
}

// 简单的邮箱格式校验，用于提交前的前置校验
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
