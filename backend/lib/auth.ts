import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true,
    async sendResetPassword(data, request) {
      // Send an email to the user with a link to reset their password
    },
  },
  // emailVerification: {
  //   sendVerificationEmail: async ({ user, url }, request) => {
  //     console.log("验证链接",url);
  //     console.log("即将发送给",user.email);
  //     try{
  //       await resend.emails.send({
  //         from: process.env.EMAIL_FROM as string,
  //         to: user.email,
  //         subject: "Verify your email",
  //         html: `<a href="${url}">Click here to verify your email</a>`,
  //       });
  //       console.log("发送验证邮件成功");
  //     }catch(error){
  //       console.log("发送验证邮件失败",error);
  //     }
  //   },
  //   sendOnSignUp: true,
  //   autoSignInAfterVerification: true,
  // },
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
