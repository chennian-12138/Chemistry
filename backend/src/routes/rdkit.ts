import { Router } from "express";
import { matchSmartsPattern } from "../services/rdkit";

const router = Router();

router.post("/match-smarts", async (req, res) => {
  console.log('收到请求:', req.body);
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

export default router;