process.env.SECRET_KEY = process.env.SECRET_KEY || "unit-test-key";
process.env.SESION_SG_EXP = "3600";

jest.mock("../../../../../../../config/redis", () => ({ RedisConfig: class RedisConfig { } }));
jest.mock("../../../../../../../core/utils/mailer.util", () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../../../../../core/utils/token-generator.util", () => ({
    generateResetToken: jest.fn(() => "reset-token"),
}));
jest.mock("../../dependencies", () => ({
    tokenManager: {
        setToken: jest.fn(),
        generateToken: jest.fn().mockResolvedValue("signed-token"),
        revokeToken: jest.fn().mockResolvedValue(undefined),
    },
    oAuth2TokenManager: {
        generateToken: jest.fn().mockResolvedValue("oauth-token"),
    },
}));

import { sendPasswordResetEmail } from "../../../../../../../core/utils/mailer.util";
import { EncryptionUtil } from "../../../../../../../core/utils/encryption.util";
import { hashPassword } from "../../../../../../../core/passwords";
import { tokenManager, oAuth2TokenManager } from "../../dependencies";
import { AuthManagement } from "./auth-management";

describe("AuthManagement", () => {
    const redis = {
        getTokenFromRedis: jest.fn(),
        storeTokenInRedis: jest.fn(),
        storeResetPassToken: jest.fn(),
        getResetPassTokenFromRedis: jest.fn(),
        deleteResetPassToken: jest.fn(),
        setRaw: jest.fn().mockResolvedValue(undefined),
        getRaw: jest.fn().mockResolvedValue(null),
        deleteRaw: jest.fn().mockResolvedValue(undefined),
    };
    const users = {
        validateCredential: jest.fn(),
        edit: jest.fn(),
        replacePassword: jest.fn(),
    };
    const persons = {
        getPersonByNickname: jest.fn(),
        getPersonByEmail: jest.fn(),
    };
    const roles = { get: jest.fn() };
    const clients = {
        findByClientName: jest.fn(),
        addMicroservice: jest.fn(),
    };
    const auth = new AuthManagement(
        new EncryptionUtil(),
        redis as any,
        clients as any,
        users as any,
        persons as any,
        roles as any,
    );

    beforeEach(() => jest.clearAllMocks());

    it("reuses a live session and issues a new token with the role services", async () => {
        users.validateCredential.mockResolvedValue(false);
        await expect(auth.authentication({ nickname: "admin", password: "nope" } as any)).rejects.toMatchObject({ internalCode: "AUTH_001" });

        users.validateCredential.mockResolvedValue(true);
        persons.getPersonByNickname.mockResolvedValue(null);
        await expect(auth.authentication({ nickname: "admin", password: "secret" } as any)).rejects.toMatchObject({ internalCode: "USER_001" });

        persons.getPersonByNickname.mockResolvedValue({
            roleId: "role-1",
            user: { id: "user-1", nickname: "admin" },
        });
        roles.get.mockResolvedValue(null);
        await expect(auth.authentication({ nickname: "admin", password: "secret" } as any)).rejects.toMatchObject({ internalCode: "ROLE_001" });

        roles.get.mockResolvedValue({ name: "Admin", services: [{ code: "0201" }] });
        const session = await auth.authentication({ nickname: "admin", password: "secret", remember_me: true } as any);
        const claims = JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString());
        expect(claims).toMatchObject({
            user_id: "user-1",
            user_type: "client",
            schema_name: "public",
            access_mode: "full",
            username: "admin",
            services: ["0201"],
        });
        expect(claims.sid).toBeTruthy();
        expect(session.refreshToken).not.toBe(session.accessToken);
        expect(redis.setRaw).toHaveBeenCalled();
        expect(tokenManager.generateToken).not.toHaveBeenCalled();
    });

    it("revokes the session only when the bearer token is present", async () => {
        await expect(auth.logout(undefined, "admin")).rejects.toMatchObject({ internalCode: "AUTH_005" });
        await expect(auth.logout("Bearer", "admin")).rejects.toMatchObject({ internalCode: "AUTH_005" });
        await expect(auth.logout("Bearer signed-token", "admin")).resolves.toBe(true);
        expect(tokenManager.revokeToken).toHaveBeenCalledWith("admin");
    });

    it("stores the account nickname in the reset token and hashes the new password", async () => {
        persons.getPersonByEmail.mockResolvedValue(null);
        await expect(auth.requestPasswordReset("missing@example.com")).rejects.toMatchObject({ internalCode: "USER_001" });

        persons.getPersonByEmail.mockResolvedValue({ email: "ana@example.com", user: { nickname: "ana" } });
        await expect(auth.requestPasswordReset("ana@example.com")).resolves.toMatchObject({ message: expect.any(String) });
        expect(redis.storeResetPassToken).toHaveBeenCalledWith("reset-token", "ana");
        expect(sendPasswordResetEmail).toHaveBeenCalledWith("ana@example.com", "reset-token");

        redis.getResetPassTokenFromRedis.mockResolvedValue(null);
        await expect(auth.passwordReset("reset-token", "new-secret")).rejects.toMatchObject({ internalCode: "AUTH_021" });

        redis.getResetPassTokenFromRedis.mockResolvedValue("ana");
        persons.getPersonByNickname.mockResolvedValue(null);
        await expect(auth.passwordReset("reset-token", "new-secret")).rejects.toMatchObject({ internalCode: "USER_001" });

        const person = { user: { id: "user-1", nickname: "ana", password: "old" } };
        persons.getPersonByNickname.mockResolvedValue(person);
        await auth.passwordReset("reset-token", "new-secret");
        expect(users.replacePassword).toHaveBeenCalledWith("user-1", expect.any(String), "user-1");
        expect(users.replacePassword.mock.calls[0][1].startsWith("$2")).toBe(true);
        expect(person.user.password).toBe("old");
        expect(redis.deleteResetPassToken).toHaveBeenCalledWith("reset-token");
    });

    it("checks the client secret and hashes a new microservice secret", async () => {
        clients.findByClientName.mockResolvedValue(null);
        await expect(auth.generateOAuth2Token("billing", "secret")).rejects.toMatchObject({ internalCode: "AUTH_008" });

        clients.findByClientName.mockResolvedValue({ name: "billing", secret: await hashPassword("secret") });
        await expect(auth.generateOAuth2Token("billing", "nope")).rejects.toMatchObject({ internalCode: "AUTH_008" });
        await expect(auth.generateOAuth2Token("billing", "secret")).resolves.toBe("oauth-token");
        expect(oAuth2TokenManager.generateToken).toHaveBeenCalledWith({ sub: "billing" }, process.env.SECRET_KEY, 3600);

        const legacy = new EncryptionUtil().encrypt("legacy-secret");
        clients.findByClientName.mockResolvedValue({ name: "billing", secret: legacy });
        await expect(auth.generateOAuth2Token("billing", "legacy-secret")).resolves.toBe("oauth-token");

        clients.addMicroservice.mockImplementation(async (row) => row);
        const created = await auth.addMicroservice({ client_id: "billing", client_secret: "secret" });
        expect(created?.secret?.startsWith("$2")).toBe(true);
        expect(created!.name).toBe("billing");
    });
});
