"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, Key } from "lucide-react";
import { signIn, authClient } from "@/lib/auth-client";
import { authErrorMessage, isValidEmail } from "@/lib/auth-errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  // 未验证时发送验证码（登录失败后后端通常已自动发一次，这里用于重发）
  const sendOtp = async () => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    if (error) {
      toast.error(authErrorMessage(error, "发送失败，请稍后重试"));
      return;
    }
    toast.success("验证码已发送，请查收邮件");
  };

  // 输入验证码完成验证并登录
  const verifyAndLogin = async () => {
    if (otp.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setVerifying(true);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
    if (error) {
      setVerifying(false);
      toast.error(authErrorMessage(error, "验证码错误或已过期"));
      return;
    }
    // 验证通过后用原密码登录
    await signIn.email({
      email,
      password,
      rememberMe,
      fetchOptions: {
        onResponse: () => setVerifying(false),
        onSuccess: () => {
          window.location.href = "/dashboard/reactdic";
        },
        onError: (ctx) => toast.error(authErrorMessage(ctx.error, "登录失败")),
      },
    });
  };

  if (needsVerification) {
    return (
      <FieldGroup className="max-w-md">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-lg md:text-xl">验证邮箱</h1>
          <p className="text-xs md:text-sm">
            账号 <span className="font-medium text-foreground">{email}</span>{" "}
            尚未验证，我们已发送验证码，请输入以完成验证并登录
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="otp">验证码</FieldLabel>
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            placeholder="6 位数字"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest"
          />
        </Field>
        <Button className="w-full" disabled={verifying} onClick={verifyAndLogin}>
          {verifying ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "验证并登录"
          )}
        </Button>
        <button
          type="button"
          onClick={sendOtp}
          className="text-sm text-indigo-600 hover:underline text-center"
        >
          没收到？重新发送验证码
        </button>
        <button
          type="button"
          onClick={() => setNeedsVerification(false)}
          className="text-sm text-muted-foreground hover:underline text-center"
        >
          返回登录
        </button>
      </FieldGroup>
    );
  }

  return (
    <FieldGroup className="max-w-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-lg md:text-xl">登录账号</h1>
        <p className="text-xs md:text-sm">请输入您的邮箱以登录您的账号</p>
      </div>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          value={email}
        />
      </Field>

      <Field>
        <div className="flex items-center">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Link
            href="/forgot-password"
            className="ml-auto text-sm underline-offset-4 hover:underline"
          >
            忘记密码？
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="password"
          autoComplete="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          onClick={() => {
            setRememberMe(!rememberMe);
          }}
        />
        <Label htmlFor="remember">Remember me</Label>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        onClick={async () => {
          // 提交前的前置校验
          if (!email.trim() || !password) {
            toast.error("请填写邮箱和密码");
            return;
          }
          if (!isValidEmail(email)) {
            toast.error("邮箱格式不正确");
            return;
          }
          setNeedsVerification(false);
          await signIn.email({
            email,
            password,
            rememberMe,
            callbackURL: "/dashboard/reactdic",
            fetchOptions: {
              onRequest: () => {
                setLoading(true);
              },
              onResponse: () => {
                setLoading(false);
              },
              onSuccess: () => {
                // 硬跳转，确保 useSession 重新读取新 session cookie
                window.location.href = "/dashboard/reactdic";
              },
              onError: async (ctx) => {
                // 403 = 邮箱未验证：切到验证码步骤并发送验证码
                if (ctx.error.status === 403) {
                  setNeedsVerification(true);
                  toast.error("邮箱尚未验证，请输入验证码完成验证");
                  await sendOtp();
                } else {
                  toast.error(authErrorMessage(ctx.error, "登录失败"));
                }
              },
            },
          });
        }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <p>Login</p>
        )}
      </Button>
      {needsVerification && (
        <button
          type="button"
          onClick={resendVerification}
          className="text-sm text-indigo-600 hover:underline text-center"
        >
          没收到验证邮件？点此重新发送
        </button>
      )}
      <FieldSeparator>其他登录方式</FieldSeparator>
      <div
        className={cn(
          "w-full gap-2 flex items-center",
          "justify-between flex-col",
        )}
      >
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={loading}
          onClick={async () => {
            await signIn.social({
              provider: "github",
              callbackURL: "/dashboard",
              fetchOptions: {
                onRequest: () => {
                  setLoading(true);
                },
                onResponse: () => {
                  setLoading(false);
                },
              },
            });
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
            ></path>
          </svg>
          Sign in with Github
        </Button>
      </div>
    </FieldGroup>
  );
}
