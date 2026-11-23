import { Request, Response, NextFunction } from "express";

import { HttpError } from "../../utils/error.util";

export class AuthorizationMiddleware {

    checkAccess(serviceId: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = req.user;

            if (user && user.sub && user.sub.startsWith("microservice_")) {
                return next();
            }

            if (!user || !user.services) {
                return next(new HttpError("PERM_001"));
            }

            const hasAccess = user.services.includes(serviceId);
            if (!hasAccess) {
                return next(new HttpError("PERM_002"));
            }

            next();
        };
    }
}