// 本文件为直接导入/home/chennian/myProjects/Chemistry/frontend/app/dashboard/dataup/page.tsx的文件
// 本文件将该目录下所有的组件整合，处理提交逻辑。
// 使用React-hook-form，zod进行进行处理。

"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
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
import { toast } from "sonner";
import { ListPlus, AlertCircle } from "lucide-react";

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
      patternReactants: [
        { smarts: "", name: "", role: "反应物", validated: false },
      ],
      patternRegents: [
        { smarts: "", name: "", role: "反应试剂", validated: false },
      ],
      patternProducts: [
        { smarts: "", name: "", role: "产物", validated: false },
      ],
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
  const { data: session } = useSession();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as any)?.role?.toLowerCase();
      const storageKey = `dataupVisited_${session.user.id}`;
      if (
        (userRole === "user" || !userRole) &&
        !localStorage.getItem(storageKey)
      ) {
        setShowWelcome(true);
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [session]);

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

    if (!data.meta.name?.trim()) {
      toast.error("请填写反应名称", { position: "top-center" });
      return;
    }

    let hasUnvalidatedSMARTS = false;

    for (const pattern of data.smartsPatterns) {
      for (const reactant of pattern.patternReactants) {
        if (reactant.smarts && !reactant.validated) {
          hasUnvalidatedSMARTS = true;
          break;
        }
      }
      for (const regent of pattern.patternRegents) {
        if (regent.smarts && !regent.validated) {
          hasUnvalidatedSMARTS = true;
          break;
        }
      }
      for (const product of pattern.patternProducts) {
        if (product.smarts && !product.validated) {
          hasUnvalidatedSMARTS = true;
          break;
        }
      }
    }

    if (hasUnvalidatedSMARTS) {
      toast.error("请校验所有SMARTS模式", { position: "top-center" });
      console.log("=== SMARTS 验证状态检查 ===");
      data.smartsPatterns.forEach((pattern, pIdx) => {
        console.log(`\n--- 模式 ${pIdx + 1} ---`);

        pattern.patternReactants.forEach((r, i) => {
          console.log(
            `反应物${i + 1}: smarts="${r.smarts}", validated=${r.validated}`,
          );
        });
        pattern.patternRegents.forEach((r, i) => {
          console.log(
            `试剂${i + 1}: smarts="${r.smarts}", validated=${r.validated}`,
          );
        });
        pattern.patternProducts.forEach((r, i) => {
          console.log(
            `产物${i + 1}: smarts="${r.smarts}", validated=${r.validated}`,
          );
        });
      });
      return;
    }

    // 检查反应预测校验
    let hasUnvalidatedPrediction = false;
    for (const pattern of data.smartsPatterns) {
      if (!pattern.reactionPredictValidated) {
        hasUnvalidatedPrediction = true;
        break;
      }
    }

    if (hasUnvalidatedPrediction) {
      toast.error("请完成所有反应模式的反应预测校验", {
        position: "top-center",
      });
      return;
    }

    try {
      const dataToSubmit = {
        ...data,
        smartsPatterns: data.smartsPatterns.map(
          ({ reactionPredictValidated, ...pattern }) => ({
            ...pattern,
            patternReactants: pattern.patternReactants.map(
              ({ validated, ...rest }) => rest,
            ),
            patternRegents: pattern.patternRegents.map(
              ({ validated, ...rest }) => rest,
            ),
            patternProducts: pattern.patternProducts.map(
              ({ validated, ...rest }) => rest,
            ),
          }),
        ),
      };

      // 判断是更新还是新建
      const result = data.id
        ? await updateReaction(data.id, dataToSubmit) // 更新
        : await createReaction(dataToSubmit); // 新建

      if (result.success) {
        toast.success(data.id ? "修改成功！等待审核" : "提交成功！等待审核", {
          position: "top-center",
        });
      } else {
        toast.error("提交失败：" + result.error, { position: "top-center" });
      }
    } catch {
      toast.error("提交失败，请检查网络", { position: "top-center" });
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

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md text-center space-y-6 mx-4">
            <h2 className="text-2xl font-bold text-gray-800">
              欢迎来到 DataUp
            </h2>
            <p className="text-gray-600 leading-relaxed">
              您可以在这里输入您没有搜索到的化学式，我们核验后会将其录入到我们的数据库中！
              <br />
              感谢您为我校化学事业做出的一份贡献！
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => setShowWelcome(false)}
            >
              我知道了
            </Button>
          </div>
        </div>
      )}
      <FormProvider {...methods}>
        <form className="space-y-8 max-w-6xl mx-auto p-6">
          {methods.watch("id") && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 p-4 rounded-lg flex flex-col gap-2 relative shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-base">
                <AlertCircle className="w-5 h-5" />
                正在修改退回的反应草稿
              </div>
              <p className="text-sm opacity-90 pl-7">
                请仔细参考审核人员的意见进行修改，重新提交后将重新进入审核队列。
              </p>
              {methods.watch("reviewInfo")?.rejectionReason && (
                <div className="mt-2 ml-7 bg-white dark:bg-black/40 border border-amber-100 dark:border-amber-900/50 p-3 rounded-md text-sm">
                  <span className="font-semibold mr-2">审核意见:</span>
                  {methods.watch("reviewInfo")?.rejectionReason}
                </div>
              )}
            </div>
          )}
          <FieldSet className="w-full!">
            <FieldGroup>
              <Field>
                {/* 第一部分：反应元数据 */}
                <ReactionMetaData />
              </Field>
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
                      <Button type="button" variant="outline" size="sm">
                        <ListPlus className="w-4 h-4" />
                        添加反应模式
                      </Button>
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
                      <Button type="button" variant="outline" size="sm">
                        <ListPlus className="w-4 h-4" />
                        添加反应介绍
                      </Button>
                    </CardAction>
                  </div>
                </CardHeader>

                {methods.watch("reactionSections").map((_, index) => (
                  <ReactionDiscriptions
                    key={index}
                    index={index}
                    onRemove={
                      methods.watch("reactionSections").length > 1
                        ? () => {
                            const current =
                              methods.getValues("reactionSections");
                            methods.setValue(
                              "reactionSections",
                              current.filter((_, i) => i !== index),
                            );
                          }
                        : undefined
                    }
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
