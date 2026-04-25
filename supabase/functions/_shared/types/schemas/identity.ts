import { z } from 'npm:zod@3.25.76';

export const createHouseholdSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
  })
  .strict();

export const joinHouseholdSchema = z
  .object({
    invite_code: z.string().trim().min(1).max(32),
  })
  .strict();

export const updateHouseholdSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
  })
  .strict();
