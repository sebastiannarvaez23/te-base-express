function remember(label: string) {
    return (req: any, _res: any, next: any) => {
        req.chain = [...(req.chain || []), label];
        next();
    };
}

function finish(route: string) {
    return (req: any, res: any) => {
        res.status(200).json({ route, chain: req.chain || [] });
    };
}

jest.mock("../../../app/composition/identity", () => ({
    authMiddleware: { authenticateToken: remember("auth") },
    authorizationMiddleware: { checkAccess: (code: string) => remember(code) },
    userMiddleware: {
        validateAdd: remember("user-add"),
        validateEdit: remember("user-edit"),
        validateCredentialBody: remember("user-credentials"),
    },
    userController: {
        add: finish("user-add"),
        edit: finish("user-edit"),
        validateCredential: finish("user-credentials"),
    },
    personMiddleware: { validateAdd: remember("person-add"), validateEdit: remember("person-edit") },
    personSerialzerMiddleware: { add: () => remember("person-created-by"), edit: () => remember("person-updated-by") },
    queryParamsMiddleware: { queryValidationMiddleware: () => remember("query") },
    personController: {
        getList: finish("person-list"),
        get: finish("person-get"),
        add: finish("person-add"),
        edit: finish("person-edit"),
        delete: finish("person-delete"),
        getPersonByNickname: finish("person-nickname"),
        getPersonByEmail: finish("person-email"),
    },
}));

jest.mock("../../../app/composition/access", () => ({
    authMiddleware: { authenticateToken: remember("auth") },
    authorizationMiddleware: { checkAccess: (code: string) => remember(code) },
    queryParamsMiddleware: { queryValidationMiddleware: () => remember("query") },
    roleMiddleware: {
        validateAdd: remember("role-add"),
        validateEdit: remember("role-edit"),
        validateRolAddorDeleteServiceAssignment: remember("role-services"),
    },
    roleSerialzerMiddleware: { add: () => remember("role-created-by"), edit: () => remember("role-updated-by") },
    roleController: {
        getList: finish("role-list"),
        get: finish("role-get"),
        add: finish("role-add"),
        edit: finish("role-edit"),
        delete: finish("role-delete"),
        addServiceAssignment: finish("role-assign"),
        deleteServiceAssignment: finish("role-unassign"),
    },
    serviceMiddleware: { validateAdd: remember("service-add"), validateEdit: remember("service-edit") },
    serviceSerialzerMiddleware: { add: () => remember("service-created-by"), edit: () => remember("service-updated-by") },
    serviceController: {
        getList: finish("service-list"),
        get: finish("service-get"),
        add: finish("service-add"),
        edit: finish("service-edit"),
        delete: finish("service-delete"),
    },
}));

jest.mock("./lifecycle/auth/dependencies", () => ({
    authController: {
        authentication: finish("token"),
        refresh: finish("refresh"),
        logout: finish("logout"),
        requestPasswordReset: finish("request-reset"),
        passwordReset: finish("reset"),
        generateOAuth2Token: finish("oauth"),
        registerMicroservice: finish("register"),
    },
}));

import express from "express";
import request from "supertest";

import authRoutes from "./lifecycle/auth/infrastructure/api/auth.routes";
import usersRoutes from "./lifecycle/registration/infrastructure/api/users.routes";
import personsRoutes from "./identity/profile/infrastructure/api/persons.routes";
import rolesRoutes from "./access/roles/infrastructure/api/roles.routes";
import servicesRoutes from "./access/services/infrastructure/api/service.routes";

function app() {
    const application = express();
    application.use(express.json());
    application.use("/auth", authRoutes);
    application.use("/user", usersRoutes);
    application.use("/person", personsRoutes);
    application.use("/role", rolesRoutes);
    application.use("/service", servicesRoutes);
    return application;
}

const ID = "11111111-1111-4111-8111-111111111111";
const RESET = "a".repeat(64);

describe("security routes", () => {
    const api = app();

    it("mounts auth and user routes", async () => {
        expect((await request(api).post("/auth/token")).body.route).toBe("token");
        expect((await request(api).post("/auth/refresh")).body.route).toBe("refresh");
        expect((await request(api).post("/auth/logout")).body.route).toBe("logout");
        expect((await request(api).post("/auth/request-password-reset").send({ email: "a@b.co" })).body.route).toBe("request-reset");
        expect((await request(api).post(`/auth/reset-password/${RESET}`).send({ newPassword: "secret" })).body.route).toBe("reset");
        expect((await request(api).post("/auth/token-oauth").send({ client_id: "billing", client_secret: "secret" })).body.route).toBe("oauth");
        expect((await request(api).post("/auth/register-microservice").send({ client_id: "billing", client_secret: "secret" })).body.route).toBe("register");
        expect((await request(api).post("/auth/reset-password/abc").send({ newPassword: "secret" })).status).toBe(400);

        expect((await request(api).post("/user")).body.chain).toEqual(["user-add"]);
        const edited = await request(api).put(`/user/${ID}`);
        expect(edited.body.chain).toEqual(["auth", "0204", "user-edit"]);
        expect((await request(api).post("/user/validate-credentials")).body.chain).toEqual(["user-credentials"]);
    });

    it("guards person routes with the seeded service codes", async () => {
        expect((await request(api).get("/person")).body.chain).toEqual(["auth", "0201", "query"]);
        expect((await request(api).get(`/person/${ID}`)).body.chain).toEqual(["auth", "0202"]);
        expect((await request(api).get("/person/not-a-uuid")).status).toBe(400);
        expect((await request(api).post("/person")).body.chain).toEqual(["auth", "0203", "person-add", "person-created-by"]);
        expect((await request(api).put(`/person/${ID}`)).body.chain).toEqual(["auth", "0204", "person-edit", "person-updated-by"]);
        expect((await request(api).delete(`/person/${ID}`)).body.chain).toEqual(["auth", "0205"]);
        expect((await request(api).get("/person/by-nickname/admin")).body.chain).toEqual(["auth", "0206"]);
        expect((await request(api).get("/person/by-email/a@b.co")).body.chain).toEqual(["auth", "0207"]);
    });

    it("guards role and service routes, including service detail 0402", async () => {
        expect((await request(api).get("/role")).body.chain).toEqual(["auth", "0301", "query"]);
        expect((await request(api).get(`/role/${ID}`)).body.chain).toEqual(["auth", "0302"]);
        expect((await request(api).post("/role")).body.chain).toEqual(["auth", "role-add", "0303", "role-created-by"]);
        expect((await request(api).put(`/role/${ID}`)).body.chain).toEqual(["auth", "0304", "role-edit", "role-updated-by"]);
        expect((await request(api).delete(`/role/${ID}`)).body.chain).toEqual(["auth", "0305"]);
        expect((await request(api).post(`/role/service-assignment/${ID}`)).body.chain).toEqual(["auth", "0306", "role-services"]);
        expect((await request(api).delete(`/role/service-assignment/${ID}`)).body.chain).toEqual(["auth", "0307", "role-services"]);

        expect((await request(api).get("/service")).body.chain).toEqual(["auth", "0401", "query"]);
        expect((await request(api).get(`/service/${ID}`)).body.chain).toEqual(["auth", "0402"]);
        expect((await request(api).post("/service")).body.chain).toEqual(["auth", "0403", "service-add", "service-created-by"]);
        expect((await request(api).put(`/service/${ID}`)).body.chain).toEqual(["auth", "0404", "service-edit", "service-updated-by"]);
        expect((await request(api).delete(`/service/${ID}`)).body.chain).toEqual(["auth", "0405"]);
    });
});
