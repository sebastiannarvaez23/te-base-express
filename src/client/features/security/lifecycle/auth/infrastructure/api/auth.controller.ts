import { Request, Response } from "express";

import jwt from "jsonwebtoken";

import { AuthManagement } from "../../application/use-cases/auth-management";
import { AuthMiddleware } from "../../../../../../../core/middlewares/auth/authenticate.middleware";
import { clearClientSessionCookies, readCookie, REFRESH_CLIENT_COOKIE, writeClientSessionCookies } from "../../../../../../../core/http/cookies";
import { ErrorHandlerUtil } from "../../../../../../../core/utils/error-handler.util";
import { HttpError } from "../../../../../../../core/utils/error.util";

export class AuthController {

    constructor(
        private readonly _authManagement: AuthManagement,
        private readonly _authMiddleware: AuthMiddleware,
        private readonly _handlerError: ErrorHandlerUtil,
    ) { }

    async authentication(req: Request, res: Response) {
        await this._authMiddleware.getValidateAuth()(req, res, async () => {
            try {
                const session = await this._authManagement.authentication(req.body);
                const refreshSeconds = (session.persistent ? Number(process.env.REFRESH_TTL_DAYS || 14) : Number(process.env.REFRESH_TTL_DAYS_NO_REMEMBER || 1)) * 86400;
                writeClientSessionCookies(res, session.accessToken, session.refreshToken, session.persistent, Number(process.env.SESION_SG_EXP || 3600), refreshSeconds);
                res.status(200).json({ token: session.accessToken });
            } catch (error) {
                this._handlerError.handle(error as HttpError | Error, req, res);
            }
        });
    }

    async refresh(req: Request, res: Response) {
        try {
            const session = await this._authManagement.refresh(readCookie(req.headers.cookie, REFRESH_CLIENT_COOKIE));
            const refreshSeconds = (session.persistent ? Number(process.env.REFRESH_TTL_DAYS || 14) : Number(process.env.REFRESH_TTL_DAYS_NO_REMEMBER || 1)) * 86400;
            writeClientSessionCookies(res, session.accessToken, session.refreshToken, session.persistent, Number(process.env.SESION_SG_EXP || 3600), refreshSeconds);
            res.status(200).json({ token: session.accessToken });
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const authHeader = req.headers['authorization'];
            const raw = authHeader?.split(' ')[1] || readCookie(req.headers.cookie, 'access_client');
            const preview = raw ? jwt.decode(raw) as jwt.JwtPayload | null : null;
            const nickname = typeof preview?.username === "string" ? preview.username : "";
            const sid = preview?.user_id && preview?.sid
                ? { userId: String(preview.user_id), sid: String(preview.sid) }
                : undefined;
            clearClientSessionCookies(res);
            await this._authManagement.logout(authHeader || (raw ? `Bearer ${raw}` : undefined), nickname, sid);
            return res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async requestPasswordReset(req: Request, res: Response) {
        try {
            const { email } = req.body;
            res.status(200).json(await this._authManagement.requestPasswordReset(email));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async passwordReset(req: Request, res: Response) {
        try {
            const { token } = req.params;
            const { newPassword } = req.body;
            res.status(200).json(await this._authManagement.passwordReset(token, newPassword));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async generateOAuth2Token(req: Request, res: Response) {
        try {
            const { client_id, client_secret } = req.body;
            if (!client_id || !client_secret) throw new HttpError("VAL_001");
            const token = await this._authManagement.generateOAuth2Token(client_id, client_secret);
            res.status(200).json({ token });
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async registerMicroservice(req: Request, res: Response) {
        try {
            const result = await this._authManagement.addMicroservice(req.body);
            res.status(200).json(result);
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }
}