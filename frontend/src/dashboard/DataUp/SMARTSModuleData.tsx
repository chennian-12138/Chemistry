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
import { Button } from "@/components/ui/button";
import { X, Plus, Shield, Check, Trash2, FlaskConical } from "lucide-react";

import { type DataupSchema } from "@/types/dataup-shema";
import { useFormContext, useFieldArray } from "react-hook-form";
import SmartValidatorDialog from "@/components/commonUI/SmartValidatorDialog";
import ReactionPredictDialog from "./ReactionPredictDialog";
import { useState } from "react";
import { useDataUpActions } from "@/hooks/use-dataup-action";

interface SMARTSModuleDataProps {
  index: number;
  onRemove?: () => void;
}

export default function SMARTSModuleData({
  index,
  onRemove,
}: SMARTSModuleDataProps) {
  const { control, getValues, setValue, watch } =
    useFormContext<DataupSchema>();
  const { actions } = useDataUpActions();

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

  // 验证状态 - 使用对象存储多个对话框的状态
  // key 格式: "type-index" (如 "reactant-0", "reagent-1")
  const [validatorState, setValidatorState] = useState<
    Record<string, { open: boolean; smarts: string }>
  >({});

  // 打开验证对话框
  const openValidator = (
    type: "reactant" | "reagent" | "product",
    idx: number,
  ) => {
    const key = `${type}-${idx}`;
    let smartsValue = "";

    if (type === "reactant") {
      smartsValue =
        getValues(`smartsPatterns.${index}.patternReactants.${idx}.smarts`) ||
        "";
    } else if (type === "reagent") {
      smartsValue =
        getValues(`smartsPatterns.${index}.patternRegents.${idx}.smarts`) || "";
    } else {
      smartsValue =
        getValues(`smartsPatterns.${index}.patternProducts.${idx}.smarts`) ||
        "";
    }

    setValidatorState((prev) => ({
      ...prev,
      [key]: { open: true, smarts: smartsValue },
    }));
  };

  // 关闭验证对话框
  const closeValidator = (
    type: "reactant" | "reagent" | "product",
    idx: number,
  ) => {
    const key = `${type}-${idx}`;
    setValidatorState((prev) => ({
      ...prev,
      [key]: { ...prev[key], open: false },
    }));
  };

  // 反应预测校验对话框状态
  const [predictDialogOpen, setPredictDialogOpen] = useState(false);

  // 当前 pattern 的数据
  const currentPattern = watch(`smartsPatterns.${index}`);
  const isPredictValidated = watch(
    `smartsPatterns.${index}.reactionPredictValidated`,
  );

  return (
    <CardContent>
      <FieldSet className="border p-4 rounded-lg relative">
        <div className="flex justify-between items-center mb-4">
          <FieldLegend className="text-base mb-0">
            第{index + 1}部分
          </FieldLegend>
          <div className="flex gap-2">
            {onRemove && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onRemove}
                className="bg-red-100 hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600 font-bold" />
              </Button>
            )}
            <Button
              type="button"
              variant={"outline"}
              size="sm"
              className={
                isPredictValidated
                  ? "bg-green-50 hover:bg-green-100 text-green-600 border-green-200 gap-1.5"
                  : "gap-1.5"
              }
              onClick={() => setPredictDialogOpen(true)}
              title={
                isPredictValidated ? "反应预测校验已通过" : "进行反应预测校验"
              }
            >
              {isPredictValidated ? (
                <Check className="w-4 h-4" />
              ) : (
                <FlaskConical className="w-4 h-4" />
              )}
              {/* {isPredictValidated ? "预测校验通过" : "反应预测校验"} */}
            </Button>
          </div>
        </div>

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
                  onClick={() =>
                    appendReactant({ smarts: "", name: "", role: "反应物" })
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {reactantFields.map((field, idx) => {
                const key = `reactant-${idx}`;
                const state = validatorState[key] || {
                  open: false,
                  smarts: "",
                };
                return (
                  <div key={field.id} className="space-y-2 relative group">
                    <div className="flex justify-between items-center gap-2">
                      <Input
                        placeholder="SMARTS 表达式"
                        {...control.register(
                          `smartsPatterns.${index}.patternReactants.${idx}.smarts`,
                          {
                            onChange: () => {
                              setValue(
                                `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                                false,
                              );
                              setValue(
                                `smartsPatterns.${index}.reactionPredictValidated`,
                                false,
                              );
                            },
                          },
                        )}
                      />

                      <Button
                        type="button"
                        variant={
                          watch(
                            `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                          )
                            ? "default"
                            : "outline"
                        }
                        className={
                          watch(
                            `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                          )
                            ? "bg-white hover:bg-white text-green-500"
                            : ""
                        }
                        size="icon"
                        onClick={() => openValidator("reactant", idx)}
                        title={
                          watch(
                            `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                          )
                            ? "验证成功"
                            : "验证 SMARTS"
                        }
                      >
                        {watch(
                          `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                        ) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <SmartValidatorDialog
                      Open={state.open}
                      onOpenChange={() => closeValidator("reactant", idx)}
                      smarts={state.smarts}
                      onValidate={(success) => {
                        if (success) {
                          setValue(
                            `smartsPatterns.${index}.patternReactants.${idx}.validated`,
                            true,
                          );
                          if (actions.isAvailable) actions.saveDraft(true);
                        }
                      }}
                    />

                    <Input
                      placeholder="名称描述"
                      {...control.register(
                        `smartsPatterns.${index}.patternReactants.${idx}.name`,
                      )}
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
                );
              })}
            </div>

            {/* 催化剂/试剂列 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FieldLabel>催化剂/试剂</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    appendReagent({ smarts: "", name: "", role: "反应试剂" })
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {reagentFields.map((field, idx) => {
                const key = `reagent-${idx}`;
                const state = validatorState[key] || {
                  open: false,
                  smarts: "",
                };
                return (
                  <div key={field.id} className="space-y-2 relative group">
                    <div className="flex justify-between items-center gap-2">
                      <Input
                        placeholder={`[OH-]::氢氧根负离子`}
                        {...control.register(
                          `smartsPatterns.${index}.patternRegents.${idx}.smarts`,
                          {
                            onChange: () => {
                              setValue(
                                `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                                false,
                              );
                              setValue(
                                `smartsPatterns.${index}.reactionPredictValidated`,
                                false,
                              );
                            },
                          },
                        )}
                      />

                      <Button
                        type="button"
                        variant={
                          watch(
                            `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                          )
                            ? "default"
                            : "outline"
                        }
                        className={
                          watch(
                            `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                          )
                            ? "bg-white hover:bg-white text-green-500"
                            : ""
                        }
                        size="icon"
                        onClick={() => openValidator("reagent", idx)}
                        title={
                          watch(
                            `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                          )
                            ? "验证成功"
                            : "验证 SMARTS"
                        }
                      >
                        {watch(
                          `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                        ) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <SmartValidatorDialog
                      Open={state.open}
                      onOpenChange={() => closeValidator("reagent", idx)}
                      smarts={state.smarts}
                      onValidate={(success) => {
                        if (success) {
                          setValue(
                            `smartsPatterns.${index}.patternRegents.${idx}.validated`,
                            true,
                          );
                          if (actions.isAvailable) actions.saveDraft(true);
                        }
                      }}
                    />

                    <Input
                      placeholder="名称"
                      {...control.register(
                        `smartsPatterns.${index}.patternRegents.${idx}.name`,
                      )}
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
                );
              })}
            </div>

            {/* 生成物列 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FieldLabel>生成物</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    appendProduct({ smarts: "", name: "", role: "产物" })
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {productFields.map((field, idx) => {
                const key = `product-${idx}`;
                const state = validatorState[key] || {
                  open: false,
                  smarts: "",
                };
                return (
                  <div key={field.id} className="space-y-2 relative group">
                    <div className="flex justify-between items-center gap-2">
                      <Input
                        placeholder="SMARTS 表达式"
                        {...control.register(
                          `smartsPatterns.${index}.patternProducts.${idx}.smarts`,
                          {
                            onChange: () => {
                              setValue(
                                `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                                false,
                              );
                              setValue(
                                `smartsPatterns.${index}.reactionPredictValidated`,
                                false,
                              );
                            },
                          },
                        )}
                      />

                      <Button
                        type="button"
                        variant={
                          watch(
                            `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                          )
                            ? "default"
                            : "outline"
                        }
                        className={
                          watch(
                            `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                          )
                            ? "bg-white hover:bg-white text-green-500"
                            : ""
                        }
                        size="icon"
                        onClick={() => openValidator("product", idx)}
                        title={
                          watch(
                            `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                          )
                            ? "验证成功"
                            : "验证 SMARTS"
                        }
                      >
                        {watch(
                          `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                        ) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <SmartValidatorDialog
                      Open={state.open}
                      onOpenChange={() => closeValidator("product", idx)}
                      smarts={state.smarts}
                      onValidate={(success) => {
                        if (success) {
                          setValue(
                            `smartsPatterns.${index}.patternProducts.${idx}.validated`,
                            true,
                          );
                          if (actions.isAvailable) actions.saveDraft(true);
                        }
                      }}
                    />

                    <Input
                      placeholder="名称描述"
                      {...control.register(
                        `smartsPatterns.${index}.patternProducts.${idx}.name`,
                      )}
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
                );
              })}
            </div>
          </div>
        </FieldGroup>
      </FieldSet>

      <ReactionPredictDialog
        open={predictDialogOpen}
        onOpenChange={setPredictDialogOpen}
        pattern={currentPattern}
        onValidate={(success) => {
          if (success) {
            setValue(`smartsPatterns.${index}.reactionPredictValidated`, true);
            if (actions.isAvailable) actions.saveDraft(true);
          }
        }}
      />
    </CardContent>
  );
}
