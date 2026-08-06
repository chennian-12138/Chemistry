"use client";

import { RowData, ColumnDef, Table as ReactTable } from "@tanstack/react-table";
import { BadgeStatus } from "./reviewConfig";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { EllipsisVertical, ScanSearch } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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

import { deleteReaction } from "@/lib/api";
import { Trash2Icon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

export type ReviewItem = {
  id: string;
  name: string;
  uploadedBy: string;
  status: string;
  createdAt: string;
  mechanismType: string;
  form: string;
};

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    onDelete?: (id: string) => void;
    onBatchDelete?: (ids: string[]) => void;
    dateFilter?: DateRange;
    setDateFilter?: (filter: DateRange | undefined) => void;
    onBatchApprove?: (ids: string[]) => void;
    onBatchReject?: (ids: string[], reason: string) => void;
  }
}

// 行操作菜单项
function ActionItem({
  row,
  table,
}: {
  row: ReviewItem;
  table: ReactTable<ReviewItem>;
}) {
  const router = useRouter();
  const status = row.status;
  const canModify = status === "PENDING";
  const handleDelete = async () => {
    await deleteReaction(row.id);
    table.options.meta?.onDelete?.(row.id);
    toast.success("删除成功", { position: "top-center" });
  };

  return (
    <>
      <DropdownMenuItem
        onClick={() => router.push(`/dashboard/review/${row.id}`)}
      >
        审核
        <DropdownMenuShortcut>
          <ScanSearch />
        </DropdownMenuShortcut>
      </DropdownMenuItem>

      {canModify && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              删除
              <DropdownMenuShortcut>
                <Trash2Icon />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除 {row.name}吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export const columns: ColumnDef<ReviewItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="h-4 w-4"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="h-4 w-4"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: () => <div className="text-center font-bold">反应名称</div>,
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "uploadedBy",
    header: () => <div className="text-center font-bold">上传者</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("uploadedBy")}</div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(columnId) as string);
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center font-bold">状态</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <BadgeStatus status={row.getValue("status")} />
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(columnId));
    },
  },
  {
    accessorKey: "mechanismType",
    header: () => <div className="text-center font-bold">机理类型</div>,
    cell: ({ row }) => (
      <div className="text-center text-xs text-muted-foreground max-w-40 truncate">
        {row.getValue("mechanismType") || "—"}
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(columnId) as string);
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-center font-bold">创建时间</div>,
    cell: ({ row }) => (
      <div className="text-center text-sm text-muted-foreground">
        {formatTime(row.getValue("createdAt"))}
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      const rowDate = new Date(row.getValue(columnId));
      const { from, to } = filterValue || {};

      if (!from) return true;
      if (to) {
        return rowDate >= from && rowDate <= to;
      }
      return rowDate >= from;
    },
  },
  {
    id: "action",
    header: () => <div className="text-center font-bold">操作</div>,
    cell: ({ row, table }) => {
      const data = row.original;

      return (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-center">
                功能
              </DropdownMenuLabel>
              <Separator />
              <ActionItem row={data} table={table} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
