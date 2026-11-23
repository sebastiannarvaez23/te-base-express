import jwt from "jsonwebtoken";

import { RedisConfig } from "../../config/redis";
import { HttpError } from "./error.util";

/** jsonwebtoken treats a numeric expiresIn as seconds, never as an absolute timestamp. */
export function accessTokenTtlSeconds(sessionSeconds: number): number {
    if (!Number.isFinite(sessionSeconds) || sessionSeconds <= 0) {
        throw new Error("SESION_SG_EXP must be a positive number of seconds");
    }
    return sessionSeconds;
}

interface TokenPayload {
    sub: string;
    id: string;
    role: string;
    services: string[];
}

export class TokenManager {
    private static instance: TokenManager;
    private redisConfig: RedisConfig;
    private currentToken: string | null = null;

    private constructor(redisConfig: RedisConfig) {
        this.redisConfig = redisConfig;
    }

    public static getInstance(redisConfig?: RedisConfig): TokenManager {
        if (!TokenManager.instance) {
            if (!redisConfig) {
                throw new Error("RedisConfig instance is required for TokenManager initialization.");
            }
            TokenManager.instance = new TokenManager(redisConfig);
        }
        return TokenManager.instance;
    }

    public async generateToken(payload: TokenPayload, secret: string, expiresIn: number): Promise<string> {
        try {
            const token = jwt.sign(payload, secret, { expiresIn });
            await this.redisConfig.storeTokenInRedis(payload.sub, token);
            this.currentToken = token;
            return token;
        } catch (error) {
            console.error("Token generation failed");
            throw new HttpError("SRV_001");
        }
    }

    public async verifyToken(token: string, secret: string): Promise<TokenPayload> {
        try {
            const decoded = jwt.verify(token, secret) as TokenPayload;
            const storedToken = await this.redisConfig.getTokenFromRedis(decoded.sub);
            if (storedToken !== token) throw new HttpError("AUTH_004");
            return decoded;
        } catch (error) {
            if (error instanceof HttpError) throw error;
            if (error instanceof jwt.TokenExpiredError) {
                throw new HttpError("AUTH_004");
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new HttpError("AUTH_004");
            }
            throw new HttpError("AUTH_004");
        }
    }

    public async revokeToken(nickname: string): Promise<void> {
        try {
            await this.redisConfig.deleteToken(nickname);
            this.currentToken = null;
        } catch (error) {
            console.error("Token revocation failed");
            throw new HttpError("SRV_001");
        }
    }

    public setToken(token: string): void {
        this.currentToken = token;
    }

    public getToken(): string | null {
        return this.currentToken;
    }

    public clearToken(): void {
        this.currentToken = null;
    }
}
