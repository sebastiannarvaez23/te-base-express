import { DatabaseError, ForeignKeyConstraintError, UniqueConstraintError, ValidationErrorItem } from "sequelize";

import { assertCatalogLanguage, errorI18nDocuments } from "./errors/catalog";
import { HttpError } from "./utils/error.util";
import { ErrorHandlerUtil, toFieldErrors } from "./utils/error-handler.util";

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("error catalog", () => {
    it("reads a known code once and falls back for an unknown code", () => {
        const known = new HttpError("AUTH_005");
        expect(known.statusCode).toBe(401);
        expect(known.internalCode).toBe("AUTH_005");
        expect(known.message).toBe("Sign in to continue.");

        const unknown = new HttpError("999999");
        expect(unknown.statusCode).toBe(500);
        expect(unknown.message).toBe("The operation could not be completed. Try again.");
    });

    it("keeps English in the registry and a Spanish line for every code", () => {
        expect(() => assertCatalogLanguage()).not.toThrow();
        const docs = errorI18nDocuments();
        expect(docs.en.errors.AUTH_001).toBe("The username or password is incorrect.");
        expect(docs.es.errors.AUTH_001).toBe("Usuario o contraseña incorrectos.");
        expect(docs.es.errors.USER_001).toContain("revisa la selección");
        expect(docs.en.errors.default).toBeTruthy();
        expect(docs.es.errors.default).toBeTruthy();
    });
});

describe("toFieldErrors", () => {
    it("maps strings and lists and skips the internal code key", () => {
        expect(toFieldErrors({
            internalCode: "VAL_001",
            nickname: ["Must be a string."],
            extra: "The parameter 'extra' was not expected",
        })).toEqual([
            { field: "nickname", code: "VAL_001", detail: "Must be a string." },
            { field: "extra", code: "VAL_001", detail: "The parameter 'extra' was not expected" },
        ]);
    });

    it("returns a generic item when every field is empty", () => {
        expect(toFieldErrors({ nickname: [] }, "VAL_001")).toEqual([
            { field: "", code: "VAL_001", detail: "Invalid input" },
        ]);
    });
});

describe("ErrorHandlerUtil", () => {
    const handler = new ErrorHandlerUtil();

    beforeEach(() => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("maps a unique constraint to field errors", () => {
        const res = mockRes();
        const item = new ValidationErrorItem(
            "dup", "unique violation", "email", "a@b.c", null as any, "unique", "unique", [],
        );
        handler.handle(new UniqueConstraintError({ errors: [item] }), {} as any, res);
        expect(res.status).toHaveBeenCalledWith(new HttpError("VAL_002").statusCode);
        expect(res.json.mock.calls[0][0].errors[0]).toMatchObject({
            field: "email",
            code: "VAL_002",
            detail: "That value is already in use. Review the field and choose another.",
        });
    });

    it("maps a foreign key and an invalid uuid database error", () => {
        const fk = mockRes();
        handler.handle(new ForeignKeyConstraintError({ index: "persons_role_id" } as any), {} as any, fk);
        expect(fk.json.mock.calls[0][0].errors[0]).toMatchObject({
            field: "role_id",
            code: "HTTP_001",
            detail: "That record is not available. Review the selection.",
        });

        const db = mockRes();
        const original = Object.assign(new Error("bad"), { code: "22P02" });
        handler.handle(new DatabaseError(original as any), {} as any, db);
        expect(db.json.mock.calls[0][0].errors[0].code).toBe("VAL_001");

        const other = mockRes();
        handler.handle(new DatabaseError(new Error("other") as any), {} as any, other);
        expect(other.json.mock.calls[0][0].errors[0].code).toBe("SRV_002");
    });

    it("passes an HttpError through and wraps anything else", () => {
        const known = mockRes();
        handler.handle(new HttpError("PERM_002"), {} as any, known);
        expect(known.json.mock.calls[0][0].errors[0].code).toBe("PERM_002");

        const generic = mockRes();
        handler.handle(new Error("boom"), {} as any, generic);
        expect(generic.json.mock.calls[0][0].errors[0].code).toBe("SRV_001");
    });
});
