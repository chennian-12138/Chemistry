"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import { authErrorMessage, isValidEmail } from "@/lib/auth-errors";
import {
  getAccountStats,
  sendChangeEmailOtp,
  verifyChangeEmailOtp,
  type AccountStats,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  UserPen,
  Mail,
  KeyRound,
  LogOut,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatsCards } from "./StatsCards";
import { ByokCard } from "./ByokCard";

const API_BASE =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8000";

// ── 单行设置项
function SettingRow({
  label,
  description,
  value,
  trigger,
}: {
  label: string;
  description?: string;
  value?: string;
  trigger: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-5">
      <div className="space-y-1 min-w-0">
        <p className="text-base font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {value && (
          <p className="text-sm text-muted-foreground font-mono">{value}</p>
        )}
      </div>
      {trigger}
    </div>
  );
}

export default function UserSettings() {
  const { data: session, isPending, refetch } = useSession();
  const user = session?.user as any;

  // ── 头像上传
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.image ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── 修改用户名 Dialog 状态
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  // ── 修改密码 Dialog 状态（改用邮箱验证码）
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdStep, setPwdStep] = useState<"input" | "otp">("input");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdOtp, setPwdOtp] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // ── 修改邮箱 Dialog 状态
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<"input" | "otp">("input");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // ── 注销账号
  const [deletePwd, setDeletePwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── 使用统计
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatarUrl(user.image ?? "");
    }
  }, [user?.name, user?.image]);

  useEffect(() => {
    // 匿名不请求统计接口，避免无意义的 401
    if (!session) return;
    getAccountStats().then((res) => {
      if (res.success && res.data) setStats(res.data);
      setStatsLoading(false);
    });
  }, [session]);

  // ── 上传头像
  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await fetch(`${API_BASE}/api/avatar`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "上传失败");
      setAvatarUrl(data.url);
      toast.success("头像已更新");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── 保存用户名
  const saveName = async () => {
    if (!name.trim()) {
      toast.error("用户名不能为空");
      return;
    }
    setSavingName(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSavingName(false);
    if (error) {
      toast.error(authErrorMessage(error, "保存失败"));
      return;
    }
    toast.success("用户名已更新");
    setNameOpen(false);
    refetch();
  };

  // ── 改密码：第一步，发送验证码到当前邮箱
  const sendPwdOtpHandler = async () => {
    if (newPwd.length < 8) {
      toast.error("新密码至少 8 位");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("两次密码不一致");
      return;
    }
    if (!user?.email) {
      toast.error("无法获取当前邮箱");
      return;
    }
    setSavingPwd(true);
    const { error } = await authClient.forgetPassword.emailOtp({
      email: user.email,
    });
    setSavingPwd(false);
    if (error) {
      toast.error(authErrorMessage(error, "发送失败"));
      return;
    }
    toast.success("验证码已发送到你的邮箱");
    setPwdStep("otp");
  };

  // ── 改密码：第二步，校验验证码并落地新密码
  const savePassword = async () => {
    if (pwdOtp.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    if (!user?.email) {
      toast.error("无法获取当前邮箱");
      return;
    }
    setSavingPwd(true);
    const { error } = await authClient.emailOtp.resetPassword({
      email: user.email,
      otp: pwdOtp,
      password: newPwd,
    });
    setSavingPwd(false);
    if (error) {
      toast.error(authErrorMessage(error, "修改失败"));
      return;
    }
    toast.success("密码已修改，请用新密码重新登录");
    setPwdOpen(false);
    setPwdStep("input");
    setNewPwd("");
    setConfirmPwd("");
    setPwdOtp("");
    // 重置密码会使当前会话失效，跳回登录页
    setTimeout(() => {
      window.location.href = "/signin";
    }, 1200);
  };

  // ── 改邮箱：发送 OTP
  const sendEmailOtpHandler = async () => {
    if (!isValidEmail(newEmail)) {
      toast.error("邮箱格式不正确");
      return;
    }
    setSavingEmail(true);
    const res = await sendChangeEmailOtp(newEmail);
    setSavingEmail(false);
    if (!res.success) {
      toast.error(res.error ?? "发送失败");
      return;
    }
    toast.success("验证码已发送到新邮箱");
    setEmailStep("otp");
  };

  // ── 改邮箱：确认 OTP
  const confirmEmailOtpHandler = async () => {
    if (emailOtp.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setSavingEmail(true);
    const res = await verifyChangeEmailOtp(emailOtp);
    setSavingEmail(false);
    if (!res.success) {
      toast.error(res.error ?? "验证失败");
      return;
    }
    toast.success(`邮箱已更新为 ${res.email}`);
    setEmailOpen(false);
    setEmailStep("input");
    setNewEmail("");
    setEmailOtp("");
    refetch();
  };

  // ── 注销账号
  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await authClient.deleteUser({ password: deletePwd });
    setDeleting(false);
    if (error) {
      toast.error(authErrorMessage(error, "注销失败"));
      return;
    }
    window.location.href = "/";
  };

  if (isPending) return null;
  // 匿名：个人信息页替换为登录引导空态
  if (!session) {
    return (
      <div className="px-6 py-4 w-full h-[calc(100svh-4rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">登录后即可查看和编辑个人信息</p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/signin">登录</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">注册</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-6 py-4 w-full flex flex-col">
      {/* ── 顶部：头像 + 用户信息 + 账号编辑（同一行） */}
      <div className="flex items-start gap-6 mb-2">
        {/* 头像 */}
        <div className="relative group shrink-0">
          {uploadingAvatar ? (
            <div className="size-20 rounded-full flex items-center justify-center bg-muted">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Avatar className="size-20 border">
                <AvatarImage src={avatarUrl} alt={user?.name} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-input"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Camera className="size-4 text-white" />
              </label>
            </>
          )}
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* 右侧：大字用户名 + 邮箱 + 右侧三个 icon 按钮 */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* 左：用户名 + 邮箱 */}
          <div className="min-w-0 space-y-2">
            <p className="text-3xl font-bold leading-tight truncate mt-2">
              {user?.name ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email ?? "—"}
            </p>
          </div>

          {/* 右：三个 icon 按钮，推到最右 */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {/* 修改用户名 */}
            <Dialog
              open={nameOpen}
              onOpenChange={(o) => {
                setNameOpen(o);
                if (o) setName(user?.name ?? "");
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground size-10"
                    >
                      <UserPen className="size-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>修改用户名</TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>修改用户名</DialogTitle>
                  <DialogDescription>
                    修改后将在整个系统中生效
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="dialog-name">新用户名</Label>
                  <Input
                    id="dialog-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="输入用户名"
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNameOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={saveName} disabled={savingName}>
                    {savingName ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "保存"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 修改邮箱 */}
            <Dialog
              open={emailOpen}
              onOpenChange={(o) => {
                setEmailOpen(o);
                if (!o) {
                  setEmailStep("input");
                  setNewEmail("");
                  setEmailOtp("");
                }
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground size-10"
                    >
                      <Mail className="size-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>修改邮箱</TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>修改邮箱</DialogTitle>
                  <DialogDescription>
                    验证码将发送到新邮箱，确认后立即生效
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {emailStep === "input" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="new-email">新邮箱</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new@example.com"
                          className="flex-1"
                        />
                        <Button
                          onClick={sendEmailOtpHandler}
                          disabled={savingEmail || !newEmail}
                        >
                          {savingEmail ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "发送验证码"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        验证码已发送至{" "}
                        <span className="font-medium text-foreground">
                          {newEmail}
                        </span>
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="email-otp">验证码</Label>
                        <Input
                          id="email-otp"
                          inputMode="numeric"
                          maxLength={6}
                          value={emailOtp}
                          onChange={(e) =>
                            setEmailOtp(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="6 位数字"
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep("input");
                          setEmailOtp("");
                        }}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        重新填写邮箱
                      </button>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailOpen(false)}>
                    取消
                  </Button>
                  {emailStep === "otp" && (
                    <Button
                      onClick={confirmEmailOtpHandler}
                      disabled={savingEmail}
                    >
                      {savingEmail ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "确认修改"
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 修改密码 */}
            <Dialog
              open={pwdOpen}
              onOpenChange={(o) => {
                setPwdOpen(o);
                if (!o) {
                  setPwdStep("input");
                  setNewPwd("");
                  setConfirmPwd("");
                  setPwdOtp("");
                }
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground size-10"
                    >
                      <KeyRound className="size-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>修改密码</TooltipContent>
              </Tooltip>{" "}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>修改密码</DialogTitle>
                  <DialogDescription>
                    需要邮箱验证码确认。修改成功后需用新密码重新登录。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {pwdStep === "input" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="new-pwd">新密码</Label>
                        <Input
                          id="new-pwd"
                          type="password"
                          autoComplete="new-password"
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="至少 8 位"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-pwd">确认新密码</Label>
                        <Input
                          id="confirm-pwd"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          placeholder="再次输入"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        验证码已发送至{" "}
                        <span className="font-medium text-foreground">
                          {user?.email}
                        </span>
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="pwd-otp">验证码</Label>
                        <Input
                          id="pwd-otp"
                          inputMode="numeric"
                          maxLength={6}
                          value={pwdOtp}
                          onChange={(e) =>
                            setPwdOtp(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="6 位数字"
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPwdStep("input");
                          setPwdOtp("");
                        }}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        返回上一步
                      </button>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPwdOpen(false)}>
                    取消
                  </Button>
                  {pwdStep === "input" ? (
                    <Button onClick={sendPwdOtpHandler} disabled={savingPwd}>
                      {savingPwd ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "发送验证码"
                      )}
                    </Button>
                  ) : (
                    <Button onClick={savePassword} disabled={savingPwd}>
                      {savingPwd ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "确认修改"
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 退出登录 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground size-10"
                  onClick={async () => {
                    await authClient.signOut();
                    window.location.href = "/";
                  }}
                >
                  <LogOut className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>退出登录</TooltipContent>
            </Tooltip>

            {/* 注销账号 */}
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-10"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>注销账号</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认注销账号？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将永久删除你的账号和所有相关数据，无法恢复。请输入当前密码以确认。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  type="password"
                  placeholder="当前密码"
                  value={deletePwd}
                  onChange={(e) => setDeletePwd(e.target.value)}
                  autoComplete="current-password"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletePwd("")}>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={deleting || !deletePwd}
                    onClick={deleteAccount}
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "确认注销"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── 自定义 API（BYOK）：平台每日额度用完后的自有 API 兜底 */}
      <div className="mt-6 shrink-0">
        <ByokCard />
      </div>

      {/* ── 使用情况 */}
      <div className="mt-6 flex flex-col">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 shrink-0">
          使用情况
        </p>
        {statsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        ) : stats ? (
          <div>
            <StatsCards stats={stats} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">暂无数据</p>
        )}
      </div>

    </div>
  );
}
