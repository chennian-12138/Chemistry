import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "../lib/prisma";
import { sendMail, renderOtpEmail } from "./mailer";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
      },
    },
    // 允许注销账号：带密码即时删除，无需邮件确认（改邮箱同样走自建 OTP 路由）
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    // 未验证邮箱不允许登录（改用下方 OTP 验证码方式完成验证）
    requireEmailVerification: true,
  },
  session: {
    // 勾选 Remember me 时 session 最长有效期：30 天
    expiresIn: 60 * 60 * 24 * 30,
    // 每次活动时若已过去 1 天，则顺延过期时间（滑动续期）
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    emailOTP({
      // 注册时自动发送验证码
      sendVerificationOnSignUp: true,
      // 用 OTP 验证码取代 better-auth 默认的「点链接」邮箱验证
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 300, // 5 分钟有效
      async sendVerificationOTP({ email, otp, type }) {
        const subjectMap: Record<typeof type, string> = {
          "email-verification": "验证你的 Chemistry 账号邮箱",
          "forget-password": "重置你的 Chemistry 账号密码",
          "sign-in": "登录 Chemistry 的验证码",
        };
        const introMap: Record<typeof type, string> = {
          "email-verification":
            "感谢注册 Chemistry。请在页面中输入以下验证码完成邮箱验证。",
          "forget-password":
            "我们收到了重置你账号密码的请求。请在页面中输入以下验证码继续设置新密码。",
          "sign-in": "请在登录页面输入以下验证码完成登录。",
        };
        await sendMail({
          to: email,
          subject: subjectMap[type],
          html: renderOtpEmail({
            title: subjectMap[type],
            intro: introMap[type],
            otp,
          }),
        });
      },
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL as string, // 你的前端地址
  ],
});
