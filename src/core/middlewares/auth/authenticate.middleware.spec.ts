import jwt from "jsonwebtoken";

import { AuthValidator } from "../validators/auth.validator";
import { HttpError } from "../../utils/error.util";
import { AuthMiddleware } from "./authenticate.middleware";

describe("AuthMiddleware", () => {
    process.env.SECRET_KEY = "unit-secret";
    const tokens = { verifyToken: jest.fn() };
    const middleware = new AuthMiddleware(new AuthValidator(), tokens as any);

    function mockRes() {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    }

    beforeEach(() => {
        process.env.SECRET_KEY = "unit-secret";
        jest.clearAllMocks();
    });

    it("requires a bearer token and attaches the verified payload", async () => {
        const missing = jest.fn();
        await middleware.authenticateToken({ headers: {} } as any, mockRes(), missing);
        expect(missing.mock.calls[0][0].internalCode).toBe("AUTH_005");

        const empty = jest.fn();
        await middleware.authenticateToken({ headers: { authorization: "Bearer" } } as any, mockRes(), empty);
        expect(empty.mock.calls[0][0].internalCode).toBe("AUTH_005");

        tokens.verifyToken.mockResolvedValue({ sub: "admin" });
        const req: any = { headers: { authorization: "Bearer signed" } };
        const next = jest.fn();
        await middleware.authenticateToken(req, mockRes(), next);
        expect(req.user).toEqual({ sub: "admin" });
        expect(tokens.verifyToken).toHaveBeenCalledWith("signed", "unit-secret");
        expect(next).toHaveBeenCalledWith();
    });

    it("forwards catalog errors and hides anything else", async () => {
        const http = jest.fn();
        tokens.verifyToken.mockRejectedValue(new HttpError("AUTH_004"));
        await middleware.authenticateToken({ headers: { authorization: "Bearer signed" } } as any, mockRes(), http);
        expect(http.mock.calls[0][0].internalCode).toBe("AUTH_004");

        const invalid = jest.fn();
        tokens.verifyToken.mockRejectedValue(new jwt.JsonWebTokenError("bad"));
        await middleware.authenticateToken({ headers: { authorization: "Bearer signed" } } as any, mockRes(), invalid);
        expect(invalid.mock.calls[0][0].internalCode).toBe("AUTH_004");

        const other = jest.fn();
        tokens.verifyToken.mockRejectedValue(new Error("down"));
        await middleware.authenticateToken({ headers: { authorization: "Bearer signed" } } as any, mockRes(), other);
        expect(other.mock.calls[0][0].internalCode).toBe("SRV_001");
    });

    it("keeps a platform admin out of the product and a product user out of the admin", async () => {
        const store = { getRaw: jest.fn().mockResolvedValue("{}"), setRaw: jest.fn(), deleteRaw: jest.fn() };
        const gate = new AuthMiddleware(new AuthValidator(), tokens as any, store as any);
        const admin = jwt.sign({ user_id: "admin-1", user_type: "admin", sid: "s1", username: "root" }, "unit-secret");
        const client = jwt.sign({ user_id: "user-1", user_type: "client", sid: "s2", username: "ada" }, "unit-secret");

        const product = jest.fn();
        await gate.authenticateToken({ headers: { authorization: `Bearer ${admin}` } } as any, mockRes(), product);
        expect(product.mock.calls[0][0].internalCode).toBe("AUTH_004");

        const platform = jest.fn();
        await gate.authenticateAdmin({ headers: { authorization: `Bearer ${client}` } } as any, mockRes(), platform);
        expect(platform.mock.calls[0][0].internalCode).toBe("AUTH_004");

        const legacy = jest.fn();
        await gate.authenticateAdmin({ headers: { authorization: "Bearer signed" } } as any, mockRes(), legacy);
        expect(legacy.mock.calls[0][0].internalCode).toBe("AUTH_004");
        expect(tokens.verifyToken).not.toHaveBeenCalled();

        const allowed = jest.fn();
        const req: any = { headers: { authorization: `Bearer ${admin}` } };
        await gate.authenticateAdmin(req, mockRes(), allowed);
        expect(req.user.user_type).toBe("admin");
        expect(allowed).toHaveBeenCalledWith();
    });

    it("rejects a login body before the controller runs", () => {
        const res = mockRes();
        const next = jest.fn();
        middleware.getValidateAuth()({ body: { nickname: "ad", password: "secret" } } as any, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });
});
