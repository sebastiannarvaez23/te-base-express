jest.mock("../client/features/logging/system/audit/infrastructure/models/audit-event.model", () => ({
    AuditEventModel: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
}));

import { AuditEventModel } from "../client/features/logging/system/audit/infrastructure/models/audit-event.model";
import { withStateChange } from "./state-change";

const events = AuditEventModel as any;

describe("withStateChange", () => {
    beforeEach(() => jest.clearAllMocks());

    it("commits the change and a trace that has no secret", async () => {
        const host = {
            transaction: async <T>(work: (tx: any) => Promise<T>) => work("tx"),
        };
        const result = await withStateChange(host, async () => "saved", {
            entity: "User",
            entityId: "11111111-1111-4111-8111-111111111111",
            action: "PASSWORD_RESET",
            actorId: "11111111-1111-4111-8111-111111111111",
        });
        expect(result).toBe("saved");
        const row = events.create.mock.calls[0][0];
        expect(row).toEqual({
            entity: "User",
            entityId: "11111111-1111-4111-8111-111111111111",
            action: "PASSWORD_RESET",
            actorId: "11111111-1111-4111-8111-111111111111",
        });
        expect(Object.keys(row)).toEqual(["entity", "entityId", "action", "actorId"]);
        expect(events.create.mock.calls[0][1]).toEqual({ transaction: "tx" });
    });

    it("does not write the trace when the change fails", async () => {
        const host = {
            transaction: async <T>(work: (tx: any) => Promise<T>) => work("tx"),
        };
        await expect(withStateChange(host, async () => {
            throw new Error("db");
        }, { entity: "Role", entityId: "11111111-1111-4111-8111-111111111111", action: "GRANT_SERVICES" })).rejects.toThrow("db");
        expect(events.create).not.toHaveBeenCalled();
    });
});
