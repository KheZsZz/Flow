import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabaseAdmin } from "@/config/supabase";
import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG."));
    }
  },
});

const BUCKET = "documents";

class UploadController {
  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      if (!req.company?.id) {
        return res.status(403).json({ error: "Contexto da empresa não encontrado" });
      }

      const { entity, type } = req.params;
      const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
      const path = `${req.company.id}/${entity}/${type}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

      return res.status(200).json({ url: data.publicUrl });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
