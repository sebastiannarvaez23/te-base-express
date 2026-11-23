import { Request, Response } from "express";
import { UniqueConstraintError, ValidationErrorItem, DatabaseError, ForeignKeyConstraintError } from "sequelize";

import { logError } from "../redaction";
import { HttpError } from "./error.util";

export type FieldError = { field: string; code: string; detail: string };

export function toFieldErrors(errors: Record<string, string[] | string>, code = "VAL_001"): FieldError[] {
    const resolvedCode = String(errors.internalCode || code);
    const items = Object.entries(errors)
        .filter(([field]) => field !== "internalCode")
        .flatMap(([field, value]) => {
            const details = Array.isArray(value) ? value : [String(value)];
            return details.filter(Boolean).map((detail) => ({ field, code: resolvedCode, detail }));
        });
    return items.length ? items : [{ field: "", code: resolvedCode, detail: "Invalid input" }];
}

export class ErrorHandlerUtil {
    handle(err: HttpError | Error, _req: Request, res: Response) {
        logError("Request failed", err instanceof Error ? err.name : "Error");

        if (err instanceof UniqueConstraintError) {
            const httpError = new HttpError("VAL_002");
            const errors = err.errors.map((item: ValidationErrorItem) => ({
                field: item.path || "unknown",
                code: httpError.internalCode,
                detail: httpError.message,
            }));
            return res.status(httpError.statusCode).json({ errors });
        }

        if (err instanceof ForeignKeyConstraintError) {
            const parts = err.index ? err.index.split("_") : [];
            const field = parts.length > 1 ? parts.slice(1).join("_") : "unknown";
            const httpError = new HttpError("HTTP_001");
            return res.status(httpError.statusCode).json({
                errors: [{ field, code: httpError.internalCode, detail: httpError.message }],
            });
        }

        if (err instanceof DatabaseError) {
            const errorCode = (err.original as { code?: string } | undefined)?.code;
            const httpError = new HttpError(errorCode === "22P02" ? "VAL_001" : "SRV_002");
            return res.status(httpError.statusCode).json({
                errors: [{ field: "", code: httpError.internalCode, detail: httpError.message }],
            });
        }

        if (err instanceof HttpError) {
            return res.status(err.statusCode).json({
                errors: [{ field: "", code: err.internalCode, detail: err.message }],
            });
        }

        const genericError = new HttpError("SRV_001");
        return res.status(genericError.statusCode).json({
            errors: [{ field: "", code: genericError.internalCode, detail: genericError.message }],
        });
    }
}
