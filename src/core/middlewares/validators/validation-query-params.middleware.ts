import { NextFunction, Request, Response } from "express";

import { QueryParams } from "../../contracts/query-params.entity";
import { toFieldErrors } from "../../utils/error-handler.util";
import { BaseValidator } from "./validation.middleware";

export class QueryParamsMiddleware {
    queryValidationMiddleware = (
        validator: BaseValidator<any>,
        buildQueryParams: (data: any) => QueryParams
    ) => {
        return (req: Request, res: Response, next: NextFunction) => {
            const data = req.query;
            const { valid, errors } = validator.validate(data);

            if (!valid) {
                return res.status(400).json({ errors: toFieldErrors(errors) });
            }

            try {
                const queryParams = buildQueryParams(data);
                (req as any).queryParams = queryParams;
                next();
            } catch (error) {
                return res.status(400).json({
                    errors: [{ field: "query", code: "VAL_001", detail: "Invalid query parameters" }],
                });
            }
        };
    };
}
