import { NextFunction, Request, Response } from "express";

import { isEmail, isUUID } from "../middlewares/validators/validation.type";

export function pathParams(rules: Record<string, (value: unknown) => boolean | string>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors = Object.entries(rules).flatMap(([field, check]) => {
            const result = check(req.params[field]);
            return result === true ? [] : [{ field, code: "VAL_001", detail: String(result) }];
        });
        if (errors.length) return res.status(400).json({ errors });
        next();
    };
}

export const uuidParam = isUUID;

export function nicknameParam(value: unknown): boolean | string {
    if (typeof value === "string" && /^[A-Za-z0-9._-]{5,20}$/.test(value)) return true;
    return "Must be a nickname of 5 to 20 characters.";
}

export function emailParam(value: unknown): boolean | string {
    if (typeof value === "string" && value.length <= 200 && isEmail(value) === true) return true;
    return "Must be a valid email address.";
}

export function resetTokenParam(value: unknown): boolean | string {
    if (typeof value === "string" && /^[a-f0-9]{64}$/.test(value)) return true;
    return "That reset link is no longer valid. Request another one.";
}
