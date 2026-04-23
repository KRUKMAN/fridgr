import { z } from 'npm:zod@3.25.76';

export const createHouseholdSchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export const signInSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict();
