"use client";

import { Table as ReactTable } from "@tanstack/react-table";
import { REVIEW_STATUS_CONFIG } from "./reviewConfig";
import type { ReviewItem } from "./reviewColumns";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxEmpty,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxValue,
  ComboboxChipsInput,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, UsersRound, Info, X } from "lucide-react";
import { format } from "date-fns";
import { Fragment } from "react";
import { DateRange } from "react-day-picker";

/** 上传者多选筛选 */
export function UploaderFilter({ table }: { table: ReactTable<ReviewItem> }) {
  const anchor = useComboboxAnchor();
  const column = table.getColumn("uploadedBy");
  const selectedUploaders = (column?.getFilterValue() as string[]) || [];
  const allUploaders = Array.from(
    new Set(
      (table.getCoreRowModel().rows as { original: ReviewItem }[]).map(
        (row) => row.original.uploadedBy,
      ),
    ),
  );

  return (
    <div className="flex items-center gap-2">
      <UsersRound className="w-4 h-4 text-muted-foreground shrink-0" />
      <Combobox
        multiple
        autoHighlight
        items={allUploaders}
        value={selectedUploaders}
        onValueChange={(values) => {
          column?.setFilterValue(values.length ? values : undefined);
        }}
      >
        <ComboboxChips ref={anchor} className="min-w-[140px] w-auto bg-background">
          <ComboboxValue>
            {(values) => (
              <Fragment>
                {values.length === 0 && (
                  <span className="text-sm text-muted-foreground">上传者</span>
                )}
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

/** 状态多选筛选 */
export function StatusFilter({ table }: { table: ReactTable<ReviewItem> }) {
  const anchor = useComboboxAnchor();
  const column = table.getColumn("status");
  const selectedStatuses = (column?.getFilterValue() as string[]) || [];
  const statusItems = ["PENDING", "APPROVED", "REJECTED"];

  return (
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-muted-foreground shrink-0" />
      <Combobox
        multiple
        autoHighlight
        items={statusItems}
        value={selectedStatuses}
        onValueChange={(values) => {
          column?.setFilterValue(values.length ? values : undefined);
        }}
      >
        <ComboboxChips ref={anchor} className="min-w-[140px] w-auto bg-background">
          <ComboboxValue>
            {(values) => (
              <Fragment>
                {values.length === 0 && (
                  <span className="text-sm text-muted-foreground">状态</span>
                )}
                {values.map((value: string) => (
                  <ComboboxChip key={value}>
                    {REVIEW_STATUS_CONFIG[value]?.label ?? value}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxList>
            {statusItems.map((status) => (
              <ComboboxItem key={status} value={status}>
                {REVIEW_STATUS_CONFIG[status]?.label ?? status}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

/** 创建时间范围筛选 */
export function DateRangeFilter({
  table,
}: {
  table: ReactTable<ReviewItem>;
}) {
  const column = table.getColumn("createdAt");
  const dateFilter = table.options.meta?.dateFilter as
    | { from?: Date; to?: Date }
    | undefined;
  const setDateFilter = table.options.meta?.setDateFilter;
  const hasFilter = !!dateFilter?.from;

  const displayText = hasFilter
    ? `${format(dateFilter.from!, "yyyy-MM-dd")} 至 ${dateFilter.to ? format(dateFilter.to, "yyyy-MM-dd") : "现在"}`
    : "创建时间";

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateFilter?.(undefined);
    column?.setFilterValue(undefined);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 font-normal ${hasFilter ? "" : "text-muted-foreground"}`}
          >
            <CalendarDays className="h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateFilter as DateRange | undefined}
            onSelect={(range) => {
              if (range?.from) {
                setDateFilter?.(range);
                column?.setFilterValue(range);
              } else {
                setDateFilter?.(undefined);
                column?.setFilterValue(undefined);
              }
            }}
            numberOfMonths={1}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
      {hasFilter && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={clear}
          title="清除时间筛选"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
