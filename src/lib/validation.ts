import { z } from "zod";

/**
 * Validaciones compartidas por el cliente y el servidor.
 *
 * El mismo esquema corre en los dos lados: el formulario muestra el error al
 * instante y la acción vuelve a validar antes de tocar la base. Nunca se
 * confía en la validación del navegador.
 */

export const MIN_PASSWORD = 8;

/** Requisitos de una contraseña segura, en el orden en que se muestran. */
export const PASSWORD_RULES = [
  { id: "length", label: `Al menos ${MIN_PASSWORD} caracteres`, test: (p: string) => p.length >= MIN_PASSWORD },
  { id: "lower", label: "Una minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "Una mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "Un número", test: (p: string) => /\d/.test(p) },
] as const;

export function passwordIssues(password: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
}

/** Fuerza 0..4 para la barra de progreso del formulario. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = PASSWORD_RULES.filter((r) => r.test(password)).length;
  // Una contraseña larga y variada suma; una muy corta no llega al máximo.
  if (password.length >= 12 && score === PASSWORD_RULES.length) score = 4;
  return Math.min(4, score);
}

export const STRENGTH_LABELS = ["", "Débil", "Aceptable", "Buena", "Excelente"];

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`)
  .regex(/[a-z]/, "La contraseña necesita una letra minúscula.")
  .regex(/[A-Z]/, "La contraseña necesita una letra mayúscula.")
  .regex(/\d/, "La contraseña necesita un número.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escribí tu email.")
  .email("Ese email no parece válido.");

const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres.")
  .max(80, "El nombre es demasiado largo.");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string().min(1, "Repetí la contraseña."),
    role: z.enum(["CLIENT", "WORKER", "COMPANY"], { message: "Elegí cómo vas a usar Better Work." }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribí tu contraseña."),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Escribí tu contraseña actual."),
    next: passwordSchema,
    confirm: z.string().min(1, "Repetí la contraseña nueva."),
  })
  .refine((d) => d.next === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  })
  .refine((d) => d.next !== d.current, {
    path: ["next"],
    message: "La contraseña nueva debe ser distinta de la actual.",
  });

/** Errores por campo, listos para pintar debajo de cada input. */
export type FieldErrors = Record<string, string>;

export function collectErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
