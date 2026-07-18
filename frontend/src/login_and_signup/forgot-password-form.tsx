"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, isValidEmail } from "@/lib/auth-errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // 第一步：发送重置验证码
  const handleSendOtp = async () => {
    if (!email) {
      toast.error("请填写邮箱");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("邮箱格式不正确");
      return;
    }
    setLoading(true);
    const { error } = await authClient.forgetPassword.emailOtp({ email });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, "发送失败，请稍后重试"));
      return;
    }
    toast.success("验证码已发送，请查收邮件");
    setStep("reset");
  };

  // 第二步：用验证码 + 新密码重置
  const handleReset = async () => {
    if (otp.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    if (password.length < 8) {
      toast.error("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, "验证码错误或已过期"));
      return;
    }
    toast.success("密码已重置，请用新密码登录");
    router.push("/signin");
  };

  if (step === "reset") {
    return (
      <FieldGroup className="max-w-md">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-lg md:text-xl">设置新密码</h1>
          <p className="text-xs md:text-sm">
            我们已向 <span className="font-medium text-foreground">{email}</span>{" "}
            发送验证码，请输入验证码并设置新密码
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

        <Field>
          <FieldLabel htmlFor="password">新密码</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="至少 8 位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirm">确认新密码</FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="再次输入新密码"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
          onClick={handleReset}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "重置密码"
          )}
        </Button>
        <button
          type="button"
          onClick={handleSendOtp}
          className="text-sm text-indigo-600 hover:underline text-center"
        >
          没收到？重新发送验证码
        </button>
      </FieldGroup>
    );
  }

  return (
    <FieldGroup className="max-w-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-lg md:text-xl">找回密码</h1>
        <p className="text-xs md:text-sm">输入你的账号邮箱，我们会发送验证码</p>
      </div>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        onClick={handleSendOtp}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          "发送验证码"
        )}
      </Button>

      <div className="text-center text-sm">
        <Link href="/signin" className="underline-offset-4 hover:underline">
          返回登录
        </Link>
      </div>
    </FieldGroup>
  );
}
