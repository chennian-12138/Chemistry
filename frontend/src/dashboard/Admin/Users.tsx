"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Users,
  Loader2,
  ShieldCheck,
  Shield,
  User,
  Ban,
  CheckCircle2,
  Unlock,
  KeyRound,
  FlaskConical,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUsers,
  updateAdminUserRole,
  banAdminUser,
  unbanAdminUser,
  getAdminUserStats,
  type AdminUser,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";

const ROLE_ICONS = {
  SUPERADMIN: ShieldCheck,
  ADMIN: Shield,
  USER: User,
} as const;

const ROLE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  SUPERADMIN: {
    label: "超级管理员",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  },
  ADMIN: {
    label: "管理员",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  USER: {
    label: "普通用户",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    className: "bg-muted text-muted-foreground border-border",
  };
  const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] ?? User;
  return (
    <Badge variant="outline" className={`gap-1.5 px-2.5 py-0.5 text-xs ${config.className}`}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

function BanBadge({ banned }: { banned: boolean | null }) {
  if (!banned) return null;
  return (
    <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs bg-red-500/10 text-red-600 border-red-500/30">
      <Ban className="size-3" />
      已封禁
    </Badge>
  );
}

// 用户统计弹窗
function UserStatsDialog({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setStats(null);
    getAdminUserStats(user.id)
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, user.id]);

  const browseTotal = stats?.browsing?.total ?? {};
  const browseRecent = stats?.browsing?.recent30d ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
          <Users className="size-4" />
          统计
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user.name || user.email} 的使用统计</DialogTitle>
          <DialogDescription>管理员视角的用户活跃度概览</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatItem icon={FlaskConical} label="上传反应" value={stats.content?.reactions ?? 0} />
              <StatItem icon={MessagesSquare} label="AI 会话" value={stats.content?.conversations ?? 0} />
              <StatItem icon={CheckCircle2} label="审核次数" value={stats.content?.reviews ?? 0} />
              <StatItem icon={Unlock} label="草稿数" value={stats.content?.drafts ?? 0} />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">功能使用（累计 / 近30天）</p>
              {(["AI_CHAT", "RETRO_SYNTHESIS", "REACTDIC", "PAPER"] as const).map((type) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {{ AI_CHAT: "AI 问答", RETRO_SYNTHESIS: "逆合成", REACTDIC: "反应查询", PAPER: "文献" }[type]}
                  </span>
                  <span className="tabular-nums">
                    {browseTotal[type] ?? 0}
                    <span className="text-xs text-muted-foreground ml-2">
                      近30天 {browseRecent[type] ?? 0}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-3">
      <Icon className="size-4 text-primary/70 shrink-0" />
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// 角色修改（仅 SUPERADMIN）
function RoleSelect({
  user,
  isSuperAdmin,
  onChanged,
}: {
  user: AdminUser;
  isSuperAdmin: boolean;
  onChanged: (role: string) => void;
}) {
  const [value, setValue] = useState<string>(user.role);
  const [saving, setSaving] = useState(false);

  if (!isSuperAdmin) return <RoleBadge role={user.role} />;

  const handleChange = async (role: string) => {
    if (role === user.role) return;
    setSaving(true);
    const res = await updateAdminUserRole(user.id, role);
    setSaving(false);
    if (res.success) {
      setValue(role);
      toast.success(`已将 ${user.name || user.email} 设为 ${role}`);
      onChanged(role);
    } else {
      toast.error(res.error || "修改失败");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USER">普通用户</SelectItem>
          <SelectItem value="ADMIN">管理员</SelectItem>
          <SelectItem value="SUPERADMIN">超级管理员</SelectItem>
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

// 封禁 / 解封
function BanActions({
  user,
  isSelf,
  onChanged,
}: {
  user: AdminUser;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isSelf) return null;

  if (user.banned) {
    const handleUnban = async () => {
      setBusy(true);
      const res = await unbanAdminUser(user.id);
      setBusy(false);
      if (res.success) {
        toast.success("已解封");
        onChanged();
      } else {
        toast.error(res.error || "解封失败");
      }
    };
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" disabled={busy}>
            <Unlock className="size-4" />
            解封
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-emerald-500/10 text-emerald-600">
              <Unlock />
            </AlertDialogMedia>
            <AlertDialogTitle>解封用户？</AlertDialogTitle>
            <AlertDialogDescription>
              将解除对 {user.name || user.email} 的封禁。
              {user.banReason && <span className="block mt-2 text-xs">封禁原因：{user.banReason}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnban}>确认解封</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const handleBan = async () => {
    setBusy(true);
    const res = await banAdminUser(user.id, reason.trim() || undefined);
    setBusy(false);
    if (res.success) {
      toast.success("已封禁");
      setReason("");
      onChanged();
    } else {
      toast.error(res.error || "封禁失败");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-destructive" disabled={busy}>
          <Ban className="size-4" />
          封禁
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Ban />
          </AlertDialogMedia>
          <AlertDialogTitle>封禁用户？</AlertDialogTitle>
          <AlertDialogDescription>
            封禁后 {user.name || user.email} 将无法登录和使用平台。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ban-reason">封禁原因（可选）</Label>
          <Input
            id="ban-reason"
            placeholder="例如：发布违规内容"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleBan}>
            确认封禁
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminUsers() {
  const { data: session } = useSession();
  const currentUser = session?.user as unknown as { role?: string; id?: string };
  const isSuperAdmin = currentUser?.role?.toLowerCase() === "superadmin";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [bannedFilter, setBannedFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await getAdminUsers({
      page,
      pageSize,
      search: search || undefined,
      role: roleFilter,
      banned: bannedFilter === "ALL" ? undefined : bannedFilter,
    });
    setLoading(false);
    if (res.success && res.data) {
      setUsers(res.data.users);
      setTotal(res.data.total);
    }
  }, [page, pageSize, search, roleFilter, bannedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight">用户管理</h2>
          <p className="text-sm text-muted-foreground">
            共 {total} 名用户 · {isSuperAdmin ? "角色变更仅超级管理员可用" : "角色变更需超级管理员权限"}
          </p>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名 / 邮箱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部角色</SelectItem>
            <SelectItem value="USER">普通用户</SelectItem>
            <SelectItem value="ADMIN">管理员</SelectItem>
            <SelectItem value="SUPERADMIN">超级管理员</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bannedFilter} onValueChange={(v) => { setBannedFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="封禁状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            <SelectItem value="true">已封禁</SelectItem>
            <SelectItem value="false">未封禁</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 用户表 */}
      <div className="overflow-auto rounded-lg border">
        <Table className="w-full">
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="text-center">上传反应</TableHead>
              <TableHead className="text-center">会话</TableHead>
              <TableHead>BYOK</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48">
                  <div className="flex justify-center">
                    <Loader2 className="size-8 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Users className="size-10 opacity-30" />
                    <span className="text-sm">暂无用户</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={u.image ?? undefined} alt={u.name ?? ""} />
                          <AvatarFallback className="text-xs">
                            {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{u.name || "—"}</span>
                            <BanBadge banned={u.banned} />
                            {isSelf && <Badge variant="secondary" className="text-xs">我</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleSelect
                        user={u}
                        isSuperAdmin={isSuperAdmin}
                        onChanged={() => setReloadKey((k) => k + 1)}
                      />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{u.stats.reactions}</TableCell>
                    <TableCell className="text-center tabular-nums">{u.stats.conversations}</TableCell>
                    <TableCell>
                      {u.hasLlmConfig ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <KeyRound className="size-3" />
                          {u.llmModel || "已配置"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <UserStatsDialog user={u} />
                        <BanActions
                          user={u}
                          isSelf={isSelf}
                          onChanged={() => setReloadKey((k) => k + 1)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          共 {total} 条 · 第 {page} / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setPage(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
