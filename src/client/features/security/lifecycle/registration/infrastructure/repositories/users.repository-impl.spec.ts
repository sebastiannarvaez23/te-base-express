jest.mock("../models/user.model", () => ({
    UserModel: {
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
}));

import { UniqueConstraintError } from "sequelize";

import { HttpError } from "../../../../../../../core/utils/error.util";
import { UserModel } from "../models/user.model";
import { UsersRepositoryImpl } from "./users.repository-impl";

const users = UserModel as any;

describe("UsersRepositoryImpl", () => {
    const repository = new UsersRepositoryImpl();

    beforeEach(() => jest.clearAllMocks());

    it("reads by nickname and excludes the password from the public lookup", async () => {
        users.findOne.mockResolvedValue({ id: "1" });
        await repository.getUserPasswordByNickname("admin");
        expect(users.findOne).toHaveBeenCalledWith({ where: { nickname: "admin" } });

        await repository.getByNickname("admin");
        expect(users.findOne.mock.calls[1][0].attributes).toEqual({ exclude: ["password"] });
    });

    it("creates and updates a user, and reports a missing update", async () => {
        users.create.mockResolvedValue({ id: "1" });
        await expect(repository.add({ nickname: "admin" } as any)).resolves.toEqual({ id: "1" });

        users.update.mockResolvedValue([1, [{ id: "1" }]]);
        await expect(repository.edit("1", { nickname: "admin" } as any)).resolves.toEqual({ id: "1" });

        users.update.mockResolvedValue([0, []]);
        await expect(repository.edit("1", {} as any)).rejects.toMatchObject({ internalCode: "USER_001" });
    });

    it("rethrows a unique violation and wraps any other read failure", async () => {
        const unique = new UniqueConstraintError({ errors: [] });
        users.create.mockRejectedValue(unique);
        await expect(repository.add({} as any)).rejects.toBe(unique);

        users.create.mockRejectedValue(new Error("db"));
        await expect(repository.add({} as any)).rejects.toBeInstanceOf(HttpError);

        users.findOne.mockRejectedValue(new Error("db"));
        await expect(repository.getUserPasswordByNickname("admin")).rejects.toMatchObject({ internalCode: "SRV_001" });
        await expect(repository.getByNickname("admin")).rejects.toMatchObject({ internalCode: "SRV_001" });
    });
});
