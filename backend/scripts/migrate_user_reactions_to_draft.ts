/**
 * 一次性迁移脚本：把指定作者的所有 reaction 词条（不区分状态）转移到他的云端暂存（draft 表）。
 *
 * 用法（服务器 backend 目录下）：
 *   NODE_ENV=production npx tsx scripts/migrate_user_reactions_to_draft.ts            # 仅预览，不执行
 *   NODE_ENV=production npx tsx scripts/migrate_user_reactions_to_draft.ts --apply    # 真正执行
 *
 * 说明：
 *   - reaction 表是拆分存储（patterns/molecules/sections/descriptions），
 *     draft.data 需要的是前端表单原始 JSON（DataupSchema），脚本负责反向组装。
 *   - 执行前会把所有原词条完整 JSON 备份到 /tmp/，出问题可手动恢复。
 *   - --apply 才会真正写入 draft 并删除原 reaction（连带 patterns/sections/reviews 级联删除）。
 */
import "../lib/env";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { prisma } from "../lib/prisma";

// ===== 配置 =====
const TARGET_USER_NAME = "陈祺睿";
const APPLY = process.argv.includes("--apply");
const BACKUP_FILE = `/tmp/migrate_${TARGET_USER_NAME}_${Date.now()}.json`;

type Molecule = { smarts: string; name: string; role: string; validated?: boolean };

/** 把 reaction 表拆分数据反向组装成前端表单 JSON（DataupSchema 的子集） */
export function assembleDraftData(reaction: any) {
  return {
    meta: {
      name: reaction.name,
      mechanismType: reaction.mechanismType,
      form: reaction.form,
      tags: reaction.tags.map((t: any) => t.name).join(","),
    },
    smartsPatterns: reaction.patterns.map((p: any) => {
      const byRole = (role: string) =>
        p.molecules
          .filter((m: any) => m.role === role)
          .map((m: any): Molecule => ({ smarts: m.smarts, name: m.name, role: m.role }));
      return {
        name: p.name,
        patternReactants: byRole("反应物"),
        patternRegents: byRole("反应试剂"),
        patternProducts: byRole("产物"),
      };
    }),
    reactionSections: reaction.sections.map((s: any) => ({
      sectionType: s.sectionType,
      // reaction 表里 "-" 被存成 null，反向时恢复成 "-"
      temperature: s.temperature ?? "-",
      pressure: s.pressure ?? "-",
      duration: s.duration ?? "-",
      concentration: s.concentration ?? "-",
      solvent: s.solvent ?? "-",
      microwave: s.microwave ?? "-",
      acidityBasicity: s.acidityBasicity ?? "-",
      hydro: s.hydro ?? "-",
      reactions: s.reactions.map((r: any) => ({ value: r.value })),
      descriptions: s.descriptions.map((d: any) => ({
        description: d.description,
        refPageNo: d.refPageNo ?? "",
      })),
    })),
    reviewInfo: {
      id: reaction.id,
      status: reaction.status,
      authorId: reaction.authorId,
    },
  };
}

async function main() {
  // 1. 定位目标用户
  const users = await prisma.user.findMany({
    where: { name: TARGET_USER_NAME },
    select: { id: true, name: true, email: true },
  });

  if (users.length === 0) {
    console.error(`❌ 没找到名字为「${TARGET_USER_NAME}」的用户。现有用户：`);
    const all = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
    for (const u of all) console.log(`   - ${u.name ?? "(无名)"} <${u.email}> (${u.id})`);
    process.exit(1);
  }
  if (users.length > 1) {
    console.error(`❌ 有 ${users.length} 个同名用户，请手动修改脚本指定 id：`);
    for (const u of users) console.log(`   - ${u.id} <${u.email}>`);
    process.exit(1);
  }
  const user = users[0]!;

  // 2. 查出该用户所有 reaction（含所有关联数据）
  const reactions = await prisma.reaction.findMany({
    where: { authorId: user.id },
    include: {
      tags: true,
      patterns: { include: { molecules: true } },
      sections: { include: { reactions: true, descriptions: true } },
    },
  });

  console.log(`用户: ${user.name} <${user.email}> (${user.id})`);
  console.log(`词条总数: ${reactions.length}`);
  console.log("");

  if (reactions.length === 0) {
    console.log("该用户没有任何词条，无需迁移。");
    process.exit(0);
  }

  // 3. 预览清单
  const byStatus = reactions.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("状态分布:", JSON.stringify(byStatus));
  console.log("\n=== 将转移的词条清单 ===");
  for (const r of reactions) {
    console.log(`   [${r.status}] ${r.name} (${r.id})`);
  }
  console.log("");

  if (!APPLY) {
    console.log("⏸️  预览模式：以上词条将被转移。确认无误后加 --apply 真正执行。");
    process.exit(0);
  }

  // 4. 执行：备份 → 事务内 写 draft + 删 reaction
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(reactions, null, 2));
  console.log(`📦 已备份原数据到 ${BACKUP_FILE}`);

  await prisma.$transaction(
    async (tx) => {
      for (const r of reactions) {
        const draftData = assembleDraftData(r);

        // 同名草稿：为避免前端按 name 合并导致覆盖，重名加序号后缀
        const existing = await tx.draft.findFirst({
          where: { authorId: user.id, name: r.name },
          select: { id: true },
        });
        const draftName = existing ? `${r.name} (迁移${r.id.slice(-4)})` : r.name;

        await tx.draft.create({
          data: {
            authorId: user.id,
            name: draftName,
            data: draftData,
          },
        });

        // 删除原 reaction（patterns/sections/reviews 等级联删除）
        await tx.reaction.delete({ where: { id: r.id } });
        console.log(`✅ 已转移: ${r.name} → 云端暂存「${draftName}」`);
      }
    },
    { timeout: 600000, maxWait: 30000 },
  );

  const remaining = await prisma.reaction.count({ where: { authorId: user.id } });
  console.log(`\n🎉 完成！「${TARGET_USER_NAME}」剩余词条数: ${remaining}`);
  console.log(`备份文件: ${BACKUP_FILE}（如需恢复请保留）`);
}

// 仅当作为主入口直接运行时才执行（被 import 时不触发）
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main()
    .catch((e) => {
      console.error("迁移失败:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
