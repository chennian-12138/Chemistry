"use client";

import {
  RowData,
  ColumnDef,
  Table as ReactTable,
  Column,
} from "@tanstack/react-table";
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
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxValue,
  ComboboxChipsInput,
} from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { deleteReaction } from "@/lib/api";
import { Trash2Icon, CalendarDays, UsersRound, Info } from "lucide-react";
import { format } from "date-fns";
import { Fragment } from "react";
import { DateRange } from "react-day-picker"; // 或从 calendar 组件导入
import { useComboboxAnchor } from "@/components/ui/combobox";
import { toast } from "sonner";

export type ReviewItem = {
  id: string;
  name: string;
  uploadedBy: string;
  status: string;
  createdAt: string;
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

// 这里定义了两个展开按钮
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
    await deleteReaction(row.id); // 调用删除 API
    table.options.meta?.onDelete?.(row.id); // 调用回调，通知父组件更新
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

function UploaderFilter({
  column,
  table,
}: {
  column: Column<ReviewItem, unknown>;
  table: ReactTable<ReviewItem>;
}) {
  const anchor = useComboboxAnchor();
  const selectedUploaders = (column.getFilterValue() as string[]) || [];
  const allUploaders = Array.from(
    new Set(
      (table.getCoreRowModel().rows as { original: ReviewItem }[]).map(
        (row) => row.original.uploadedBy,
      ),
    ),
  );

  return (
    <div className="flex items-center">
      <UsersRound className="w-5 h-5 mr-2" />
      <Combobox
        multiple
        autoHighlight
        items={allUploaders}
        value={selectedUploaders}
        onValueChange={(values) => {
          column.setFilterValue(values.length ? values : undefined);
        }}
      >
        <ComboboxChips ref={anchor} className="w-auto justify-center bg-white">
          <ComboboxValue>
            {(values) => (
              <Fragment>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{value}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {allUploaders.map((uploader: string) => (
              <ComboboxItem key={uploader} value={uploader}>
                {uploader}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function StatusFilter({ column }: { column: Column<ReviewItem, unknown> }) {
  const anchor = useComboboxAnchor();

  const selectedStatuses = (column.getFilterValue() as string[]) || [];

  const statusItems = ["PENDING", "APPROVED", "REJECTED"];
  const statusLabels: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "通过",
    REJECTED: "待修改",
  };

  return (
    <div className="flex items-center">
      <Info className="w-5 h-5 mr-2" />
      <Combobox
        multiple
        autoHighlight
        items={statusItems}
        value={selectedStatuses}
        onValueChange={(values) => {
          column.setFilterValue(values.length ? values : undefined);
        }}
      >
        <ComboboxChips ref={anchor} className="w-auto justify-center bg-white">
          <ComboboxValue>
            {(values) => (
              <Fragment>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{statusLabels[value]}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {statusItems.map((status) => (
              <ComboboxItem key={status} value={status}>
                {statusLabels[status]}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export const columns: ColumnDef<ReviewItem>[] = [
  {
    id: "select",
    // header:({table})=>(
    //   <Checkbox
    //     checked={
    //       table.getIsAllPageRowsSelected() ||
    //       (table.getIsSomePageRowsSelected() && "indeterminate")
    //     }
    //     onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //     aria-label="Select all"
    //   />
    // ),
    cell: ({ row }) => (
      <div className="text-center w-[50px]">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="h-5 w-5"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   accessorKey: "id",
  //   header: ({ column }) => {
  //     return (
  //       <Button
  //         variant="ghost"
  //         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //       >
  //         Email
  //         <ArrowUpDown className="ml-2 h-4 w-4" />
  //       </Button>
  //     )
  //   },
  // },
  {
    accessorKey: "name",
    header: () => <div className="text-center">反应名称</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "uploadedBy",
    header: ({ column, table }) => {
      return (
        <div className="text-center">
          <UploaderFilter column={column} table={table} />
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="ml-25">{row.getValue("uploadedBy")}</div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(columnId) as string);
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <StatusFilter column={column} />
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="ml-25">
        <BadgeStatus status={row.getValue("status")} />
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(columnId));
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column, table }) => {
      const dateFilter = table.options.meta?.dateFilter as
        | { from?: Date; to?: Date }
        | undefined;
      const setDateFilter = table.options.meta?.setDateFilter;
      const displayText = dateFilter?.from
        ? `${format(dateFilter.from, "yyyy-MM-dd")} 至 ${dateFilter.to ? format(dateFilter.to, "yyyy-MM-dd") : "现在"}`
        : "创建时间";

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-normal">
              <CalendarDays className="mr-2 h-4 w-4" />
              {displayText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateFilter as DateRange | undefined}
              onSelect={(range) => {
                // 确保 from 存在时才设置
                if (range?.from) {
                  setDateFilter?.(range);
                  column.setFilterValue(range);
                } else {
                  setDateFilter?.(undefined);
                  column.setFilterValue(undefined);
                }
              }}
              numberOfMonths={1}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      );
    },
    cell: ({ row }) => (
      <div className="text-center text-sm text-gray-600">
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
    cell: ({ row, table }) => {
      const data = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-center">功能</DropdownMenuLabel>
            <Separator />
            <ActionItem row={data} table={table} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
