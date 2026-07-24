import { prisma } from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TemplateRow {
  template_name: string;
  smarts: string;
}

// 解析 CSV 文件
function parseCSV(filePath: string): TemplateRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const templates: TemplateRow[] = [];

  // 跳过表头
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV 格式: template_name,smarts
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) continue;

    const template_name = line.substring(0, commaIndex);
    const smarts = line.substring(commaIndex + 1);

    templates.push({ template_name, smarts });
  }

  return templates;
}

// 解析 SMARTS 反应模板，分离反应物和产物
function parseSmartsReaction(smarts: string): {
  reactants: string[];
  products: string[];
} | null {
  // SMARTS 反应格式: reactants>>products
  // 多个分子用 . 分隔
  const parts = smarts.split(">>");
  if (parts.length !== 2) {
    console.warn(`Invalid SMARTS format (no >>): ${smarts}`);
    return null;
  }

  const reactants = parts[0].split(".").map((s) => s.trim()).filter(Boolean);
  const products = parts[1].split(".").map((s) => s.trim()).filter(Boolean);

  if (reactants.length === 0 || products.length === 0) {
    console.warn(`Invalid SMARTS: empty reactants or products`);
    return null;
  }

  return { reactants, products };
}

async function importTemplates() {
  console.log("🚀 开始导入反应模板...\n");

  // 读取 CSV 文件
  const csvPath = path.join(__dirname, "../../templates/templates_demo.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ 文件不存在: ${csvPath}`);
    process.exit(1);
  }

  const templates = parseCSV(csvPath);
  console.log(`📄 读取到 ${templates.length} 条模板记录\n`);

  // 创建或获取一个系统用户用于导入（如果没有真实用户）
  let systemUser = await prisma.user.findFirst({
    where: { email: "system@template-import.local" },
  });

  if (!systemUser) {
    console.log("📦 创建系统导入用户...");
    systemUser = await prisma.user.create({
      data: {
        email: "system@template-import.local",
        name: "Template Import System",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    console.log(`✅ 系统用户创建成功: ${systemUser.id}\n`);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const template of templates) {
    try {
      const parsed = parseSmartsReaction(template.smarts);
      if (!parsed) {
        errorCount++;
        continue;
      }

      // 创建反应记录
      const reaction = await prisma.reaction.create({
        data: {
          name: template.template_name,
          mechanismType: "通用模板", // 默认机理类型
          form: "template", // 标记为模板导入
          status: "APPROVED", // 自动批准模板
          authorId: systemUser.id,

          // 创建一个 Pattern，包含反应物和产物
          patterns: {
            create: {
              name: `${template.template_name}_pattern`,
              molecules: {
                create: [
                  // 反应物
                  ...parsed.reactants.map((smarts, index) => ({
                    smarts: smarts,
                    name: `反应物_${index + 1}`,
                    role: "反应物",
                  })),
                  // 产物
                  ...parsed.products.map((smarts, index) => ({
                    smarts: smarts,
                    name: `产物_${index + 1}`,
                    role: "产物",
                  })),
                ],
              },
            },
          },

          // 创建一个空的反应条件段（可选）
          sections: {
            create: {
              sectionType: "general",
              descriptions: {
                create: {
                  description: `来源：模板库导入 (${template.template_name})`,
                },
              },
            },
          },
        },
      });

      successCount++;
      if (successCount % 50 === 0) {
        console.log(`✅ 已导入 ${successCount} 条...`);
      }
    } catch (error: any) {
      console.error(`❌ 导入失败 [${template.template_name}]:`, error.message);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`🎉 导入完成！`);
  console.log(`✅ 成功: ${successCount} 条`);
  console.log(`❌ 失败: ${errorCount} 条`);
  console.log("=".repeat(50));
}

// 运行导入
importTemplates()
  .then(() => {
    console.log("\n✨ 脚本执行完毕");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 致命错误:", error);
    process.exit(1);
  });
