"use client";
import { useState, useEffect } from "react";
import { useReviewStore } from "@/store/review-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  getSortedRowModel,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
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
  Trash2Icon,
  Search,
  CheckIcon,
  XIcon,
  ClipboardList,
} from "lucide-react";
import { columns } from "./reviewColumns";
import {
  UploaderFilter,
  StatusFilter,
  DateRangeFilter,
} from "./reviewFilters";
import { deleteReaction, approveReaction, rejectReaction } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

export default function ReviewPage() {
  const {
    data,
    setData,
    columnFilters,
    setColumnFilters,
    dateFilter,
    setDateFilter,
    hasFetched,
    pageIndex,
    setPageIndex,
    removeItem,
    removeItems,
    updateItem,
  } = useReviewStore();

  const [rowSelection, setRowSelection] = useState({});
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (hasFetched) return; // 已缓存，不重复请求
    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/list`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setData);
  }, [hasFetched, setData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(columnFilters) : updater;
      setColumnFilters(next);
    },
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      rowSelection,
      columnFilters,
      pagination: { pageIndex, pageSize: 14 },
    },
    onPaginationChange: (updater) => {
      const prev = { pageIndex, pageSize: 14 };
      const next = typeof updater === "function" ? updater(prev) : updater;
      setPageIndex(next.pageIndex);
    },
    meta: {
      onDelete: (deletedId: string) => {
        removeItem(deletedId);
      },
      onBatchDelete: async (ids: string[]) => {
        await Promise.all(ids.map((id) => deleteReaction(id)));
        removeItems(ids);
        setRowSelection({});
      },
      onBatchApprove: async (ids: string[]) => {
        await Promise.all(ids.map((id) => approveReaction(id)));
        ids.forEach((id) => updateItem(id, { status: "APPROVED" }));
        setRowSelection({});
      },
      onBatchReject: async (ids: string[], reason: string) => {
        await Promise.all(ids.map((id) => rejectReaction(id, reason)));
        ids.forEach((id) => updateItem(id, { status: "REJECTED" }));
        setRowSelection({});
      },
      dateFilter: dateFilter as DateRange | undefined,
      setDateFilter: setDateFilter as (filter: DateRange | undefined) => void,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;
  const selectedRows = Object.keys(rowSelection).map(
    (idx) => data[parseInt(idx)],
  );
  const hasNonPending = selectedRows.some((row) => row.status !== "PENDING");

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* 顶部工具栏：搜索 + 筛选器 + 批量操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="筛选反应名称..."
              value={
                (table.getColumn("name")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="pl-9"
            />
          </div>
          <UploaderFilter table={table} />
          <StatusFilter table={table} />
          <DateRangeFilter table={table} />
        </div>

        {selectedCount > 0 && !hasNonPending && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
            <Badge variant="secondary" className="mr-1 text-xs">
              已选 {selectedCount} 项
            </Badge>

            {/* 批量通过 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  通过
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>批量通过审核？</AlertDialogTitle>
                  <AlertDialogDescription>
                    这将通过 {selectedCount} 个词条的审核
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const selectedIds = Object.keys(rowSelection).map(
                        (idx) => data[parseInt(idx)].id,
                      );
                      await table.options.meta?.onBatchApprove?.(selectedIds);
                      toast.success(`已成功通过 ${selectedIds.length} 条记录`);
                    }}
                  >
                    通过
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 批量拒绝 */}
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) setRejectReason("");
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <XIcon className="h-4 w-4 text-red-500" />
                  拒绝
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>批量拒绝？</AlertDialogTitle>
                  <AlertDialogDescription>
                    请输入拒绝原因，将反馈给上传者：
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="拒绝原因"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={async () => {
                      if (!rejectReason.trim()) {
                        toast.error("请输入拒绝原因");
                        return;
                      }
                      const selectedIds = Object.keys(rowSelection).map(
                        (idx) => data[parseInt(idx)].id,
                      );
                      await table.options.meta?.onBatchReject?.(
                        selectedIds,
                        rejectReason.trim(),
                      );
                      toast.success(`已拒绝 ${selectedIds.length} 条记录`);
                    }}
                  >
                    拒绝
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 批量删除 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                    <Trash2Icon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>批量删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    这将删除掉 {selectedCount} 个词条，您确定要继续吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={async () => {
                      const selectedIds = Object.keys(rowSelection).map(
                        (idx) => data[parseInt(idx)].id,
                      );
                      await table.options.meta?.onBatchDelete?.(selectedIds);
                      toast.success(`已成功删除 ${selectedIds.length} 条记录`, {
                        position: "top-center",
                      });
                    }}
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-auto border rounded-lg shadow-sm">
        <Table className="w-full">
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.id === "select" ? "w-[50px]" : "whitespace-nowrap"
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 opacity-30" />
                    <span className="text-sm">暂无数据</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页器 */}
      <div className="flex items-center justify-between px-2">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          已选择 {table.getFilteredSelectedRowModel().rows.length} 条，共{" "}
          {table.getFilteredRowModel().rows.length} 条
        </div>

        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            第 {table.getState().pagination.pageIndex + 1} 页，共{" "}
            {table.getPageCount()} 页
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
