import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { zodValidate } from "../../contracts/input-schemas";
import { isNullable, isRequired } from "./validation.type";
import { toFieldErrors } from "../../utils/error-handler.util";

type ValidatorFn = (value: any) => boolean | string;

interface ValidationRules {
    [key: string]: ValidatorFn[];
}

export abstract class BaseValidator<T> {
    private readonly rules: ValidationRules;
    private readonly fields: [string, ValidatorFn[]][];
    private readonly required = new Set<string>();

    constructor(rules: ValidationRules) {
        this.rules = rules;
        this.fields = Object.entries(rules);
        for (const [field, validators] of this.fields) {
            if (validators.includes(isRequired)) this.required.add(field);
        }
    }

    validate(data: T): { valid: boolean, errors: Record<string, string[] | string> } {
        const record = data as Record<string, unknown>;
        const errors: Record<string, string[] | string> = { internalCode: "VAL_001" };
        let valid = true;

        for (const field of Object.keys(record)) {
            if (!this.rules[field]) {
                errors[field] = `The parameter '${field}' was not expected`;
                valid = false;
            }
        }

        for (const [field, validators] of this.fields) {
            const value = record[field];
            if (value === undefined || value === null) {
                if (this.required.has(field)) {
                    valid = false;
                    errors[field] = [String(isRequired(value))];
                }
                continue;
            }

            const messages: string[] = [];
            for (const validator of validators) {
                if (validator === isRequired || validator === isNullable) continue;
                const result = validator(value);
                if (typeof result === "string") messages.push(result);
            }
            if (messages.length > 0) {
                valid = false;
                errors[field] = messages;
            }
        }

        return { valid, errors };
    }
}

export function validateBody(schema: z.ZodTypeAny) {
    return (req: Request, res: Response, next: NextFunction) => {
        const { valid, errors } = zodValidate(schema, req.body ?? {});
        if (!valid) return res.status(400).json({ errors: toFieldErrors(errors) });
        next();
    };
}

export const validationDataMiddleware = <T>(validator: BaseValidator<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { valid, errors } = validator.validate(req.body);
        if (!valid) {
            return res.status(400).json({ errors: toFieldErrors(errors) });
        }
        next();
    };
};

export const validationDataFileMiddleware = <T>(validator: BaseValidator<T>) => {
    return (req: any, res: Response, next: NextFunction) => {
        const data = {
            ...req.body,
            image: req.file,
        };

        const { valid, errors } = validator.validate(data);
        if (!valid) {
            return res.status(400).json({ errors: toFieldErrors(errors) });
        }
        next();
    };
};