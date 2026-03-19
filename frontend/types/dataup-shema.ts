import { z } from "zod";

// 下面定义的是dataup中各个输入框中值的类型，使用z.enum进行。
// 这里的as const是zod的需求，否则会将其认为是一个字符串。
export const mechanismTypes = [
  "其他",
  "自由基反应",
  "电性反应——亲电反应",
  "电性反应——亲核反应",
  "电环化反应",
] as const;
export const reactionForms = [
  "其他",
  "加成反应",
  "消除反应",
  "取代反应",
  "重排反应",
  "加成后消除",
  "氧化反应",
  "还原反应",
  "周环反应",
] as const;
export const temperatures = ["-", "高温", "加热", "室温", "低温"] as const;
export const pressures = ["-", "高压", "低压"] as const;
export const durations = ["-", "短时间反应", "长时间反应"] as const;
export const concentrations = ["-", "高浓度", "低浓度", "痕量"] as const;
export const solvents = [
  "-",
  "无",
  "非极性溶剂",
  "极性质子溶剂",
  "极性非质子溶剂",
] as const;
export const microwaves = ["-", "微波"] as const;
export const acidBase = [
  "-",
  "强酸",
  "酸",
  "弱酸",
  "中性",
  "弱碱性",
  "碱性",
  "强碱性",
  "Lewis酸",
  "Lewis碱",
] as const;
export const hydroOpts = ["-", "水", "无水"] as const;
export const sectionTypes = [
  "通式与概述",
  "机理",
  "活性",
  "化学选择性",
  "区域选择性",
  "立体选择性",
  "实例",
  "应用",
  "其它",
] as const;

export const conditionFieldsConfig = [
  {
    key: "Temperature",
    label: "温度",
    field: "temperature",
    options: temperatures,
  },
  { key: "Pressure", label: "压力", field: "pressure", options: pressures },
  { key: "Duration", label: "时间", field: "duration", options: durations },
  {
    key: "Concentration",
    label: "浓度",
    field: "concentration",
    options: concentrations,
  },
  {
    key: "SolventTypes",
    label: "溶剂类型",
    field: "solvent",
    options: solvents,
  },
  { key: "Microwave", label: "微波", field: "microwave", options: microwaves },
  {
    key: "AcidityBasicity",
    label: "酸碱性",
    field: "acidityBasicity",
    options: acidBase,
  },
  { key: "HydroOpts", label: "水含量", field: "hydro", options: hydroOpts },
] as const;

// 定义审核状态
export const reviewStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
export const reviewInfo = z
  .object({
    id: z.string().optional(), // 反应条目ID
    status: z.enum(reviewStatuses).optional(),
    authorId: z.string().optional(), // 原作者ID
    authorName: z.string().optional(), // 原作者名称
    rejectionReason: z.string().optional(), // 打回原因
  })
  .optional();

// 定义frontend/pages/dashboard/DataUp中四个组件分别需要的type。

// 第一个metaShema，用于frontend/pages/dashboard/DataUp/ReactionMetaData.tsx
const metaSchema = z.object({
  name: z.string().min(1, "反应名称不能为空"),
  mechanismType: z.enum(mechanismTypes),
  form: z.enum(reactionForms),
  tags: z.string().optional(), //tags可有可无，使用optional()
});

// 在定义smartsPatterns之前，需要对录入的SMARTS进行定义，示例json中给出的定义demo如下：
// 			"patternReactants": [
// 	{
// 		"smarts": "[c,C:1]C(=O)[NH2:2]",
// 		"name": "N上连接双氢的酰胺",
// 		"role": null
// 	},
// 	{
// 		"smarts": "[Cl,Br]",
// 		"name": "氯/溴分子",
// 		"role": null
// 	}
// ],
// 当中，由于null处理起来比较抽象，在原来的基础上添加了“产物”，同时将role设置为可选，避免null的问题。
// 由此定义出moleculeRoleShema，用于定义录入的SMARTS的相关信息。
const roles = ["反应物", "反应试剂", "产物"] as const;

const moleculeRoleSchema = z.object({
  smarts: z.string(),
  name: z.string(),
  role: z.enum(roles),
  validated: z.boolean().optional(),
});

// 第二个smartsPatterns，用于frontend/pages/dashboard/DataUp/SMARTSPatterns.tsx
const smartsPatternsSchema = z.object({
  name: z.string(),
  patternReactants: z.array(moleculeRoleSchema), //不一定有一个反应物，所以用数组收集
  patternRegents: z.array(moleculeRoleSchema),
  patternProducts: z.array(moleculeRoleSchema),
  reactionPredictValidated: z.boolean().optional(),
});

// 定义第四个之前需要对descriptions进行定义。
const descriptionSchema = z.object({
  description: z.string(),
  refPageNo: z.string(),
});

// 第四个反应描述，对应frontend/pages/dashboard/DataUp/ReactionDiscriptions.tsx
const reactionSectionSchema = z.object({
  sectionType: z.enum(sectionTypes),
  // 反应条件（每个小节有自己的条件）
  temperature: z.enum(temperatures),
  pressure: z.enum(pressures),
  duration: z.enum(durations),
  concentration: z.enum(concentrations),
  solvent: z.enum(solvents),
  microwave: z.enum(microwaves),
  acidityBasicity: z.enum(acidBase),
  hydro: z.enum(hydroOpts),

  // 反应描述（每个小节有自己的描述）
  reactions: z.array(z.object({ value: z.string() })),
  descriptions: z.array(descriptionSchema),
});

// 组合，导出
export const dataupSchema = z.object({
  id: z.string().optional(),
  meta: metaSchema,
  smartsPatterns: z.array(smartsPatternsSchema),
  reactionSections: z.array(reactionSectionSchema),
  reviewInfo: reviewInfo,
});
// 导出定义
export type DataupSchema = z.infer<typeof dataupSchema>;
