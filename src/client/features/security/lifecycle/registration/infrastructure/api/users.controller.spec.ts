import { HttpError } from "../../../../../../../core/utils/error.util";
import { ErrorHandlerUtil } from "../../../../../../../core/utils/error-handler.util";
import { UsersController } from "./users.controller";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("UsersController", () => {
    const management = {
        add: jest.fn(),
        edit: jest.fn(),
        validateCredential: jest.fn(),
    };
    const handler = { handle: jest.fn() };
    const controller = new UsersController(management as any, handler as unknown as ErrorHandlerUtil);

    beforeEach(() => jest.clearAllMocks());

    it("returns the created user, the edit, and the credential check", async () => {
        const res = mockRes();
        management.add.mockResolvedValue({ id: "1" });
        await controller.add({ body: { nickname: "admin" } } as any, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ id: "1" });

        management.edit.mockResolvedValue({ id: "1" });
        await controller.edit({ params: { id: "1" }, body: { nickname: "admin" } } as any, mockRes());
        expect(management.edit).toHaveBeenCalledWith("1", { nickname: "admin" });

        management.validateCredential.mockResolvedValue(true);
        const check = mockRes();
        await controller.validateCredential({ body: { nickname: "admin" } } as any, check);
        expect(check.json).toHaveBeenCalledWith({ validate: true });
    });

    it("sends a use-case error to the handler", async () => {
        const res = mockRes();
        const error = new HttpError("USER_001");
        management.add.mockRejectedValue(error);
        await controller.add({ body: {} } as any, res);
        expect(handler.handle).toHaveBeenCalledWith(error, expect.anything(), res);
    });
});
