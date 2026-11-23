import { ServicesController } from "./service.controller";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("ServicesController", () => {
    const management = {
        getList: jest.fn().mockResolvedValue({ rows: [{ code: "0201" }], count: 1 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const handler = { handle: jest.fn() };
    const controller = new ServicesController(management as any, handler as any);

    it("pages the catalog and writes a service", async () => {
        const query = { page: 1, limit: 20, offset: 0, filters: {} };
        const list = mockRes();
        await controller.getList({ queryParams: query } as any, list);
        expect(list.json.mock.calls[0][0]).toMatchObject({ total: 1, page_size: 20 });

        await controller.get({ params: { id: "1" } } as any, mockRes());
        await controller.add({ body: { code: "0201" } } as any, mockRes());
        await controller.edit({ params: { id: "1" }, body: { name: "List" } } as any, mockRes());
        await controller.delete({ params: { id: "1" } } as any, mockRes());
        expect(management.edit).toHaveBeenCalledWith("1", { name: "List" });

        management.get.mockRejectedValue(new Error("missing"));
        await controller.get({ params: { id: "1" } } as any, mockRes());
        expect(handler.handle).toHaveBeenCalled();
    });
});