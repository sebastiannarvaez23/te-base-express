jest.mock("../models/role.model", () => ({
    RoleModel: {
        findAndCountAll: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        sequelize: { transaction: (work: (tx: unknown) => Promise<unknown>) => work("tx") },
    },
}));
jest.mock("../../../services/infrastructure/models/service.model", () => ({
    ServiceModel: { findAll: jest.fn() },
}));
jest.mock("../../../../../logging/system/audit/infrastructure/models/audit-event.model", () => ({
    AuditEventModel: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
}));

import { UniqueConstraintError } from "sequelize";

import { RoleModel } from "../models/role.model";
import { ServiceModel } from "../../../services/infrastructure/models/service.model";
import { RolesRepositoryImpl } from "./role.repository-impl";

const roles = RoleModel as any;
const services = ServiceModel as any;

describe("RolesRepositoryImpl", () => {
    const repository = new RolesRepositoryImpl();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("lists, loads with services, and writes a role", async () => {
        roles.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
        await repository.getList({ page: 1, limit: 10, offset: 0, filters: {} } as any);
        expect(roles.findAndCountAll.mock.calls[0][0].limit).toBe(10);

        roles.findOne.mockResolvedValue({ id: "1" });
        await repository.get("1");
        expect(roles.findOne.mock.calls[0][0].include[0].through).toEqual({ attributes: [] });
        roles.findOne.mockResolvedValue(null);
        await expect(repository.get("missing")).rejects.toMatchObject({ internalCode: "ROLE_001" });

        roles.create.mockResolvedValue({ id: "1" });
        await expect(repository.add({ name: "Admin" } as any)).resolves.toEqual({ id: "1" });
        const unique = new UniqueConstraintError({ errors: [] });
        roles.create.mockRejectedValue(unique);
        await expect(repository.add({} as any)).rejects.toBe(unique);
        roles.create.mockRejectedValue(new Error("db"));
        await expect(repository.add({} as any)).rejects.toMatchObject({ internalCode: "SRV_001" });

        roles.update.mockResolvedValue([0, []]);
        await expect(repository.edit("1", {} as any)).rejects.toMatchObject({ internalCode: "ROLE_001" });
    });

    it("assigns and removes services only when every id exists", async () => {
        const role = { id: "1", $add: jest.fn(), $remove: jest.fn() };
        roles.findOne.mockResolvedValue(null);
        await expect(repository.addServiceAssignment("1", ["s1"])).rejects.toMatchObject({ internalCode: "ROLE_001" });

        roles.findOne.mockResolvedValueOnce(role);
        services.findAll.mockResolvedValue([]);
        await expect(repository.addServiceAssignment("1", ["s1"])).rejects.toMatchObject({ internalCode: "SVC_001" });

        roles.findOne.mockResolvedValueOnce(role).mockResolvedValueOnce({ id: "1", services: [] });
        services.findAll.mockResolvedValue([{ id: "s1" }]);
        await expect(repository.addServiceAssignment("1", ["s1"])).resolves.toEqual({ id: "1", services: [] });
        expect(role.$add).toHaveBeenCalledWith("services", [{ id: "s1" }], { transaction: "tx" });

        roles.findOne.mockResolvedValueOnce(role).mockResolvedValueOnce(null);
        await expect(repository.deleteServiceAssignment("1", ["s1"])).rejects.toMatchObject({ internalCode: "ROLE_001" });
        expect(role.$remove).toHaveBeenCalled();

        const row = { destroy: jest.fn() };
        roles.findOne.mockResolvedValue(row);
        await expect(repository.delete("1")).resolves.toBe(row);
        roles.findOne.mockResolvedValue(null);
        await expect(repository.delete("missing")).rejects.toMatchObject({ internalCode: "ROLE_001" });

        roles.findAndCountAll.mockRejectedValue(new Error("db"));
        await expect(repository.getList({ limit: 1, offset: 0, filters: {} } as any)).rejects.toThrow("db");
    });
});
