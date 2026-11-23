import { PersonsController } from "./persons.controller";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("PersonsController", () => {
    const management = {
        getList: jest.fn().mockResolvedValue({ rows: [{ id: "1" }], count: 1 }),
        get: jest.fn().mockResolvedValue({ id: "1" }),
        add: jest.fn().mockResolvedValue({ id: "1" }),
        edit: jest.fn().mockResolvedValue({ id: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        getPersonByNickname: jest.fn().mockResolvedValue({ id: "1" }),
        getPersonByEmail: jest.fn().mockResolvedValue({ id: "1" }),
    };
    const handler = { handle: jest.fn() };
    const controller = new PersonsController(management as any, handler as any);
    const query = { page: 2, limit: 10, offset: 10, filters: {} };

    beforeEach(() => jest.clearAllMocks());

    it("returns a page and each person lookup", async () => {
        const list = mockRes();
        await controller.getList({ queryParams: query } as any, list);
        expect(list.json).toHaveBeenCalledWith({ items: [{ id: "1" }], total: 1, page: 2, page_size: 10 });

        await controller.get({ params: { id: "1" } } as any, mockRes());
        await controller.add({ body: { firstName: "Ana" } } as any, mockRes());
        await controller.edit({ params: { id: "1" }, body: { firstName: "Ana" } } as any, mockRes());
        await controller.delete({ params: { id: "1" } } as any, mockRes());
        await controller.getPersonByNickname({ params: { nickname: "ana" } } as any, mockRes());
        await controller.getPersonByEmail({ params: { email: "a@b.co" } } as any, mockRes());
        expect(management.getPersonByEmail).toHaveBeenCalledWith("a@b.co");
        expect(management.edit).toHaveBeenCalledWith("1", { firstName: "Ana" });
    });

    it("sends a failure to the error handler", async () => {
        management.get.mockRejectedValue(new Error("missing"));
        const res = mockRes();
        await controller.get({ params: { id: "1" } } as any, res);
        expect(handler.handle).toHaveBeenCalled();
    });
});
