import { Op } from "sequelize";

import { buildPersonListQueryParams } from "../client/features/security/identity/profile/infrastructure/middlewares/person-query-params.middleware";
import { buildRolListQueryParams } from "../client/features/security/access/roles/infrastructure/middlewares/rol-query-params.middleware";
import { buildServiceListQueryParams } from "../client/features/security/identity/profile/infrastructure/middlewares/service-query-params.middleware";
import { CustomQueryListPaginator } from "./utils/custom-query-list-paginator";

describe("list query builders", () => {
    it("applies a page window and only the filters that were sent", () => {
        const people = buildPersonListQueryParams({ page: "2", limit: "5", firstName: "Ana", email: "a@b.co" });
        expect(people).toMatchObject({ page: 2, limit: 5, offset: 5 });
        expect(people.filters.firstName[Op.iLike]).toBe("%Ana%");
        expect(people.filters.email[Op.iLike]).toBe("%a@b.co%");
        expect(people.filters.lastName).toBeUndefined();

        const roles = buildRolListQueryParams({ name: "Admin" });
        expect(roles.filters.name[Op.iLike]).toBe("%Admin%");
        expect(roles.page).toBe(1);

        const services = buildServiceListQueryParams({ code: "0201", name: "List" });
        expect(services.filters.code[Op.iLike]).toBe("0201");
        expect(services.filters.name[Op.iLike]).toBe("%List%");
        expect(buildServiceListQueryParams({}).filters).toEqual({});
    });
});

describe("CustomQueryListPaginator", () => {
    it("counts the query and then applies limit and offset", async () => {
        const query = jest.fn()
            .mockResolvedValueOnce([{ total: "4" }])
            .mockResolvedValueOnce([{ id: "1" }]);
        const paginator = new CustomQueryListPaginator({ query } as any);
        await expect(paginator.execute("SELECT id FROM users", {
            replacements: { active: true },
            pagination: { limit: 10, offset: 20 },
        })).resolves.toEqual({ count: "4", rows: [{ id: "1" }] });
        expect(query.mock.calls[1][1].replacements).toMatchObject({ active: true, limit: 10, offset: 20 });
    });

    it("uses an empty page when pagination is omitted and rethrows a query failure", async () => {
        const query = jest.fn()
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([]);
        const paginator = new CustomQueryListPaginator({ query } as any);
        await expect(paginator.execute("SELECT 1", {})).resolves.toEqual({ count: 0, rows: [] });

        query.mockRejectedValue(new Error("sql"));
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        await expect(paginator.execute("SELECT 1", {})).rejects.toThrow("sql");
        jest.restoreAllMocks();
    });
});
