import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(2, "Le pseudo doit contenir au moins 2 caractères")
  .max(32, "Le pseudo ne peut pas dépasser 32 caractères")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Lettres, chiffres, points, tirets et underscores uniquement",
  );
