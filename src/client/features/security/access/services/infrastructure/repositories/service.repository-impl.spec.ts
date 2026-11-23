jest.mock("../models/service.model", () => ({
    ServiceModel: {
        findAndCountAll: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
}));

import { UniqueConstraintError } from "sequelize";

import { ServiceModel } from "../models/service.model";
import { ServicesRepositoryImpl } from "./service.repository-impl";

const services = ServiceModel as any;

describe("ServicesRepositoryImpl", () => {
    const repository = new ServicesRepositoryImpl();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("lists, loads, writes, and deletes a service", async () => {
        services.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
        await repository.getList({ page: 1, limit: 5, offset: 5, filters: { code: "0201" } } as any);
        expect(services.findAndCountAll.mock.calls[0][0]).toMatchObject({ limit: 5, offset: 5 });

        services.findOne.mockResolvedValue(null);
        await expect(repository.get("missing")).rejects.toMatchObject({ internalCode: "SVC_001" });

        services.create.mockResolvedValue({ id: "1" });
        await expect(repository.add({ code: "0201" } as any)).resolves.toEqual({ id: "1" });
        const unique = new UniqueConstraintError({ errors: [] });
        services.create.mockRejectedValue(unique);
        await expect(repository.add({} as any)).rejects.toBe(unique);
        services.create.mockRejectedValue(new Error("db"));
        await expect(repository.add({} as any)).rejects.toMatchObject({ internalCode: "SRV_001" });

        services.update.mockResolvedValue([0, []]);
        await expect(repository.edit("1", {} as any)).rejects.toMatchObject({ internalCode: "SVC_001" });
        services.update.mockResolvedValue([1, [{ id: "1" }]]);
        await expect(repository.edit("1", {} as any)).resolves.toEqual({ id: "1" });

        const row = { destroy: jest.fn() };
        services.findOne.mockResolvedValue(row);
        await expect(repository.delete("1")).resolves.toBe(row);
        services.findOne.mockResolvedValue(null);
        await expect(repository.delete("missing")).rejects.toMatchObject({ internalCode: "SVC_001" });

        services.findAndCountAll.mockRejectedValue(new Error("db"));
        await expect(repository.getList({ limit: 1, offset: 0, filters: {} } as any)).rejects.toThrow("db");
    });
});
