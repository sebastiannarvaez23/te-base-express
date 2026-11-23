import { RolesController } from "./roles.controller";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("RolesController", () => {
    const management = {
        getList: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        addServiceAssignment: jest.fn().mockResolvedValue({ id: "1" }),
        deleteServiceAssignment: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const handler = { handle: jest.fn() };
    const controller = new RolesController(management as any, handler as any);

    it("pages the list and forwards service assignments", async () => {
        const query = { page: 1, limit: 20, offset: 0, filters: {} };
        const list = mockRes();
        await controller.getList({ queryParams: query } as any, list);
        expect(list.json).toHaveBeenCalledWith({ items: [], total: 0, page: 1, page_size: 20 });

        await controller.get({ params: { id: "1" } } as any, mockRes());
        await controller.add({ body: { name: "Admin" } } as any, mockRes());
        await controller.edit({ params: { id: "1" }, body: { name: "Admin" } } as any, mockRes());
        await controller.delete({ params: { id: "1" } } as any, mockRes());
        await controller.addServiceAssignment({ params: { id: "1" }, body: { services: ["s1"] } } as any, mockRes());
        await controller.deleteServiceAssignment({ params: { id: "1" }, body: { services: ["s1"] } } as any, mockRes());
        expect(management.addServiceAssignment).toHaveBeenCalledWith("1", { services: ["s1"] });

        management.delete.mockRejectedValue(new Error("missing"));
        await controller.delete({ params: { id: "1" } } as any, mockRes());
        expect(handler.handle).toHaveBeenCalled();
    });
});
