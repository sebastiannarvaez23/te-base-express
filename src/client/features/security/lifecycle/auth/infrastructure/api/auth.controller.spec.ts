import { HttpError } from "../../../../../../../core/utils/error.util";
import { AuthController } from "./auth.controller";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("AuthController", () => {
    const management = {
        authentication: jest.fn(),
        logout: jest.fn(),
        requestPasswordReset: jest.fn(),
        passwordReset: jest.fn(),
        generateOAuth2Token: jest.fn(),
        addMicroservice: jest.fn(),
    };
    const authMiddleware = {
        getValidateAuth: jest.fn(),
    };
    const handler = { handle: jest.fn() };
    const controller = new AuthController(management as any, authMiddleware as any, handler as any);

    beforeEach(() => jest.clearAllMocks());

    it("validates the login body before issuing a token", async () => {
        authMiddleware.getValidateAuth.mockReturnValue((_req: any, _res: any, next: any) => next());
        management.authentication.mockResolvedValue({ accessToken: "signed", refreshToken: "refresh", persistent: true, sid: "abc" });
        const res = mockRes();
        await controller.authentication({ body: { nickname: "admin", password: "secret" } } as any, res);
        await new Promise((resolve) => setImmediate(resolve));
        expect(res.json).toHaveBeenCalledWith({ token: "signed" });

        management.authentication.mockRejectedValue(new HttpError("AUTH_001"));
        await controller.authentication({ body: {} } as any, mockRes());
        await new Promise((resolve) => setImmediate(resolve));
        expect(handler.handle).toHaveBeenCalled();
    });

    it("covers logout, reset, oauth, and microservice registration", async () => {
        management.logout.mockResolvedValue(true);
        const logout = mockRes();
        await controller.logout({ headers: { authorization: "Bearer t" }, body: { nickname: "admin" } } as any, logout);
        expect(logout.json).toHaveBeenCalledWith({ message: "Logout successful" });

        management.logout.mockRejectedValue(new HttpError("AUTH_005"));
        await controller.logout({ headers: {}, body: {} } as any, mockRes());
        expect(handler.handle).toHaveBeenCalled();

        management.requestPasswordReset.mockResolvedValue({ message: "sent" });
        await controller.requestPasswordReset({ body: { email: "a@b.co" } } as any, mockRes());
        expect(management.requestPasswordReset).toHaveBeenCalledWith("a@b.co");

        management.passwordReset.mockResolvedValue({ message: "ok" });
        await controller.passwordReset({ params: { token: "abc" }, body: { newPassword: "secret" } } as any, mockRes());
        expect(management.passwordReset).toHaveBeenCalledWith("abc", "secret");

        const missing = mockRes();
        await controller.generateOAuth2Token({ body: {} } as any, missing);
        expect(handler.handle.mock.calls.at(-1)[0].internalCode).toBe("VAL_001");

        management.generateOAuth2Token.mockResolvedValue("oauth");
        const oauth = mockRes();
        await controller.generateOAuth2Token({ body: { client_id: "billing", client_secret: "secret" } } as any, oauth);
        expect(oauth.json).toHaveBeenCalledWith({ token: "oauth" });

        management.addMicroservice.mockResolvedValue({ name: "billing" });
        await controller.registerMicroservice({ body: { client_id: "billing" } } as any, mockRes());
        expect(management.addMicroservice).toHaveBeenCalled();

        management.requestPasswordReset.mockRejectedValue(new Error("smtp"));
        await controller.requestPasswordReset({ body: {} } as any, mockRes());
        management.passwordReset.mockRejectedValue(new Error("db"));
        await controller.passwordReset({ params: {}, body: {} } as any, mockRes());
        management.generateOAuth2Token.mockRejectedValue(new Error("db"));
        await controller.generateOAuth2Token({ body: { client_id: "a", client_secret: "b" } } as any, mockRes());
        management.addMicroservice.mockRejectedValue(new Error("db"));
        await controller.registerMicroservice({ body: {} } as any, mockRes());
        expect(handler.handle).toHaveBeenCalled();
    });
});
