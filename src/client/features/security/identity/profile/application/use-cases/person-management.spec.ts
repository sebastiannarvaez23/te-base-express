import { PersonManagement } from "./person-management";

describe("PersonManagement", () => {
    const repository = {
        getList: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        getPersonByNickname: jest.fn().mockResolvedValue({ id: "1" }),
        getPersonByEmail: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const persons = new PersonManagement(repository as any);

    it("delegates every operation and rethrows repository errors", async () => {
        const query = { page: 1, limit: 20, offset: 0, filters: {} };
        await persons.getList(query);
        await persons.get("1");
        await persons.add({ firstName: "Ana" } as any);
        await persons.edit("1", { firstName: "Ana" } as any);
        await persons.delete("1");
        await persons.getPersonByNickname("ana");
        await persons.getPersonByEmail("ana@example.com");
        expect(repository.getList).toHaveBeenCalledWith(query);
        expect(repository.getPersonByEmail).toHaveBeenCalledWith("ana@example.com");

        repository.get.mockRejectedValue(new Error("missing"));
        await expect(persons.get("1")).rejects.toThrow("missing");
    });
});
