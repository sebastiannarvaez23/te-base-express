process.env.SECRET_KEY = process.env.SECRET_KEY || "unit-test-key";
process.env.SESION_SG_EXP = "3600";

import { hashPassword } from "../../../../../../core/passwords";
import { EncryptionUtil } from "../../../../../../core/utils/encryption.util";
import { KeyValueStore } from "../../../../../../core/http/client-session";
import { AuthenticateAdminUseCase, LogoutAdminUseCase, RefreshAdminSessionUseCase } from "./authenticate-admin.use-case";

function memory(): KeyValueStore & { keys: () => string[] } {
    const data = new Map<string, string>();
    return {
        setRaw: async (key, value) => { data.set(key, value); },
        getRaw: async (key) => data.get(key) ?? null,
        deleteRaw: async (key) => { data.delete(key); },
        keys: () => [...data.keys()],
    };
}

describe("AuthenticateAdminUseCase", () => {
    const encryption = new EncryptionUtil();

    it("issues an admin session and rejects a product-shaped failure", async () => {
        const store = memory();
        const admins = {
            findByUsername: jest.fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: "a1", username: "root", password: "x", active: false })
                .mockResolvedValue({ id: "a1", username: "root", password: await hashPassword("secret"), active: true }),
        };
        const login = new AuthenticateAdminUseCase(admins, store, process.env.SECRET_KEY!, 3600, encryption);

        await expect(login.execute({ username: "root", password: "secret" })).rejects.toMatchObject({ internalCode: "AUTH_001" });
        await expect(login.execute({ username: "root", password: "secret" })).rejects.toMatchObject({ internalCode: "AUTH_003" });

        const session = await login.execute({ username: "root", password: "secret", remember_me: true });
        const claims = JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString());
        expect(claims.user_type).toBe("admin");
        expect(claims.user_id).toBe("a1");
        expect(store.keys().some((key) => key.startsWith("rt:admin:"))).toBe(true);

        const refreshed = await new RefreshAdminSessionUseCase(store, process.env.SECRET_KEY!, 3600).execute(session.refreshToken);
        expect(refreshed.refreshToken).not.toBe(session.refreshToken);
        await new LogoutAdminUseCase(store).execute({ userId: "a1", sid: refreshed.sid });
        expect(store.keys().some((key) => key.includes(refreshed.sid))).toBe(false);
    });
});