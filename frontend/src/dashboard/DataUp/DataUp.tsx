// 本文件为直接导入/home/chennian/myProjects/Chemistry/frontend/app/dashboard/dataup/page.tsx的文件
// 本文件将该目录下所有的组件整合，处理提交逻辑。
// 使用React-hook-form，zod进行进行处理。

"use client";
import { useCallback, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardAction } from "@/components/ui/card";

import { dataupSchema, type DataupSchema } from "@/types/dataup-shema";
import { useDataUpActions } from "@/hooks/use-dataup-action";
import ReactionMetaData from "./ReactionMetaData";
import SMARTSModuleData from "./SMARTSModuleData";
import ReactionDiscriptions from "./ReactionDiscriptions";
import { createReaction, updateReaction } from "@/lib/api";

// 默认空值
const defaultValues: DataupSchema = {
  meta: {
    name: "",
    mechanismType: "其他",
    form: "其他",
    tags: "",
  },
  smartsPatterns: [
    {
      name: "",
      patternReactants: [{ smarts: "", name: "", role: "反应物" }],
      patternRegents: [{ smarts: "", name: "", role: "反应试剂" }],
      patternProducts: [{ smarts: "", name: "", role: "产物" }],
    },
  ],
  reactionSections: [
    {
      sectionType: "通式与概述",
      temperature: "-",
      pressure: "-",
      duration: "-",
      concentration: "-",
      solvent: "-",
      microwave: "-",
      acidityBasicity: "-",
      hydro: "-",
      reactions: [{ value: "" }],
      descriptions: [
        {
          description: "",
          refPageNo: "",
        },
      ],
    },
  ],
};

export default function DataUp() {
  const methods = useForm<DataupSchema>({
    resolver: zodResolver(dataupSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { register, unregister } = useDataUpActions();

  const handleLoadData = useCallback(
    (data: DataupSchema) => {
      methods.reset(data);
    },
    [methods],
  );

  const handleSubmit = useCallback(async () => {
    const data = methods.getValues();
    try {
      // 判断是更新还是新建
      const result = data.id
        ? await updateReaction(data.id, data) // 更新
        : await createReaction(data); // 新建

      if (result.success) {
        alert(data.id ? "修改成功！等待审核" : "提交成功！等待审核");
      } else {
        alert("提交失败：" + result.error);
      }
    } catch {
      alert("提交失败，请检查网络");
    }
  }, [methods]);


  const handleExport = useCallback(() => {
    const data = methods.getValues();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.meta.name || "reaction"}.json`;
    a.click();
  }, [methods]);

  useEffect(() => {
    register({
      reset: () => methods.reset(defaultValues),
      exportJSON: handleExport,
      submit: handleSubmit,
      loadData: (data: DataupSchema) => methods.reset(data),
    });

    return () => unregister();
  }, [
    methods,
    register,
    unregister,
    handleSubmit,
    handleExport,
    handleLoadData,
  ]);
  const patterns = methods.watch("smartsPatterns");
  const sections = methods.watch("reactionSections");

  return (
    <>
      <FormProvider {...methods}>
        <form className="space-y-8 max-w-6xl mx-auto p-6">
          <FieldSet className="w-full!">
            <FieldGroup>
              <Field>
                {/* 第一部分：反应元数据 */}
                <ReactionMetaData />
              </Field>
              {/* <Field>
                <ReactionConditions />
              </Field> */}
              {/* 第三部分：SMARTS 模式（动态数组） */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>SMARTS 反应模式</CardTitle>
                    <CardAction
                      onClick={() => {
                        const currentPatterns =
                          methods.getValues("smartsPatterns");
                        methods.setValue("smartsPatterns", [
                          ...currentPatterns,
                          {
                            name: "",
                            patternReactants: [
                              { smarts: "", name: "", role: "反应物" },
                            ],
                            patternRegents: [
                              { smarts: "", name: "", role: "反应试剂" },
                            ],
                            patternProducts: [
                              { smarts: "", name: "", role: "产物" },
                            ],
                          },
                        ]);
                      }}
                    >
                      <Button type="button"> 添加模式</Button>
                    </CardAction>
                  </div>
                </CardHeader>

                {methods.watch("smartsPatterns").map((_, index) => (
                  <SMARTSModuleData
                    key={index}
                    index={index}
                    onRemove={
                      methods.watch("smartsPatterns").length > 1
                        ? () => {
                            const current = methods.getValues("smartsPatterns");
                            methods.setValue(
                              "smartsPatterns",
                              current.filter((_, i) => i !== index),
                            );
                          }
                        : undefined
                    }
                  />
                ))}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>反应描述</CardTitle>
                    <CardAction
                      onClick={() => {
                        const currentSections =
                          methods.getValues("reactionSections");
                        methods.setValue("reactionSections", [
                          ...currentSections,
                          {
                            sectionType: "通式与概述", // 默认类型
                            temperature: "-",
                            pressure: "-",
                            duration: "-",
                            concentration: "-",
                            solvent: "-",
                            microwave: "-",
                            acidityBasicity: "-",
                            hydro: "-",
                            reactions: [{ value: "" }],
                            descriptions: [
                              {
                                description: "",
                                refPageNo: "",
                              },
                            ],
                          },
                        ]);
                      }}
                    >
                      <Button type="button">添加描述</Button>
                    </CardAction>
                  </div>
                </CardHeader>

                {methods.watch("reactionSections").map((_, index) => (
                  <ReactionDiscriptions
                    key={index}
                    index={index}
                    // onRemove={
                    //   methods.watch("smartsPatterns").length > 1
                    //     ? () => {
                    //         const current = methods.getValues("smartsPatterns");
                    //         methods.setValue(
                    //           "smartsPatterns",
                    //           current.filter((_, i) => i !== index),
                    //         );
                    //       }
                    //     : undefined
                    // }
                  />
                ))}
              </Card>
            </FieldGroup>
          </FieldSet>
        </form>
      </FormProvider>
    </>
  );
}
