import { z } from 'zod';

import type { FormField } from './types';

/** Build a zod schema from a dynamic field list (react-hook-form + zod, §2). */
export function buildZodSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.type === 'number') {
      shape[f.name] = f.required
        ? z.coerce.number({ invalid_type_error: `${f.label} must be a number` })
        : z.coerce.number().optional().or(z.literal('').transform(() => undefined));
    } else if (f.type === 'checkbox') {
      shape[f.name] = f.required
        ? z.literal(true, { errorMap: () => ({ message: `${f.label} is required` }) })
        : z.boolean().optional();
    } else {
      let s = z.string();
      if (f.type === 'email') s = s.email('Enter a valid email');
      shape[f.name] = f.required ? s.min(1, `${f.label} is required`) : s.optional();
    }
  }
  return z.object(shape);
}

/** Minimal zod ↔ react-hook-form bridge (avoids the extra @hookform/resolvers dep). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver(schema: z.ZodTypeAny): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (values: any) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: Record<string, any> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !errors[key]) errors[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors };
  };
}
