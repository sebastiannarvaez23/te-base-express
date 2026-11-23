import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { clearAdminSessionCookies, readCookie, REFRESH_ADMIN_COOKIE, writeAdminSessionCookies } from "../../../../../../core/http/cookies";
import { ErrorHandlerUtil } from "../../../../../../core/utils/error-handler.util";
import { HttpError } from "../../../../../../core/utils/error.util";
import { AuthenticateAdminUseCase, LogoutAdminUseCase, RefreshAdminSessionUseCase } from "../application/authenticate-admin.use-case";

export class AdminAuthController {
    constructor(
        private readonly login: AuthenticateAdminUseCase,
        private readonly refreshSession: RefreshAdminSessionUseCase,
        private readonly logoutSession: LogoutAdminUseCase,
        private readonly errors: ErrorHandlerUtil,
    ) { }

    async token(req: Request, res: Response) {
        try {
            const session = await this.login.execute(req.body);
            const refreshSeconds = (session.persistent ? Number(process.env.REFRESH_TTL_DAYS || 14) : Number(process.env.REFRESH_TTL_DAYS_NO_REMEMBER || 1)) * 86400;
            writeAdminSessionCookies(res, session.accessToken, session.refreshToken, session.persistent, Number(process.env.SESION_SG_EXP || 3600), refreshSeconds);
            res.status(200).json({ token: session.accessToken });
        } catch (error) {
            this.errors.handle(error as HttpError | Error, req, res);
        }
    }

    async refresh(req: Request, res: Response) {
        try {
            const session = await this.refreshSession.execute(readCookie(req.headers.cookie, REFRESH_ADMIN_COOKIE));
            const refreshSeconds = (session.persistent ? Number(process.env.REFRESH_TTL_DAYS || 14) : Number(process.env.REFRESH_TTL_DAYS_NO_REMEMBER || 1)) * 86400;
            writeAdminSessionCookies(res, session.accessToken, session.refreshToken, session.persistent, Number(process.env.SESION_SG_EXP || 3600), refreshSeconds);
            res.status(200).json({ token: session.accessToken });
        } catch (error) {
            this.errors.handle(error as HttpError | Error, req, res);
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const raw = readCookie(req.headers.cookie, "access_admin");
            const preview = raw ? jwt.decode(raw) as jwt.JwtPayload | null : null;
            const sid = preview?.user_id && preview?.sid
                ? { userId: String(preview.user_id), sid: String(preview.sid) }
                : undefined;
            clearAdminSessionCookies(res);
            await this.logoutSession.execute(sid);
            res.status(200).json({ message: "Logout successful" });
        } catch (error) {
            this.errors.handle(error as HttpError | Error, req, res);
        }
    }
}
