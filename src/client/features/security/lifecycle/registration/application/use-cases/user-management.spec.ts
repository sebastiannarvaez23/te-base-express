process.env.SECRET_KEY = process.env.SECRET_KEY || "unit-test-key";

import { EncryptionUtil } from "../../../../../../../core/utils/encryption.util";
import { HttpError } from "../../../../../../../core/utils/error.util";
import { UserManagement } from "./user-management";

describe("UserManagement", () => {
    const repository = {
        add: jest.fn(),
        edit: jest.fn(),
        getUserPasswordByNickname: jest.fn(),
        getByNickname: jest.fn(),
    };
    const users = new UserManagement(repository as any, new EncryptionUtil());

    beforeEach(() => {
        jest.clearAllMocks();
        repository.add.mockImplementation(async (user) => user);
    });

    it("stores a bcrypt hash and edits without hashing again", async () => {
        const created = await users.add({ nickname: "admin", password: "secret" } as any);
        expect(created?.password?.startsWith("$2")).toBe(true);
        expect(created?.password).not.toBe("secret");

        repository.edit.mockResolvedValue({ id: "1" });
        await expect(users.edit("1", { nickname: "admin" } as any)).resolves.toEqual({ id: "1" });
        expect(repository.edit).toHaveBeenCalledWith("1", { nickname: "admin" });
    });

    it("accepts a bcrypt password and a legacy cipher, and rejects an unknown account", async () => {
        const stored = (await users.add({ nickname: "admin", password: "secret" } as any))!.password!;
        repository.getUserPasswordByNickname.mockResolvedValue({ password: stored });
        await expect(users.validateCredential({ nickname: "admin", password: "secret" })).resolves.toBe(true);
        await expect(users.validateCredential({ nickname: "admin", password: "nope" })).resolves.toBe(false);

        const legacy = new EncryptionUtil().encrypt("admin");
        repository.getUserPasswordByNickname.mockResolvedValue({ password: legacy });
        await expect(users.validateCredential({ nickname: "admin", password: "admin" })).resolves.toBe(true);

        repository.getUserPasswordByNickname.mockResolvedValue(null);
        await expect(users.validateCredential({ nickname: "missing", password: "secret" })).rejects.toBeInstanceOf(HttpError);
    });

    it("propagates a repository failure", async () => {
        repository.edit.mockRejectedValue(new Error("db"));
        await expect(users.edit("1", {} as any)).rejects.toThrow("db");
    });
});
