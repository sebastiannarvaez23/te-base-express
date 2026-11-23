import {
    isArray, isBoolean, isDate, isDecimal, isEmail, isFile, isNullable, isNumber, isNumericString,
    isObject, isRequired, isString, isUnique, isUUID, maxLength, minLength,
} from "./middlewares/validators/validation.type";
import { BaseValidator, validationDataFileMiddleware, validationDataMiddleware } from "./middlewares/validators/validation.middleware";
import { QueryParamsMiddleware } from "./middlewares/validators/validation-query-params.middleware";
import { declaredValueSchema, namedListSchema, personListSchema, roleListSchema, zodValidate } from "./contracts/input-schemas";
import { PersonListValidator } from "../client/features/security/identity/profile/application/validations/person-qlist.validator";
import { RolListValidator } from "../client/features/security/access/roles/application/validations/role-qlist.validator";
import { ServiceListValidator } from "../client/features/security/access/services/application/validations/service-qlist.validator";
import { UserValidator } from "../client/features/security/lifecycle/registration/application/validations/user.validator";
import { CredentialBodyValidator } from "../client/features/security/lifecycle/registration/application/validations/credential-body.validator";
import { PersonAddValidator } from "../client/features/security/identity/profile/application/validations/person-add.validator";
import { PersonEditValidator } from "../client/features/security/identity/profile/application/validations/person-edit.validator";
import { RoleAddValidator } from "../client/features/security/access/roles/application/validations/role-add.validator";
import { RoleEditValidator } from "../client/features/security/access/roles/application/validations/role-edit.validator";
import { RoleAddOrDeleteServiceAssignmentValidator } from "../client/features/security/access/roles/application/validations/role-service-assignment.validator";
import { ServiceAddValidator } from "../client/features/security/access/services/application/validations/service-add.validator";
import { ServiceEditValidator } from "../client/features/security/access/services/application/validations/service-edit.validator";
import { UserMiddleware } from "../client/features/security/lifecycle/registration/infrastructure/middlewares/user.middleware";
import { PersonMiddleware } from "../client/features/security/identity/profile/infrastructure/middlewares/person.middleware";
import { PersonSerialzerMiddleware } from "../client/features/security/identity/profile/infrastructure/middlewares/person-serializer.middleware";
import { RoleMiddleware } from "../client/features/security/access/roles/infrastructure/middlewares/role.middleware";
import { RoleSerializerMiddleware } from "../client/features/security/access/roles/infrastructure/middlewares/rol-serializer.middleware";
import { ServiceMiddleware } from "../client/features/security/access/services/infrastructure/middlewares/service.middleware";
import { ServiceSerialzerMiddleware } from "../client/features/security/access/services/infrastructure/middlewares/service-serializer.middleware";

const UUID = "11111111-1111-4111-8111-111111111111";

class NameValidator extends BaseValidator<{ name?: string }> {
    constructor() {
        super({ name: [isRequired, isString, minLength(3)] });
    }
}

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("field validators", () => {
    it("accepts and rejects each scalar rule", async () => {
        expect(isRequired("a")).toBe(true);
        expect(isRequired(undefined)).toBe("This field is required.");
        expect(isString("a")).toBe(true);
        expect(isString(1)).toBe("Must be a string.");
        expect(isNumber(1)).toBe(true);
        expect(isNumber("1")).toBe("Must be a number.");
        expect(minLength(2)("ab")).toBe(true);
        expect(minLength(2)("a")).toContain("at least 2");
        expect(maxLength(2)("ab")).toBe(true);
        expect(maxLength(2)("abc")).toContain("no more than 2");
        expect(isEmail("a@b.co")).toBe(true);
        expect(isEmail("nope")).toContain("email");
        expect(isDate("2020-01-01")).toBe(true);
        expect(isDate("not-a-date")).toContain("date");
        expect(isNumericString("10")).toBe(true);
        expect(isNumericString("10a")).toContain("numeric");
        expect(isUUID(UUID)).toBe(true);
        expect(isUUID("nope")).toContain("UUID");
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean("false")).toContain("boolean");
        expect(isNullable(null)).toBe(true);
        expect(isNullable("x")).toContain("cannot be null");
        expect(isFile({ buffer: Buffer.from("a"), originalname: "a.png" })).toBe(true);
        expect(isFile({})).toContain("file");
        expect(isArray(isUUID, false)([UUID])).toBe(true);
        expect(isArray(isUUID, false)("no")).toContain("array");
        expect(isArray(isUUID)(["no"])).toContain("invalid");
        expect(isArray(isUUID, false)([UUID, UUID])).toContain("duplicate");
        await expect(isUnique("a", async () => true)).resolves.toBe(true);
        await expect(isUnique("a", async () => false)).resolves.toBe("Must be unique.");
    });
});

describe("request validators", () => {
    it("rejects an unknown body field and a missing required field", () => {
        const validator = new NameValidator();
        expect(validator.validate({} as any).valid).toBe(false);
        expect(validator.validate({ name: "Ann", extra: 1 } as any).valid).toBe(false);
        expect(validator.validate({ name: "Ann" }).valid).toBe(true);
    });

    it("validates users, persons, roles, services, and list queries", () => {
        expect(new UserValidator().validate({ nickname: "admin", password: "secret" } as any).valid).toBe(true);
        expect(new UserValidator().validate({
            nickname: "admin", password: "secret", lastAuth: "2020-01-01", active: false, origin: "web",
        } as any).valid).toBe(true);
        expect(new UserValidator().validate({ nickname: "admin", password: "secret", lastAuth: null } as any).valid).toBe(true);
        expect(new CredentialBodyValidator().validate({ nickname: "ad", password: "secret" } as any).valid).toBe(false);
        const person = {
            firstName: "Ana", lastName: "Lopez", email: "ana@example.com",
            phone: "3001234567", birthDate: "1990-01-01", userId: UUID, roleId: UUID,
        };
        expect(new PersonAddValidator().validate(person as any).valid).toBe(true);
        expect(new PersonAddValidator().validate({ ...person, email: "bad" } as any).valid).toBe(false);
        expect(new PersonEditValidator().validate({
            firstName: "Ana", lastName: "Lopez", email: "ana@example.com",
            phone: "3001234567", birthDate: "1990-01-01",
        } as any).valid).toBe(true);
        expect(new RoleAddValidator().validate({ name: "Admin" } as any).valid).toBe(true);
        expect(new RoleEditValidator().validate({} as any).valid).toBe(false);
        expect(new ServiceAddValidator().validate({ name: "List", code: "0201" } as any).valid).toBe(true);
        expect(new ServiceEditValidator().validate({ name: "List", code: "ABCD" } as any).valid).toBe(false);
        expect(new RoleAddOrDeleteServiceAssignmentValidator().validate({ services: [UUID] }).valid).toBe(true);
        expect(new RoleAddOrDeleteServiceAssignmentValidator().validate({ services: [UUID, UUID] }).valid).toBe(false);

        expect(new PersonListValidator().validate({ page: "1", email: "a@b.co" } as any).valid).toBe(true);
        expect(new PersonListValidator().validate({ page: "x" } as any).valid).toBe(false);
        expect(new RolListValidator().validate({ name: "Ad" } as any).valid).toBe(false);
        expect(new ServiceListValidator().validate({ code: "0201" } as any).valid).toBe(true);
        expect(zodValidate(personListSchema, { extra: "1" }).valid).toBe(false);
        expect(zodValidate(roleListSchema, {}).valid).toBe(true);
        expect(zodValidate(namedListSchema, { code: "12" }).valid).toBe(false);
        expect(zodValidate(declaredValueSchema, {
            tags: ["a"], amount: "10.50", address: { city: "Cali" },
        }).valid).toBe(true);
        expect(zodValidate(declaredValueSchema, {
            tags: ["a"], amount: "10.50", address: { city: "Cali", extra: 1 },
        }).valid).toBe(false);
        expect(isDecimal("10.50")).toBe(true);
        expect(isDecimal("nope")).not.toBe(true);
        expect(isObject({ city: isString })({ city: "Cali" })).toBe(true);
        expect(isObject({ city: isString })({ city: "Cali", extra: 1 })).not.toBe(true);
    });

    it("stops the request when the body or the query is invalid", () => {
        const res = mockRes();
        const next = jest.fn();
        validationDataMiddleware(new NameValidator())({ body: {} } as any, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();

        class UploadValidator extends BaseValidator<{ name?: string; image?: unknown }> {
            constructor() {
                super({ name: [isRequired, isString, minLength(3)], image: [isFile] });
            }
        }
        const fileRes = mockRes();
        const fileNext = jest.fn();
        validationDataFileMiddleware(new UploadValidator())({
            body: { name: "Ann" },
            file: { buffer: Buffer.from("a"), originalname: "a.png" },
        } as any, fileRes, fileNext);
        expect(fileNext).toHaveBeenCalled();

        const queryNext = jest.fn();
        const req: any = { query: { page: "2", name: "Admin" } };
        new QueryParamsMiddleware().queryValidationMiddleware(
            new RolListValidator(),
            () => { throw new Error("bad window"); },
        )(req, mockRes(), queryNext);
        expect(queryNext).not.toHaveBeenCalled();

        const ok: any = { query: { page: "2" } };
        const okNext = jest.fn();
        new QueryParamsMiddleware().queryValidationMiddleware(
            new RolListValidator(),
            (data) => ({ page: 2, limit: 20, offset: 20, filters: data }),
        )(ok, mockRes(), okNext);
        expect(ok.queryParams.page).toBe(2);
        expect(okNext).toHaveBeenCalled();
    });
});

describe("feature middleware", () => {
    it("rejects an empty user and stamps the actor on the body", () => {
        const res = mockRes();
        const next = jest.fn();
        new UserMiddleware().validateCredentialBody({ body: {} } as any, res, next);
        expect(res.status).toHaveBeenCalledWith(400);

        const personRes = mockRes();
        new PersonMiddleware().validateAdd({ body: {} } as any, personRes, jest.fn());
        expect(personRes.status).toHaveBeenCalledWith(400);

        const roleRes = mockRes();
        new RoleMiddleware().validateRolAddorDeleteServiceAssignment({ body: {} } as any, roleRes, jest.fn());
        expect(roleRes.status).toHaveBeenCalledWith(400);

        const serviceNext = jest.fn();
        new ServiceMiddleware().validateAdd({ body: { name: "List", code: "0201" } } as any, mockRes(), serviceNext);
        expect(serviceNext).toHaveBeenCalled();

        const req: any = { body: {}, user: { id: "actor" } };
        new PersonSerialzerMiddleware().add()(req, mockRes(), jest.fn());
        new RoleSerializerMiddleware().edit()(req, mockRes(), jest.fn());
        new ServiceSerialzerMiddleware().add()(req, mockRes(), jest.fn());
        expect(req.body).toMatchObject({ createdBy: "actor", updatedBy: "actor" });
    });
});
