import { Router } from "express";
import { matchSmartsPattern, predictProducts } from "../services/rdkit";

const router = Router();

router.post("/match-smarts", async (req, res) => {
  console.log("收到请求:", req.body);
  const { smarts, molBlock } = req.body;

  if (!smarts || !molBlock) {
    return res.status(400).json({ error: "缺少 smarts 或 molBlock 参数" });
  }

  try {
    const result = await matchSmartsPattern(smarts, molBlock);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/predict-products", async (req, res) => {
  const { smart, mols } = req.body;

  if (!smart || !mols || !Array.isArray(mols)) {
    return res.status(400).json({ error: "缺少 smart 或 mols 参数" });
  }

  try {
    const result = await predictProducts(smart, mols);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("反应预测失败:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
