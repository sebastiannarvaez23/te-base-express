import { RoleManagement } from "./role-management";

describe("RoleManagement", () => {
    const repository = {
        getList: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        addServiceAssignment: jest.fn().mockResolvedValue({ id: "1" }),
        deleteServiceAssignment: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const roles = new RoleManagement(repository as any);

    it("passes the service id list through to the repository", async () => {
        await roles.getList({ page: 1, limit: 20, offset: 0, filters: {} });
        await roles.get("1");
        await roles.add({ name: "Admin" } as any);
        await roles.edit("1", { name: "Admin" } as any);
        await roles.delete("1");
        await roles.addServiceAssignment("1", { services: ["s1"] });
        await roles.deleteServiceAssignment("1", { services: ["s1"] });
        expect(repository.addServiceAssignment).toHaveBeenCalledWith("1", ["s1"]);
        expect(repository.deleteServiceAssignment).toHaveBeenCalledWith("1", ["s1"]);

        repository.delete.mockRejectedValue(new Error("missing"));
        await expect(roles.delete("1")).rejects.toThrow("missing");
    });
});
