import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

const router = Router();

// 确保存储目录存在
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(uploadDir, { recursive: true });

// 配置 multer (使用内存存储，因为我们要用 sharp 处理后再写盘)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("只允许上传图片") as any, false);
    }
  },
});

router.post("/", upload.single("avatar"), async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "没有上传图片" });
    }

    const filename = `${userId}.webp`;
    const outputPath = path.join(uploadDir, filename);

    // 使用 sharp 处理图片：转webp、调整尺寸、压缩质量
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // 构造访问 URL
    // 使用 t 参数防止浏览器缓存
    const BACKEND_URL = process.env.API_URL || "http://localhost:8000";
    const imageUrl = `${BACKEND_URL}/uploads/avatars/${filename}?t=${Date.now()}`;

    // 更新用户头像
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    res.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ error: error.message || "上传失败" });
  }
});

export default router;
