import type { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

// هذه Function تستقبل الـ Schema وترجع Middleware
const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      // نقوم بفحص Body, Query, و Params معاً لضمان تغطية شاملة
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next(); // إذا نجح التحقق، انتقل للـ Controller
    } catch (e: any) {
      // هنا يجب عليك التعامل مع الخطأ
      if (e instanceof ZodError) {
        return res.status(400).json({
          status: "fail",
          errors: e.issues.map((err) => ({
            path: err.path[1], // اسم الحقل الذي فيه الخطأ
            message: err.message,
          })),
        });
      }
      return res.status(500).send("Internal Server Error");
    }
  };

export default validate;
