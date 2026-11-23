import { z } from "zod";

/** Runtime contracts. Zod is the TypeScript counterpart of the Pydantic schemas used in the Django bases. */

const pageLimit = {
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
};

export const adminLoginSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(3).max(200),
    remember_me: z.boolean().optional(),
}).strict();

export const loginSchema = z.object({
    nickname: z.string().min(5).max(20),
    password: z.string().min(3).max(200),
    remember_me: z.boolean().optional(),
}).strict();

export const passwordResetRequestSchema = z.object({
    email: z.string().email().max(200),
}).strict();

export const passwordResetSchema = z.object({
    newPassword: z.string().min(3).max(200),
}).strict();

export const oauthClientSchema = z.object({
    client_id: z.string().min(1).max(100),
    client_secret: z.string().min(1).max(200),
}).strict();

/** Lists, decimals and nested objects stay declared. Unknown keys are rejected. */
export const declaredValueSchema = z.object({
    tags: z.array(z.string().max(20)).max(20),
    amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
    address: z.object({ city: z.string().max(80) }).strict(),
}).strict();

export const personListSchema = z.object({
    ...pageLimit,
    firstName: z.string().min(3).max(70).optional(),
    lastName: z.string().min(3).max(70).optional(),
    email: z.string().email().optional(),
}).strict();

export const roleListSchema = z.object({
    ...pageLimit,
    name: z.string().min(3).max(70).optional(),
}).strict();

export const namedListSchema = z.object({
    ...pageLimit,
    name: z.string().min(3).max(70).optional(),
    code: z.string().regex(/^\d{4}$/).optional(),
}).strict();

export function zodValidate(schema: z.ZodTypeAny, data: unknown): { valid: boolean; errors: Record<string, string[] | string> } {
    const parsed = schema.safeParse(data);
    if (parsed.success) return { valid: true, errors: {} };
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "body";
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
    }
    errors.internalCode = ["VAL_001"];
    return { valid: false, errors };
}
