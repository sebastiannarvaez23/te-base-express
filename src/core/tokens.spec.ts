import jwt from "jsonwebtoken";

import { HttpError } from "./utils/error.util";
import { OAuth2TokenManager } from "./utils/o-auth2-token-manager.util";
import { generateResetToken } from "./utils/token-generator.util";
import { TokenManager } from "./utils/token-manager.util";

function redis() {
    return {
        storeTokenInRedis: jest.fn().mockResolvedValue(undefined),
        getTokenFromRedis: jest.fn(),
        deleteToken: jest.fn().mockResolvedValue(1),
    };
}

describe("generateResetToken", () => {
    it("returns 64 hex characters", () => {
        expect(generateResetToken()).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe("TokenManager", () => {
    const secret = "unit-secret";

    beforeEach(() => {
        (TokenManager as any).instance = undefined;
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("requires redis on the first construction", () => {
        expect(() => TokenManager.getInstance()).toThrow(/RedisConfig/);
    });

    it("signs a token, stores it, and verifies the same value", async () => {
        const store = redis();
        const manager = TokenManager.getInstance(store as any);
        const token = await manager.generateToken({
            sub: "admin", id: "1", role: "admin", services: ["0201"],
        }, secret, 60);
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        expect(decoded.exp! - decoded.iat!).toBe(60);
        expect(store.storeTokenInRedis).toHaveBeenCalledWith("admin", token);
        expect(manager.getToken()).toBe(token);

        store.getTokenFromRedis.mockResolvedValue(token);
        await expect(manager.verifyToken(token, secret)).resolves.toMatchObject({ sub: "admin" });
    });

    it("rejects a mismatched, expired, or unsigned token", async () => {
        const store = redis();
        const manager = TokenManager.getInstance(store as any);
        const token = jwt.sign({ sub: "admin", id: "1", role: "admin", services: [] }, secret);
        store.getTokenFromRedis.mockResolvedValue("other");
        await expect(manager.verifyToken(token, secret)).rejects.toMatchObject({ internalCode: "AUTH_004" });

        const expired = jwt.sign({ sub: "admin", id: "1", role: "admin", services: [], exp: 1 }, secret);
        await expect(manager.verifyToken(expired, secret)).rejects.toMatchObject({ internalCode: "AUTH_004" });
        await expect(manager.verifyToken("not-a-jwt", secret)).rejects.toMatchObject({ internalCode: "AUTH_004" });
    });

    it("maps redis failures while issuing or revoking", async () => {
        const store = redis();
        store.storeTokenInRedis.mockRejectedValue(new Error("down"));
        const manager = TokenManager.getInstance(store as any);
        await expect(manager.generateToken({
            sub: "admin", id: "1", role: "admin", services: [],
        }, secret, 60)).rejects.toBeInstanceOf(HttpError);

        store.deleteToken.mockRejectedValue(new Error("down"));
        await expect(manager.revokeToken("admin")).rejects.toMatchObject({ internalCode: "SRV_001" });
        manager.setToken("kept");
        expect(manager.getToken()).toBe("kept");
        manager.clearToken();
        expect(manager.getToken()).toBeNull();
    });
});

describe("OAuth2TokenManager", () => {
    beforeEach(() => {
        (OAuth2TokenManager as any).instance = undefined;
        process.env.JWT_ISSUER = "base";
        process.env.JWT_AUDIENCE = "clients";
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("prefixes the subject and checks the redis whitelist", async () => {
        const store = redis();
        const manager = OAuth2TokenManager.getInstance(store as any);
        const token = await manager.generateToken({ sub: "billing" }, "secret", 60);
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        expect(decoded.sub).toBe("microservice_billing");
        expect(decoded.exp! - decoded.iat!).toBe(60);
        expect(decoded.iss).toBe("base");
        expect(decoded.aud).toBe("clients");
        expect(store.storeTokenInRedis).toHaveBeenCalledWith("microservice_billing", token);

        store.getTokenFromRedis.mockResolvedValue(token);
        await expect(manager.verifyToken(token, "secret")).resolves.toMatchObject({ sub: "microservice_billing" });

        store.getTokenFromRedis.mockResolvedValue(null);
        await expect(manager.verifyToken(token, "secret")).rejects.toMatchObject({ internalCode: "AUTH_004" });
    });

    it("revokes by subject and reports a redis failure", async () => {
        const store = redis();
        const manager = OAuth2TokenManager.getInstance(store as any);
        await manager.revokeToken("microservice_billing");
        expect(store.deleteToken).toHaveBeenCalledWith("microservice_billing");
        store.deleteToken.mockRejectedValue(new Error("down"));
        await expect(manager.revokeToken("microservice_billing")).rejects.toMatchObject({ internalCode: "SRV_001" });
    });
});
