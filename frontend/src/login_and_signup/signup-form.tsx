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
import { useState } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { signUp, authClient } from "@/lib/auth-client";
import { authErrorMessage, isValidEmail } from "@/lib/auth-errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [Name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setVerifying(true);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
    setVerifying(false);
    if (error) {
      toast.error(authErrorMessage(error, "验证码错误或已过期"));
      return;
    }
    toast.success("邮箱验证成功！");
    // 硬跳转：验证已写入新 session cookie，整页重载让 useSession 重新读取，
    // 否则软跳转时 dashboard 守卫读到旧的空 session 会把用户踢回首页
    window.location.href = "/dashboard/reactdic";
  };

  const handleResendOtp = async () => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    if (error) {
      toast.error(authErrorMessage(error, "发送失败，请稍后重试"));
      return;
    }
    toast.success("验证码已重新发送");
  };

  if (otpSent) {
    return (
      <FieldGroup className="z-50 rounded-md rounded-t-none max-w-md">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">输入验证码</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            我们已向 <span className="font-medium text-foreground">{email}</span>{" "}
            发送了 6 位验证码，请查收后在下方输入。
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
        <Button
          className="w-full"
          disabled={verifying}
          onClick={handleVerifyOtp}
        >
          {verifying ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "验证并完成注册"
          )}
        </Button>
        <button
          type="button"
          onClick={handleResendOtp}
          className="text-sm text-indigo-600 hover:underline text-center"
        >
          没收到？重新发送验证码
        </button>
      </FieldGroup>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <FieldGroup className="z-50 rounded-md rounded-t-none max-w-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Fill in the form below to create your account
        </p>
      </div>{" "}
      <Field>
        <Label htmlFor="first-name">First name</Label>
        <Input
          id="first-name"
          placeholder="Max"
          required
          onChange={(e) => {
            setName(e.target.value);
          }}
          value={Name}
        />
      </Field>
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
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Password"
        />
		</Field>
        <Field>
          <FieldLabel htmlFor="password_confirmation">Confirm Password</FieldLabel>
          <Input
            id="password_confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            placeholder="Confirm Password"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="image">Profile Image (optional)</FieldLabel>
          <div className="flex items-end gap-4">
            {imagePreview && (
              <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Profile preview"
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {imagePreview && (
                <X
                  className="cursor-pointer"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                />
              )}
            </div>
          </div>
        </Field>
		<FieldSeparator>Or continue with</FieldSeparator>
		<Field>
        <Button
          type="submit"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            if (!Name.trim()) {
              toast.error("请填写用户名");
              return;
            }
            if (!email || !password) {
              toast.error("请填写邮箱和密码");
              return;
            }
            if (!isValidEmail(email)) {
              toast.error("邮箱格式不正确");
              return;
            }
            if (password.length < 8) {
              toast.error("密码至少 8 位");
              return;
            }
            if (password !== passwordConfirmation) {
              toast.error("两次输入的密码不一致");
              return;
            }
            await signUp.email({
              email,
              password,
              name: Name,
              image: image ? await convertImageToBase64(image) : "",
              callbackURL: `${window.location.origin}/dashboard/reactdic`,
              fetchOptions: {
                onResponse: () => {
                  setLoading(false);
                },
                onRequest: () => {
                  setLoading(true);
                },
                onError: (ctx) => {
                  toast.error(authErrorMessage(ctx.error, "注册失败"));
                },
                onSuccess: () => {
                  // 注册成功后后端已自动发送验证码，切到验证码输入步骤
                  setOtpSent(true);
                },
              },
            });
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Create your account"
          )}
        </Button>
		</Field>
    </FieldGroup>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
