import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { matchSmartsPattern } from "../services/rdkit";

const router = Router();

// 1. Keyword Search
router.get("/search/keyword", async (req, res) => {
  try {
    const { term } = req.query;

    // We fetch all APPROVED reactions by default if no term is provided
    const whereClause = term
      ? {
          status: "APPROVED" as const,
          OR: [
            { name: { contains: String(term), mode: "insensitive" as const } },
            { tags: { contains: String(term), mode: "insensitive" as const } },
            {
              sections: {
                some: {
                  descriptions: {
                    some: {
                      description: {
                        contains: String(term),
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {
          status: "APPROVED" as const,
        };

    const reactions = await prisma.reaction.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        tags: true,
        status: true,
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: { select: { description: true } },
          },
        },
      },
      take: 50, // Limit results for performance
    });

    const formattedData = reactions.map((reaction) => ({
      id: reaction.id,
      name: reaction.name,
      tags: reaction.tags
        ? reaction.tags.split(",").map((tag) => tag.trim())
        : [],
      status: reaction.status,
      // For Viewer we need structureData. We try to grab the first MolBlock.
      // If none exists, ReactCard will just show the empty state icon.
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      description:
        reaction.sections
          ?.flatMap((s) => s.descriptions?.map((d) => d.description))
          .filter(Boolean)
          .join("; ") || "",
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error in keyword search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. 结构搜索
router.post("/search/structure", async (req, res) => {
  try {
    const { smarts, mode = "substructure" } = req.body;

    if (!smarts) {
      return res
        .status(400)
        .json({ error: "No structure provided for search." });
    }

    // Step 1: Fetch all molecules from the database to test against
    const allMolecules = await prisma.moleculeRole.findMany({
      select: { id: true, smarts: true, patternId: true },
    });

    const matchedPatternIds = new Set<string>();

    // Step 2: Test each molecule using our RDKit service
    // In a real production scale app with millions of molecules, you would want
    // to use RDKit PostgreSQL Cartridge. For now, doing this in memory.
    for (const mol of allMolecules) {
      if (!mol.smarts) continue;

      try {
        // If the smarts payload is a molblock (from Composer), matchSmartsPattern expects
        // (pattern, targetMolBlock). We'll assume the target is smarts/smiles from DB
        // and query is the molBlock drawing.
        const isMatch = await matchSmartsPattern(mol.smarts, smarts);
        if (isMatch.matched) {
          matchedPatternIds.add(mol.patternId);
          console.log(`✅ 匹配 | smarts=${mol.smarts}`);
        }
      } catch (err) {
        // Ignore parsing errors for individual molecules to not break the whole search
        // console.error(`Error matching molecule ${mol.id}:`, err);
      }
    }

    if (matchedPatternIds.size === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 3: Fetch the reactions that contain those matched patterns
    const reactions = await prisma.reaction.findMany({
      where: {
        status: "APPROVED" as const,
        patterns: {
          some: {
            id: { in: Array.from(matchedPatternIds) },
          },
        },
      },
      select: {
        id: true,
        name: true,
        tags: true,
        status: true,
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: { select: { description: true } },
          },
        },
      },
    });

    const formattedData = reactions.map((reaction) => ({
      id: reaction.id,
      name: reaction.name,
      tags: reaction.tags
        ? reaction.tags.split(",").map((tag) => tag.trim())
        : [],
      status: reaction.status,
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      description:
        reaction.sections
          ?.flatMap((s) => s.descriptions?.map((d) => d.description))
          .filter(Boolean)
          .join("; ") || "",
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error in structure search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Get Specific Reaction Detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reaction = await prisma.reaction.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true, image: true },
        },
        patterns: {
          include: {
            molecules: true,
          },
        },
        sections: {
          include: {
            descriptions: true,
            reactions: true,
          },
        },
      },
    });

    if (!reaction) {
      return res.status(404).json({ error: "Reaction not found." });
    }

    // Format tags into an array
    const formattedReaction = {
      ...reaction,
      tags: reaction.tags ? reaction.tags.split(",").map((t) => t.trim()) : [],
    };

    res.json({ success: true, data: formattedReaction });
  } catch (error) {
    console.error("Error fetching reaction detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
