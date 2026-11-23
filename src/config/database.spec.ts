import { DatabaseConfig } from "./database";

describe("DatabaseConfig", () => {
    it("exposes the sequelize instance and can sync without opening a connection", async () => {
        process.env.DB_NAME = process.env.DB_NAME || "base";
        process.env.DB_USER = process.env.DB_USER || "base";
        process.env.DB_PASSWORD = process.env.DB_PASSWORD || "base";
        process.env.DB_HOST = process.env.DB_HOST || "localhost";
        process.env.DB_PORT = process.env.DB_PORT || "5432";
        process.env.DB_DRIVER = process.env.DB_DRIVER || "postgres";

        const config = new DatabaseConfig();
        const database = config.getDatabase();
        expect(database).toBeDefined();

        const sync = jest.spyOn(database, "sync").mockResolvedValue(database as any);
        jest.spyOn(console, "log").mockImplementation(() => undefined);
        await config.syncDatabase();
        expect(sync).toHaveBeenCalledWith({ alter: true });

        sync.mockRejectedValueOnce(new Error("down"));
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        await expect(config.syncDatabase()).resolves.toBeUndefined();
        jest.restoreAllMocks();
    });
});
