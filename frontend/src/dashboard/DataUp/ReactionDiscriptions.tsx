"use client";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import Composer from "@/components/kekule-react/composer";
import { X, Plus } from "lucide-react";

import {
  DataupSchema,
  sectionTypes,
  conditionFieldsConfig,
} from "@/types/dataup-shema";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";

interface Props {
  index: number;
}

const labelMap: Record<string, string> = {
  Temperature: "温度",
  Pressure: "压力",
  Duration: "时间",
  Concentration: "浓度",
  SolventTypes: "溶剂类型",
  AcidityBasicity: "酸碱性",
  HydroOpts: "水含量",
};

const fieldNameMap: Record<string, string> = {
  Temperature: "temperature",
  Pressure: "pressure",
  Duration: "duration",
  Concentration: "concentration",
  SolventTypes: "solvent",
  AcidityBasicity: "acidityBasicity",
  HydroOpts: "hydro",
};

export default function ReactionDiscriptions({ index }: Props) {
  const { control, register } = useFormContext<DataupSchema>();

  // 管理反应式数组（Kekule JSON 字符串数组）
  const {
    fields: reactionFields,
    append: appendReaction,
    remove: removeReaction,
  } = useFieldArray({
    control,
    name: `reactionSections.${index}.reactions`,
  });

  // 管理描述数组
  const {
    fields: descriptionFields,
    append: appendDescription,
    remove: removeDescription,
  } = useFieldArray({
    control,
    name: `reactionSections.${index}.descriptions`,
  });

  return (
    <CardContent>
      <FieldSet className="border p-4 rounded-lg">
        <FieldLegend>反应介绍{index + 1}</FieldLegend>

        <FieldGroup className="space-y-6">
          {/* 反应类型选择 */}
          <Field>
            <FieldLabel>反应类型</FieldLabel>
            <Controller
              name={`reactionSections.${index}.sectionType`}
              control={control}
              render={({ field }) => (
                <Combobox value={field.value} onValueChange={field.onChange}>
                  <ComboboxInput placeholder="如：通式与概述" />
                  <ComboboxContent>
                    <ComboboxList>
                      {sectionTypes.map((type) => (
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
            <FieldLabel>反应条件</FieldLabel>
            <div
              className="grid  gap-4"
              style={{
                gridTemplateColumns: `repeat(${conditionFieldsConfig.length}, minmax(0, 1fr))`,
              }}
            >
              {conditionFieldsConfig.map(({ label, field, options }) => (
                <Field key={field}>
                  <FieldLabel>{label}</FieldLabel>
                  <Controller
                    name={`reactionSections.${index}.${field}`}
                    control={control}
                    render={({ field: controllerField }) => (
                      <Combobox
                        value={controllerField.value || "-"}
                        onValueChange={controllerField.onChange}
                      >
                        <ComboboxInput placeholder={`选择${label}`} />
                        <ComboboxContent>
                          <ComboboxList>
                            {options.map((option) => (
                              <ComboboxItem key={option} value={option}>
                                {option}
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    )}
                  />
                </Field>
              ))}
            </div>
          </Field>

          {/* 反应式区域 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <FieldLabel>反应式（{reactionFields.length} 个）</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendReaction({ value: "" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加反应式
              </Button>
            </div>

            {reactionFields.map((field, idx) => (
              <div key={field.id} className="relative group p-2 h-[600px]">
                <Controller
                  name={`reactionSections.${index}.reactions.${idx}`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Composer
                      value={value?.value ?? ""}
                      onChange={(json) => {
                        console.log(json);
                        onChange({ value: json });
                      }}
                      className="w-full"
                    />
                  )}
                />
                {reactionFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReaction(idx)}
                    className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* {reactionFields.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded">
                暂无反应式，请点击上方按钮添加
              </p>
            )} */}

          {/* 描述区域 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <FieldLabel>反应描述（{descriptionFields.length} 条）</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendDescription({ description: "", refPageNo: "" })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                添加描述
              </Button>
            </div>

            <div className="space-y-4">
              {descriptionFields.map((field, idx) => (
                <div key={field.id} className="relative group p-3 space-y-3">
                  <Field className="flex flex-col gap-2">
                    <FieldLabel>描述文本</FieldLabel>
                    <Controller
                      name={`reactionSections.${index}.descriptions.${idx}.description`}
                      control={control}
                      render={({ field }) => (
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="输入该反应的描述"
                        />
                      )}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>教科书页码</FieldLabel>
                    <Input
                      placeholder="如：第123页"
                      {...register(
                        `reactionSections.${index}.descriptions.${idx}.refPageNo`,
                      )}
                    />
                  </Field>

                  {descriptionFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDescription(idx)}
                      className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* {idx < descriptionFields.length - 1 && <FieldSeparator className="mt-12" />} */}
                </div>
              ))}
            </div>

            {/* {descriptionFields.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded">
                暂无描述，请点击上方按钮添加
              </p>
            )} */}
          </div>
        </FieldGroup>
      </FieldSet>
    </CardContent>
  );
}
