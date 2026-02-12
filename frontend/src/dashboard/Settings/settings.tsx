"use client";

import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { toast } from "sonner";

export default function UserSettings() {
  const { data: session, refetch } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");
  const [imagePreview, setImagePreview] = useState<string | null>(session?.user?.image || null);

  // 更新用户名
  const updateName = async () => {
    setIsLoading(true);
    const { error } = await authClient.updateUser({
      name,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("用户名已更新");
      refetch(); // 刷新 session
    }
    setIsLoading(false);
  };

  // 更新头像（Base64）
  const updateImage = async (file: File) => {
    setIsLoading(true);
    const base64 = await convertImageToBase64(file);
    
    const { error } = await authClient.updateUser({
      image: base64,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("头像已更新");
      setImagePreview(base64);
      refetch();
    }
    setIsLoading(false);
  };

  // 更新邮箱（需要验证）
  const updateEmail = async (newEmail: string) => {
    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/settings", // 验证后跳转回来
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("验证邮件已发送，请查收");
    }
  };

  // 更新密码
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true, // 让其他设备退出登录
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("密码已更新");
    }
  };

  if (!session) return <div>请登录</div>;

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">个人设置</h1>
      
      {/* 头像上传 */}
      <div className="space-y-2">
        <Label>头像</Label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <Image
              src={imagePreview}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) updateImage(file);
            }}
          />
        </div>
      </div>

      {/* 用户名 */}
      <div className="space-y-2">
        <Label htmlFor="name">用户名</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={updateName} disabled={isLoading}>
          {isLoading ? "更新中..." : "保存用户名"}
        </Button>
      </div>

      {/* 当前信息展示 */}
      <div className="text-sm text-gray-500">
        <p>邮箱: {session.user.email}</p>
      </div>
    </div>
  );
}

function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}