const client = {
    on: jest.fn(),
    connect: jest.fn(),
    setEx: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
};

jest.mock("redis", () => ({
    createClient: jest.fn(() => client),
}));

import { HttpError } from "../core/utils/error.util";
import { RedisConfig } from "./redis";

describe("RedisConfig", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        client.setEx.mockResolvedValue("OK");
        process.env.REDIS_URL = "redis://localhost:6379";
        process.env.SESION_SG_EXP = "3600";
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("stores and reads session and reset tokens", async () => {
        const redis = new RedisConfig();
        expect(client.connect).toHaveBeenCalled();
        client.on.mock.calls[0][1](new Error("socket"));

        await redis.storeTokenInRedis("admin", "token");
        expect(client.setEx).toHaveBeenCalledWith("admin", 3600, "token");

        client.get.mockResolvedValue("token");
        await expect(redis.getTokenFromRedis("admin")).resolves.toBe("token");
        await expect(redis.getResetPassTokenFromRedis("abc")).resolves.toBe("token");
        expect(client.get).toHaveBeenCalledWith("passwordReset:abc");

        await redis.storeResetPassToken("abc", "admin");
        expect(client.setEx).toHaveBeenCalledWith("passwordReset:abc", 300, "admin");

        await redis.deleteToken("admin");
        await redis.deleteResetPassToken("abc");
        expect(client.del).toHaveBeenCalledWith("passwordReset:abc");
        redis.closeConn();
        expect(client.quit).toHaveBeenCalled();
    });

    it("maps a bad ttl and a redis failure to catalog errors", async () => {
        process.env.SESION_SG_EXP = "nope";
        const redis = new RedisConfig();
        await expect(redis.storeTokenInRedis("admin", "token")).rejects.toMatchObject({ internalCode: "SRV_001" });

        process.env.SESION_SG_EXP = "60";
        const working = new RedisConfig();
        client.setEx.mockRejectedValueOnce(new Error("down"));
        await expect(working.storeTokenInRedis("admin", "token")).rejects.toBeInstanceOf(HttpError);

        client.get.mockRejectedValue(new Error("down"));
        await expect(working.getTokenFromRedis("admin")).rejects.toMatchObject({ internalCode: "SRV_002" });
        await expect(working.getResetPassTokenFromRedis("abc")).rejects.toMatchObject({ internalCode: "SRV_002" });
        client.del.mockRejectedValue(new Error("down"));
        await expect(working.deleteToken("admin")).rejects.toMatchObject({ internalCode: "SRV_002" });
        await expect(working.deleteResetPassToken("abc")).rejects.toMatchObject({ internalCode: "SRV_002" });
    });
});
