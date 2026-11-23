import { ServiceManagement } from "./service-management";

describe("ServiceManagement", () => {
    const repository = {
        getList: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const services = new ServiceManagement(repository as any);

    it("delegates every operation and rethrows repository errors", async () => {
        const query = { page: 1, limit: 20, offset: 0, filters: {} };
        await services.getList(query);
        await services.get("1");
        await services.add({ name: "List", code: "0201" } as any);
        await services.edit("1", { name: "List" } as any);
        await services.delete("1");
        expect(repository.getList).toHaveBeenCalledWith(query);

        repository.add.mockRejectedValue(new Error("dup"));
        await expect(services.add({} as any)).rejects.toThrow("dup");
    });
});