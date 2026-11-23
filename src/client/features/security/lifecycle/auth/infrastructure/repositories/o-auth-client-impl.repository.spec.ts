jest.mock("../models/o-auth-client.model", () => ({
    OAuthClientModel: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

import { UniqueConstraintError } from "sequelize";

import { OAuthClientModel } from "../models/o-auth-client.model";
import { OAuthClientRepository } from "./o-auth-client-impl.repository";

const clients = OAuthClientModel as any;

describe("OAuthClientRepository", () => {
    const repository = new OAuthClientRepository();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("finds a client by name and preserves a duplicate name", async () => {
        clients.findOne.mockResolvedValue({ name: "billing" });
        await expect(repository.findByClientName("billing")).resolves.toEqual({ name: "billing" });
        expect(clients.findOne).toHaveBeenCalledWith({ where: { name: "billing" } });

        clients.findOne.mockRejectedValue(new Error("db"));
        await expect(repository.findByClientName("billing")).rejects.toMatchObject({ internalCode: "SRV_001" });

        clients.create.mockResolvedValue({ name: "billing" });
        await expect(repository.addMicroservice({ name: "billing", secret: "hash" })).resolves.toEqual({ name: "billing" });
        const unique = new UniqueConstraintError({ errors: [] });
        clients.create.mockRejectedValue(unique);
        await expect(repository.addMicroservice({ name: "billing", secret: "hash" })).rejects.toBe(unique);
        clients.create.mockRejectedValue(new Error("db"));
        await expect(repository.addMicroservice({ name: "billing", secret: "hash" })).rejects.toMatchObject({ internalCode: "SRV_001" });
    });
});