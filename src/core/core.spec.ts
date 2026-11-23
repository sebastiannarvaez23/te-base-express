import { uuidv7 } from "./ids";
import { pageWindow, toPage, MAX_PAGE_SIZE } from "./pagination";
import { hashPassword, passwordMatches } from "./passwords";
import { EncryptionUtil } from "./utils/encryption.util";
import { accessTokenTtlSeconds } from "./utils/token-manager.util";
import { loginSchema, zodValidate } from "./contracts/input-schemas";
import { AuthorizationMiddleware } from "./middlewares/auth/authorization.middleware";
import { resetSubject } from "../client/features/security/lifecycle/auth/domain/reset-subject";

describe("uuidv7", () => {
  it("emits a version-7 uuid", () => {
    const id = uuidv7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("pagination", () => {
  const previous = process.env.LIST_PAGINATION_LIMIT;

  afterEach(() => {
    if (previous === undefined) delete process.env.LIST_PAGINATION_LIMIT;
    else process.env.LIST_PAGINATION_LIMIT = previous;
  });

  it("defaults to page 1 and caps the page size", () => {
    const window = pageWindow(undefined, "500");
    expect(window.page).toBe(1);
    expect(window.limit).toBe(MAX_PAGE_SIZE);
    expect(window.offset).toBe(0);
  });

  it("offsets from the requested page", () => {
    const window = pageWindow("3", "10");
    expect(toPage({ rows: ["a"], count: 25 }, window)).toEqual({
      items: ["a"], total: 25, page: 3, page_size: 10,
    });
  });

  it("falls back when the page or size is empty or not a number", () => {
    process.env.LIST_PAGINATION_LIMIT = "7";
    expect(pageWindow("0", undefined)).toMatchObject({ page: 1, limit: 7, offset: 0 });
    expect(pageWindow("nope", "0")).toMatchObject({ page: 1, limit: 20, offset: 0 });
    expect(pageWindow("-4", "2")).toMatchObject({ page: 1, limit: 2, offset: 0 });
  });
});

describe("passwords", () => {
  it("verifies a bcrypt hash and a legacy reversible value", async () => {
    process.env.SECRET_KEY = process.env.SECRET_KEY || "unit-test-key";
    const legacy = new EncryptionUtil();
    const stored = await hashPassword("secret");
    expect(stored.startsWith("$2")).toBe(true);
    expect(await passwordMatches("secret", stored, legacy)).toBe(true);
    expect(await passwordMatches("nope", stored, legacy)).toBe(false);
    const old = legacy.encrypt("admin");
    expect(await passwordMatches("admin", old, legacy)).toBe(true);
    const broken = { decrypt: () => { throw new Error("bad cipher"); } } as unknown as EncryptionUtil;
    expect(await passwordMatches("admin", "legacy-value", broken)).toBe(false);
  });
});

describe("access token ttl", () => {
  it("keeps the session length in seconds", () => {
    expect(accessTokenTtlSeconds(3600)).toBe(3600);
    expect(() => accessTokenTtlSeconds(0)).toThrow();
    expect(() => accessTokenTtlSeconds(Number.NaN)).toThrow();
  });
});

describe("login schema", () => {
  it("rejects unknown fields and short nicknames", () => {
    expect(zodValidate(loginSchema, { nickname: "admin", password: "admin", extra: 1 }).valid).toBe(false);
    expect(zodValidate(loginSchema, { nickname: "ad", password: "admin" }).valid).toBe(false);
    expect(zodValidate(loginSchema, { nickname: "admin", password: "admin" }).valid).toBe(true);
  });
});

describe("authorization", () => {
  const middleware = new AuthorizationMiddleware().checkAccess("0201");

  it("allows a service client and denies a user without the service", () => {
    const next = jest.fn();
    middleware({ user: { sub: "microservice_billing", services: [] } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith();

    const denied = jest.fn();
    middleware({ user: { sub: "admin", services: ["0202"] } } as any, {} as any, denied);
    expect(denied.mock.calls[0][0].internalCode).toBe("PERM_002");

    const missing = jest.fn();
    middleware({} as any, {} as any, missing);
    expect(missing.mock.calls[0][0].internalCode).toBe("PERM_001");

    const allowed = jest.fn();
    middleware({ user: { sub: "admin", services: ["0201"] } } as any, {} as any, allowed);
    expect(allowed).toHaveBeenCalledWith();
  });
});

describe("password reset subject", () => {
  it("uses the account nickname", () => {
    expect(resetSubject({ user: { nickname: "admin" } })).toBe("admin");
    expect(resetSubject({ user: { id: "abc" } } as any)).toBeNull();
    expect(resetSubject(null)).toBeNull();
    expect(resetSubject({ user: { nickname: "" } })).toBeNull();
  });
});
