import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { resolveAuthContext } from "../../http/auth-context";
import { ACCESS_ADMIN_COOKIE, ACCESS_CLIENT_COOKIE, readCookie } from "../../http/cookies";
import { KeyValueStore, sessionAlive, SessionSide } from "../../http/client-session";
import { AuthValidator } from "../validators/auth.validator";
import { HttpError } from "../../utils/error.util";
import { validationDataMiddleware } from "../validators/validation.middleware";
import { TokenManager } from "../../utils/token-manager.util";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export class AuthMiddleware {

    private secret: string;
    private authValidator: AuthValidator;
    private tokenManager: TokenManager;

    constructor(
        _authValidator: AuthValidator,
        _tokenManager: TokenManager,
        private readonly _sessions?: KeyValueStore,
    ) {
        this.secret = process.env.SECRET_KEY!;
        this.authValidator = _authValidator;
        this.tokenManager = _tokenManager;
    }

    public getValidateAuth() {
        return validationDataMiddleware(this.authValidator);
    }

    public authenticateToken = (req: Request, res: Response, next: NextFunction) =>
        this.authenticateAs("client")(req, res, next);

    public authenticateAdmin = (req: Request, res: Response, next: NextFunction) =>
        this.authenticateAs("admin")(req, res, next);

    private authenticateAs = (side: SessionSide) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            resolveAuthContext(req);
            const bearer = req.headers.authorization?.split(" ")[1];
            const cookieName = side === "admin" ? ACCESS_ADMIN_COOKIE : ACCESS_CLIENT_COOKIE;
            const token = side === "admin"
                ? readCookie(req.headers.cookie, cookieName) || bearer
                : bearer || readCookie(req.headers.cookie, cookieName);
            if (!token) return next(new HttpError("AUTH_005"));

            const preview = jwt.decode(token) as jwt.JwtPayload | null;
            if (preview?.user_type === "client" || preview?.user_type === "admin") {
                const verified = jwt.verify(token, this.secret) as jwt.JwtPayload;
                if (verified.user_type !== side || !this._sessions) return next(new HttpError("AUTH_004"));
                const alive = await sessionAlive(this._sessions, String(verified.user_id), String(verified.sid), side);
                if (!alive) return next(new HttpError("AUTH_004"));
                req.user = verified;
                return next();
            }

            if (side === "admin") return next(new HttpError("AUTH_004"));
            req.user = await this.tokenManager.verifyToken(token, this.secret);
            next();
        } catch (err: any) {
            if (err instanceof jwt.JsonWebTokenError) {
                return next(new HttpError("AUTH_004"));
            }
            if (err instanceof HttpError) {
                return next(err);
            }
            return next(new HttpError("SRV_001"));
        }
    };
}