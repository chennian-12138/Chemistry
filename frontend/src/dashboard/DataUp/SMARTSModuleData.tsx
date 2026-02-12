"use client";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

import { type DataupSchema } from "@/types/dataup-shema";
import { useFormContext, useFieldArray } from "react-hook-form";

interface SMARTSModuleDataProps {
  index: number;
  onRemove?: () => void;
}

export default function SMARTSModuleData({
  index,
  onRemove,
}: SMARTSModuleDataProps) {
  const { control } = useFormContext<DataupSchema>();

  // 反应物数组
  const {
    fields: reactantFields,
    append: appendReactant,
    remove: removeReactant,
  } = useFieldArray({
    control,
    name: `smartsPatterns.${index}.patternReactants`,
  });

  // 试剂数组
  const {
    fields: reagentFields,
    append: appendReagent,
    remove: removeReagent,
  } = useFieldArray({
    control,
    name: `smartsPatterns.${index}.patternRegents`,
  });

  // 产物数组
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control,
    name: `smartsPatterns.${index}.patternProducts`,
  });

 return (
  <CardContent>
    <FieldSet className="border p-4 rounded-lg relative">
      {/* 删除按钮可以在这里添加 */}
      <FieldLegend className="text-base">第{index + 1}部分</FieldLegend>
      
      <FieldGroup className="space-y-4">
        <Field>
          <FieldLabel>模式名称</FieldLabel>
          <Input
            placeholder="如：Hofmann降解:卤素分子"
            {...control.register(`smartsPatterns.${index}.name`)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          {/* 反应物列 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <FieldLabel>反应物</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => appendReactant({ smarts: "", name: "", role: "反应物" })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {reactantFields.map((field, idx) => (
              <div key={field.id} className="space-y-2 relative group">
                <Input
                  placeholder="SMARTS 表达式"
                  {...control.register(`smartsPatterns.${index}.patternReactants.${idx}.smarts`)}
                />
                <Input
                  placeholder="名称描述"
                  {...control.register(`smartsPatterns.${index}.patternReactants.${idx}.name`)}
                />
                {reactantFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReactant(idx)}
                    className="absolute -right-2 -top-2 text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 催化剂/试剂列 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <FieldLabel>催化剂/试剂</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => appendReagent({ smarts: "", name: "", role: "反应试剂" })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {reagentFields.map((field, idx) => (
              <div key={field.id} className="space-y-2 relative group">
                <Input
                  placeholder={`[OH-]::氢氧根负离子`}
                  {...control.register(`smartsPatterns.${index}.patternRegents.${idx}.smarts`)}
                />
                <Input
                  placeholder="名称"
                  {...control.register(`smartsPatterns.${index}.patternRegents.${idx}.name`)}
                />
                {reagentFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReagent(idx)}
                    className="absolute -right-2 -top-2 text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 生成物列 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <FieldLabel>生成物</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => appendProduct({ smarts: "", name: "", role: "产物" })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {productFields.map((field, idx) => (
              <div key={field.id} className="space-y-2 relative group">
                <Input
                  placeholder="SMARTS 表达式"
                  {...control.register(`smartsPatterns.${index}.patternProducts.${idx}.smarts`)}
                />
                <Input
                  placeholder="名称描述"
                  {...control.register(`smartsPatterns.${index}.patternProducts.${idx}.name`)}
                />
                {productFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(idx)}
                    className="absolute -right-2 -top-2 text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </FieldGroup>
    </FieldSet>
    </CardContent>
  );
}