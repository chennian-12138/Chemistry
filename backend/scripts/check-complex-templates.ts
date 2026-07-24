import { prisma } from "../lib/prisma.js";

async function checkComplexReactions() {
  console.log("🔍 检查复杂反应模板（多反应物/多产物）...\n");

  const reactions = await prisma.reaction.findMany({
    where: { form: "template" },
    include: {
      patterns: {
        include: { molecules: true },
      },
    },
    take: 50, // 取前50个检查
  });

  let singleToSingle = 0;
  let multiReactant = 0;
  let multiProduct = 0;
  let multiToMulti = 0;

  const examples: any[] = [];

  for (const r of reactions) {
    const pattern = r.patterns[0];
    if (!pattern) continue;

    const reactants = pattern.molecules.filter((m) => m.role === "反应物");
    const products = pattern.molecules.filter((m) => m.role === "产物");
    const reagents = pattern.molecules.filter((m) => m.role === "反应试剂");

    if (reactants.length === 1 && products.length === 1) {
      singleToSingle++;
    } else if (reactants.length > 1 && products.length === 1) {
      multiReactant++;
      if (examples.length < 3) {
        examples.push({ type: "多反应物→单产物", reaction: r, reactants, products, reagents });
      }
    } else if (reactants.length === 1 && products.length > 1) {
      multiProduct++;
      if (examples.length < 3) {
        examples.push({ type: "单反应物→多产物", reaction: r, reactants, products, reagents });
      }
    } else if (reactants.length > 1 && products.length > 1) {
      multiToMulti++;
      if (examples.length < 3) {
        examples.push({ type: "多反应物→多产物", reaction: r, reactants, products, reagents });
      }
    }
  }

  console.log("📊 反应类型统计（前50个）:");
  console.log(`   单反应物→单产物: ${singleToSingle} 个`);
  console.log(`   多反应物→单产物: ${multiReactant} 个`);
  console.log(`   单反应物→多产物: ${multiProduct} 个`);
  console.log(`   多反应物→多产物: ${multiToMulti} 个\n`);

  if (examples.length > 0) {
    console.log("📝 示例反应详情:\n");
    examples.forEach((ex, idx) => {
      console.log(`${idx + 1}. ${ex.type}: ${ex.reaction.name}`);
      console.log(`   反应物 (${ex.reactants.length}个):`);
      ex.reactants.forEach((m: any, i: number) => {
        const smarts = m.smarts.length > 50 ? m.smarts.substring(0, 50) + "..." : m.smarts;
        console.log(`     [${i + 1}] ${smarts}`);
      });
      console.log(`   产物 (${ex.products.length}个):`);
      ex.products.forEach((m: any, i: number) => {
        const smarts = m.smarts.length > 50 ? m.smarts.substring(0, 50) + "..." : m.smarts;
        console.log(`     [${i + 1}] ${smarts}`);
      });
      if (ex.reagents.length > 0) {
        console.log(`   试剂 (${ex.reagents.length}个):`);
        ex.reagents.forEach((m: any, i: number) => {
          const smarts = m.smarts.length > 50 ? m.smarts.substring(0, 50) + "..." : m.smarts;
          console.log(`     [${i + 1}] ${smarts}`);
        });
      }
      console.log("");
    });
  }

  // 查找第一行的模板（template_1073511）验证
  console.log("🎯 验证 CSV 第一行模板 (template_1073511):\n");
  const firstTemplate = await prisma.reaction.findFirst({
    where: { name: "template_1073511", form: "template" },
    include: {
      patterns: {
        include: { molecules: true },
      },
    },
  });

  if (firstTemplate) {
    const pattern = firstTemplate.patterns[0];
    const reactants = pattern.molecules.filter((m) => m.role === "反应物");
    const products = pattern.molecules.filter((m) => m.role === "产物");

    console.log(`   ✅ 找到模板: ${firstTemplate.name}`);
    console.log(`   反应物数量: ${reactants.length}`);
    console.log(`   产物数量: ${products.length}`);
    console.log("\n   原始 CSV SMARTS:");
    console.log("   [#7;a:8]:[c:7]:[c;H0;D3;+0:4](:[c:5]:[#7;a:6])-[c;H0;D3;+0:1](:[c:2]):[c:3]");
    console.log("   >>");
    console.log("   Br-[c;H0;D3;+0:1](:[c:2]):[c:3].O-B(-O)-[c;H0;D3;+0:4](:[c:5]:[#7;a:6]):[c:7]:[#7;a:8]");
    console.log("\n   数据库中的分子:");
    reactants.forEach((m, i) => {
      console.log(`   反应物${i + 1}: ${m.smarts}`);
    });
    products.forEach((m, i) => {
      console.log(`   产物${i + 1}: ${m.smarts}`);
    });
  } else {
    console.log("   ❌ 未找到 template_1073511");
  }
}

checkComplexReactions()
  .then(() => {
    console.log("\n✅ 检查完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 检查失败:", error);
    process.exit(1);
  });
