"use client";
// 导入UI内容，来自于https://ui.shadcn.com
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

// 导入表单相关内容
import {
  mechanismTypes,
  reactionForms,
  type DataupSchema,
} from "@/types/dataup-shema";
import { useFormContext, Controller } from "react-hook-form";

export default function ReactionMetaData() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DataupSchema>();

  const nameError = errors.meta?.name?.message;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>反应元数据</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <Field>
            <Label>反应名称</Label>
            <Input
              placeholder="如：羟醛缩合"
              {...register("meta.name")}
              aria-invalid={nameError ? "true" : "false"}
            />
          </Field>

          <Field>
            <Label>反应类型</Label>
            {/* 这里使用controller包裹，是因为Combobox并非是原生组件，所以使用controller */}
            <Controller
              name="meta.mechanismType"
              control={control}
              render={({ field }) => (
                <Combobox value={field.value} onValueChange={field.onChange}>
                  <ComboboxInput placeholder="选择反应类型" />
                  <ComboboxContent>
                    <ComboboxList>
                      {mechanismTypes.map((type) => (
                        <ComboboxItem key={type} value={type}>
                          {type}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
          </Field>

          <Field>
            <Label>反应形式</Label>
            <Controller
              name="meta.form"
              control={control}
              render={({ field }) => (
                <Combobox value={field.value} onValueChange={field.onChange}>
                  <ComboboxInput placeholder="选择反应形式" />
                  <ComboboxContent>
                    <ComboboxList>
                      {reactionForms.map((form) => (
                        <ComboboxItem key={form} value={form}>
                          {form}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
          </Field>

          <Field>
            <Label>标签</Label>
            <Input
              placeholder="用英文逗号分隔多个标签，如：有机合成,催化剂"
              {...register("meta.tags")}
            ></Input>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
