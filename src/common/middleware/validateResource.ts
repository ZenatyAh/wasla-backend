import type { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

// هذه Function تستقبل الـ Schema وترجع Middleware
const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);

      next(); // إذا نجح التحقق، انتقل للـ Controller
    } catch (e: any) {
      // هنا يجب عليك التعامل مع الخطأ
      if (e instanceof ZodError) {
        return res.status(400).json({
          status: "fail",
          errors: e.issues.map((err) => ({
            path: err.path[0],
            message: err.message,
          })),
        });
      }
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  };

export default validate;
