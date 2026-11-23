import { config } from "dotenv";
import { createClient } from "redis";

import { logError } from "../core/redaction";
import { HttpError } from "../core/utils/error.util";

config();

export class RedisConfig {

    private readonly _redisClient: any;
    private readonly _redisUrl: string;
    private readonly _SESION_SG_EXP: number;

    constructor() {
        this._redisUrl = process.env.REDIS_URL!;
        this._SESION_SG_EXP = Number(process.env.SESION_SG_EXP!);
        this._redisClient = createClient({ url: this._redisUrl });

        this._redisClient.on('error', (err: any) => {
            logError("Redis client error", err);
        });

        this._redisClient.connect();
    }

    async storeTokenInRedis(nickname: string, token: string) {
        const expiryTime = this._SESION_SG_EXP;
        if (isNaN(expiryTime)) {
            throw new HttpError("SRV_001");
        }

        await this._redisClient.setEx(nickname, expiryTime, token)
            .catch((err: any) => {
                logError("Redis store failed", err);
                throw new HttpError("SRV_002");
            });
    }

    async getTokenFromRedis(nickname: string) {
        try {
            return await this._redisClient.get(nickname);
        } catch (err) {
            logError("Redis read failed", err);
            throw new HttpError("SRV_002");
        }
    }

    async getResetPassTokenFromRedis(token: string) {
        try {
            return await this._redisClient.get(`passwordReset:${token}`);
        } catch (err) {
            logError("Redis read failed", err);
            throw new HttpError("SRV_002");
        }
    }

    async storeResetPassToken(resetToken: string, userId: string) {
        await this._redisClient.setEx(`passwordReset:${resetToken}`, 300, userId);
    }

    async deleteToken(nickname: string) {
        try {
            return await this._redisClient.del(nickname);
        } catch (err) {
            logError("Redis read failed", err);
            throw new HttpError("SRV_002");
        }
    }

    async deleteResetPassToken(token: string) {
        try {
            return await this._redisClient.del(`passwordReset:${token}`);
        } catch (err) {
            logError("Redis read failed", err);
            throw new HttpError("SRV_002");
        }
    }

    public closeConn() {
        this._redisClient.quit();
    }

    async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
        await this._redisClient.setEx(key, ttlSeconds, value);
    }

    async getRaw(key: string): Promise<string | null> {
        return this._redisClient.get(key);
    }

    async deleteRaw(key: string): Promise<void> {
        await this._redisClient.del(key);
    }
}
