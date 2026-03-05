"use client";
import { useState, useEffect } from "react";
import { useReviewStore } from "@/store/review-store";
import { Button } from "@/components/ui/button";
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
import { Trash2Icon, Search, CheckIcon, XIcon } from "lucide-react";
import { columns } from "./reviewColumns";
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

  useEffect(() => {
    if (hasFetched) return; // 已缓存，不重复请求
    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/list`)
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

  const selectedRows = Object.keys(rowSelection).map(
    (idx) => data[parseInt(idx)],
  );
  const hasNonPending = selectedRows.some((row) => row.status !== "PENDING");

  return (
    <div className="grid grid-rows-[auto_780px_auto]">
      {/* 如下为该页面的顶部 */}
      <div className="flex items-center justify-between pl-6">
        <div className="flex items-center gap-2">
          <Search />
          <Input
            placeholder="筛选反应名称"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm ml-5"
          />
        </div>
        {Object.keys(rowSelection).length > 0 && !hasNonPending && (
          <div className="flex items-center gap-2 mr-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <CheckIcon /> {/* 通过图标 */}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>批量通过审核？</AlertDialogTitle>
                  <AlertDialogDescription>
                    这将通过 {Object.keys(rowSelection).length} 个词条的审核
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Trash2Icon />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                    <Trash2Icon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>批量删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    这将删除掉 {Object.keys(rowSelection).length}{" "}
                    个词条，您确定要继续吗？
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
                </AlertDialogFooter>{" "}
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <XIcon /> {/* 拒绝图标 */}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>批量拒绝？</AlertDialogTitle>
                  <AlertDialogDescription>
                    请输入拒绝原因：
                  </AlertDialogDescription>
                  {/* 添加输入框让用户输入原因 */}
                  <Input id="reason" placeholder="拒绝原因" className="mt-2" />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const reason = (
                        document.getElementById("reason") as HTMLInputElement
                      ).value;
                      if (!reason) {
                        toast.error("请输入拒绝原因");
                        return;
                      }
                      const selectedIds = Object.keys(rowSelection).map(
                        (idx) => data[parseInt(idx)].id,
                      );
                      await table.options.meta?.onBatchReject?.(
                        selectedIds,
                        reason,
                      );
                      toast.success(`已拒绝 ${selectedIds.length} 条记录`);
                    }}
                  >
                    拒绝
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* 如下为该页面的表格 */}
      <div className="p-6">
        <div className="overflow-auto border rounded-lg ">
          <Table className="w-full">
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const widthClass =
                      header.id === "select"
                        ? "w-[50px]"
                        : header.id === "name"
                          ? "w-[100px]"
                          : header.id === "uploadedBy"
                            ? "w-[100px]"
                            : header.id === "status"
                              ? "w-[100px]"
                              : header.id === "createdAt"
                                ? "w-[150px]"
                                : "w-[60px]";

                    return (
                      <TableHead
                        key={header.id}
                        className={`text-center font-bold ${widthClass}`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 如下为该页面的分页器，也就是尾部部分 */}
      <div className="">
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            已选择{table.getFilteredSelectedRowModel().rows.length}条， 共
            {table.getFilteredRowModel().rows.length}条
          </div>

          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              {/* <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label> */}
              {/* <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 13, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </div>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              第{table.getState().pagination.pageIndex + 1}页， 共
              {table.getPageCount()}页
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
    </div>
  );
}
