import { z } from 'zod';
export {
  loginSchema,
  registerSchema,
  refreshSchema,
  forgotPasswordSchema as emailSchema,
  verifyEmailSchema as tokenSchema,
  resetPasswordSchema as resetSchema,
} from '@reservas/shared';
export const totpSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
