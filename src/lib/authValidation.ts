import { z } from "zod";

export const emailSchema = z
  .string()
  .email({ message: "البريد الإلكتروني غير صالح" })
  .max(255, { message: "البريد الإلكتروني طويل جداً" });

export const passwordSchema = z
  .string()
  .min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" })
  .max(128, { message: "كلمة المرور طويلة جداً" })
  .regex(/[a-z]/, { message: "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل" })
  .regex(/[A-Z]/, { message: "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل" })
  .regex(/[0-9]/, { message: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل" });

export const usernameSchema = z
  .string()
  .min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" })
  .max(30, { message: "اسم المستخدم طويل جداً" })
  .regex(/^[a-zA-Z0-9_-]+$/, { message: "اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط" });

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

export const changePasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

export const changeUsernameSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, { message: "كلمة المرور مطلوبة للتأكيد" }),
});
