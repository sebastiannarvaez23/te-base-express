jest.mock("../models/person.model", () => ({
    PersonModel: {
        findAndCountAll: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
}));
jest.mock("../../../../lifecycle/registration/infrastructure/models/user.model", () => ({
    UserModel: { findOne: jest.fn() },
}));

import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";

import { PersonModel } from "../models/person.model";
import { UserModel } from "../../../../lifecycle/registration/infrastructure/models/user.model";
import { PersonsRepositoryImpl } from "./persons.repository-impl";

const persons = PersonModel as any;
const users = UserModel as any;

describe("PersonsRepositoryImpl", () => {
    const repository = new PersonsRepositoryImpl();
    const query = { page: 1, limit: 20, offset: 0, filters: { email: "a@b.co" } };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        jest.spyOn(console, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("lists and loads a person, including the account when searching by nickname or email", async () => {
        persons.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
        await repository.getList(query as any);
        expect(persons.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: query.filters, limit: 20, offset: 0,
        }));

        persons.findOne.mockResolvedValue({ id: "1" });
        await expect(repository.get("1")).resolves.toEqual({ id: "1" });
        persons.findOne.mockResolvedValue(null);
        await expect(repository.get("missing")).rejects.toMatchObject({ internalCode: "PERS_001" });

        persons.findOne.mockResolvedValue({ id: "1" });
        await repository.getPersonByNickname("ana");
        expect(persons.findOne.mock.calls.at(-1)[0].include[0].where).toEqual({ nickname: "ana" });

        await repository.getPersonByEmail("ana@example.com");
        const emailQuery = persons.findOne.mock.calls.at(-1)[0];
        expect(emailQuery.where).toEqual({ email: "ana@example.com" });
        expect(emailQuery.include[0].where).toBeUndefined();
    });

    it("requires an existing user before creating a person", async () => {
        users.findOne.mockResolvedValue(null);
        await expect(repository.add({ userId: "missing" } as any)).rejects.toMatchObject({ internalCode: "USER_001" });

        users.findOne.mockResolvedValue({ id: "user-1" });
        persons.create.mockResolvedValue({ id: "1" });
        await expect(repository.add({ userId: "user-1" } as any)).resolves.toEqual({ id: "1" });
        expect(users.findOne).toHaveBeenCalledWith({ where: { id: "user-1", deletedAt: null } });
    });

    it("updates, deletes, and preserves constraint errors", async () => {
        persons.update.mockResolvedValue([1, [{ id: "1" }]]);
        await expect(repository.edit("1", {} as any)).resolves.toEqual({ id: "1" });
        persons.update.mockResolvedValue([0, []]);
        await expect(repository.edit("1", {} as any)).rejects.toMatchObject({ internalCode: "PERS_001" });

        const row = { destroy: jest.fn() };
        persons.findOne.mockResolvedValue(row);
        await expect(repository.delete("1")).resolves.toBe(row);
        persons.findOne.mockResolvedValue(null);
        await expect(repository.delete("missing")).rejects.toMatchObject({ internalCode: "PERS_001" });

        const unique = new UniqueConstraintError({ errors: [] });
        persons.findOne.mockRejectedValue(unique);
        await expect(repository.getPersonByEmail("a@b.co")).rejects.toBe(unique);
        await expect(repository.getPersonByNickname("ana")).rejects.toBe(unique);

        const fk = new ForeignKeyConstraintError({} as any);
        users.findOne.mockResolvedValue({ id: "user-1" });
        persons.create.mockRejectedValue(fk);
        await expect(repository.add({ userId: "user-1" } as any)).rejects.toBe(fk);

        persons.findAndCountAll.mockRejectedValue(new Error("db"));
        await expect(repository.getList(query as any)).rejects.toThrow("db");
        persons.findOne.mockRejectedValue(new Error("db"));
        await expect(repository.getPersonByEmail("a@b.co")).rejects.toMatchObject({ internalCode: "SRV_001" });
    });
});
