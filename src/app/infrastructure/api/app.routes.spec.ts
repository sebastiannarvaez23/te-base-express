jest.mock("./api-gateway.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});
jest.mock("../../../client/features/security/lifecycle/auth/infrastructure/api/auth.routes", () => {
    const express = require("express");
    const router = express.Router();
    router.get("/ok", (_req: any, res: any) => res.status(200).json({ hello: "world" }));
    router.get("/wrapped", (_req: any, res: any) => res.status(201).json({ data: { id: 1 } }));
    router.get("/bad", (_req: any, res: any) => res.status(400).json({ errors: { field: "nickname", code: "VAL_001", detail: "Invalid" } }));
    router.get("/explode", (_req: any, _res: any, next: any) => {
        next(Object.assign(new Error("boom"), { statusCode: 409, internalCode: "VAL_002" }));
    });
    return { __esModule: true, default: router };
});
jest.mock("../../../client/features/security/lifecycle/registration/infrastructure/api/users.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});
jest.mock("../../../client/features/security/identity/profile/infrastructure/api/persons.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});
jest.mock("../../../client/features/security/access/roles/infrastructure/api/roles.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});
jest.mock("../../../platform/features/security/lifecycle/admins/presentation/admin-auth.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});
jest.mock("../../../client/features/security/access/services/infrastructure/api/service.routes", () => {
    const express = require("express");
    return { __esModule: true, default: express.Router() };
});

import express from "express";
import request from "supertest";

import { AppRoutes } from "./app.routes";

describe("AppRoutes", () => {
    beforeAll(() => {
        process.env.API_VERSION = "/api/v1";
        jest.spyOn(console, "info").mockImplementation(() => undefined);
    });

    afterAll(() => jest.restoreAllMocks());

    function application() {
        const app = express();
        new AppRoutes(app).init();
        return app;
    }

    it("wraps a success body and keeps an explicit data key", async () => {
        const ok = await request(application()).get("/api/v1/auth/ok").set("x-request-id", "req-1");
        expect(ok.headers["x-request-id"]).toBe("req-1");
        expect(ok.body).toMatchObject({ status_code: 200, message: "OK", data: { hello: "world" } });
        expect(ok.body.resolved_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

        const wrapped = await request(application()).get("/api/v1/auth/wrapped");
        expect(wrapped.body).toMatchObject({ status_code: 201, message: "OK", data: { id: 1 } });
    });

    it("wraps field errors and exceptions from the error middleware", async () => {
        const bad = await request(application()).get("/api/v1/auth/bad");
        expect(bad.body).toMatchObject({
            status_code: 400,
            message: "Error",
            errors: [{ field: "nickname", code: "VAL_001", detail: "Invalid" }],
        });

        const exploded = await request(application()).get("/api/v1/auth/explode");
        expect(exploded.status).toBe(409);
        expect(exploded.body.errors).toEqual([{ field: "", code: "VAL_002", detail: "boom" }]);
        expect(exploded.headers["x-request-id"]).toBeTruthy();
    });

    it("publishes OpenAPI outside the response envelope and echoes the auth context", async () => {
        const schema = await request(application()).get("/api/v1/schema/");
        expect(schema.body.openapi).toBe("3.0.3");
        expect(schema.body.status_code).toBeUndefined();
        const docs = await request(application()).get("/api/v1/docs/");
        expect(docs.text).toContain("swagger-ui");
        const redoc = await request(application()).get("/api/v1/redoc/");
        expect(redoc.text).toContain("redoc");
        const contextual = await request(application()).get("/api/v1/auth/ok").set("x-auth-context", "client");
        expect(contextual.headers["x-auth-context"]).toBe("client");
    });
});
