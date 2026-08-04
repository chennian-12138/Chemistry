import { prisma } from "../lib/prisma.js";

async function verify() {
  console.log("🔍 正在验证导入的模板数据...\n");

  // 统计模板总数
  const count = await prisma.reaction.count({ where: { form: "template" } });
  console.log(`📊 数据库中的模板总数: ${count}\n`);

  // 获取第一个模板作为示例
  const sample = await prisma.reaction.findFirst({
    where: { form: "template" },
    include: {
      patterns: {
        include: { molecules: true },
      },
    },
  });

  if (!sample) {
    console.log("❌ 未找到任何模板数据");
    return;
  }

  console.log("📝 示例模板详情:");
  console.log(`   模板名称: ${sample.name}`);
  console.log(`   机理类型: ${sample.mechanismType}`);
  console.log(`   审核状态: ${sample.status}`);
  console.log(`   创建时间: ${sample.createdAt.toISOString()}\n`);

  if (sample.patterns.length > 0) {
    const pattern = sample.patterns[0]!;
    const reactants = pattern.molecules.filter((m) => m.role === "反应物");
    const products = pattern.molecules.filter((m) => m.role === "产物");

    console.log("🧪 反应模式:");
    console.log(`   反应物数量: ${reactants.length}`);
    console.log(`   产物数量: ${products.length}\n`);

    if (reactants.length > 0) {
      console.log("   第一个反应物:");
      console.log(`     名称: ${reactants[0]!.name}`);
      console.log(`     SMARTS: ${reactants[0]!.smarts.substring(0, 60)}...`);
    }

    if (products.length > 0) {
      console.log("\n   第一个产物:");
      console.log(`     名称: ${products[0]!.name}`);
      console.log(`     SMARTS: ${products[0]!.smarts.substring(0, 60)}...`);
    }
  }

  // 统计不同状态的模板
  const statusCount = await prisma.reaction.groupBy({
    by: ["status"],
    where: { form: "template" },
    _count: { id: true },
  });

  console.log("\n📈 按状态分组统计:");
  statusCount.forEach((item) => {
    console.log(`   ${item.status}: ${item._count.id} 条`);
  });
}

verify()
  .then(() => {
    console.log("\n✅ 验证完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 验证失败:", error);
    process.exit(1);
  });
