import { createHash } from "crypto";
import jwt from "jsonwebtoken";

import { cookieOptions, writeAuthCookie, authCookieName } from "./cookies";
import { apiPrefix } from "./api-prefix";
import { resolveAuthContext } from "./auth-context";
import { issueClientSession, rotateClientSession, clientSessionAlive } from "./client-session";
import { openApiDocument, redocHtml, swaggerHtml } from "./openapi";
import { KeyValueStore } from "./client-session";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
        data,
        async setRaw(key: string, value: string) { data.set(key, value); },
        async getRaw(key: string) { return data.get(key) ?? null; },
        async deleteRaw(key: string) { data.delete(key); },
    };
}

describe("client session contract", () => {
    const secret = "unit-secret";

    it("issues the access claims and rotates the refresh without moving activity", async () => {
        const store = memoryStore();
        const first = await issueClientSession(store, {
            userId: "user-1", username: "admin", role: "Admin", services: ["0201"], rememberMe: true,
        }, secret, 60);
        const claims = jwt.verify(first.accessToken, secret) as jwt.JwtPayload;
        expect(claims).toMatchObject({
            user_id: "user-1", user_type: "client", schema_name: "public",
            sid: first.sid, access_mode: "full", username: "admin",
        });
        expect(await clientSessionAlive(store, "user-1", first.sid)).toBe(true);

        const activity = JSON.parse((await store.getRaw(`rt:client:user-1:${first.sid}`))!).lastActivityAt;
        const second = await rotateClientSession(store, first.refreshToken, secret, 60);
        expect(second).not.toBeNull();
        expect(second!.refreshToken).not.toBe(first.refreshToken);
        expect(await clientSessionAlive(store, "user-1", first.sid)).toBe(false);
        const next = JSON.parse((await store.getRaw(`rt:client:user-1:${second!.sid}`))!);
        expect(next.lastActivityAt).toBe(activity);
        expect(await rotateClientSession(store, first.refreshToken, secret, 60)).toBeNull();

        const hash = createHash("sha256").update(second!.refreshToken).digest("hex").slice(0, 16);
        expect(second!.sid).toBe(hash);
    });

    it("uses a shorter refresh window when remember-me is off", async () => {
        process.env.REFRESH_TTL_DAYS = "14";
        process.env.REFRESH_TTL_DAYS_NO_REMEMBER = "1";
        const ttls: number[] = [];
        const store: KeyValueStore = {
            async setRaw(_key: string, _value: string, ttlSeconds: number) { ttls.push(ttlSeconds); },
            async getRaw() { return null; },
            async deleteRaw() { return undefined; },
        };
        await issueClientSession(store, {
            userId: "u", username: "admin", role: "Admin", services: [], rememberMe: true,
        }, secret, 60);
        await issueClientSession(store, {
            userId: "u", username: "admin", role: "Admin", services: [], rememberMe: false,
        }, secret, 60);
        expect(ttls[0]).toBe(14 * 86400);
        expect(ttls[2]).toBe(86400);
    });
});

describe("auth cookies and context", () => {
    it("sets HttpOnly Lax cookies on .base.local and tells the two sessions apart", () => {
        delete process.env.AUTH_COOKIE_DOMAIN;
        const options = cookieOptions(60);
        expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", domain: ".base.local", path: "/" });
        expect(options.maxAge).toBe(60000);
        expect(authCookieName("access")).toBe("access_client");
        expect(authCookieName("refresh", true)).toBe("refresh_admin");
        expect(authCookieName("device")).toBe("device_client");

        const writes: string[] = [];
        const res = { cookie: (name: string) => writes.push(name) } as any;
        writeAuthCookie(res, authCookieName("access"), "a", 10);
        writeAuthCookie(res, authCookieName("refresh"), "r", 10);
        writeAuthCookie(res, authCookieName("device"), "d");
        writeAuthCookie(res, authCookieName("access", true), "a");
        writeAuthCookie(res, authCookieName("refresh", true), "r");
        expect(writes).toEqual(["access_client", "refresh_client", "device_client", "access_admin", "refresh_admin"]);

        const both = {
            headers: { cookie: "access_admin=a; access_client=c" },
        } as any;
        expect(resolveAuthContext(both)).toBeUndefined();
        const chosen = {
            headers: { cookie: "access_admin=a; access_client=c", "x-auth-context": "admin" },
        } as any;
        expect(resolveAuthContext(chosen)).toBe("admin");
    });
});

describe("openapi", () => {
    it("publishes the v1 document for swagger and redoc", () => {
        delete process.env.API_VERSION;
        expect(apiPrefix()).toBe("/api/v1");
        const doc = openApiDocument() as { openapi: string; paths: Record<string, unknown> };
        expect(doc.openapi).toBe("3.0.3");
        expect(doc.paths["/auth/token"]).toBeDefined();
        expect(doc.paths["/auth/refresh"]).toBeDefined();
        expect(swaggerHtml()).toContain("swagger-ui-bundle.js");
        expect(redocHtml()).toContain("redoc.standalone.js");
    });
});
