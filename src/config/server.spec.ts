import { Server } from "./server";

describe("Server", () => {
    it("listens on PORT or 8000", () => {
        const listen = jest.fn((_port: string, done: () => void) => done());
        jest.spyOn(console, "debug").mockImplementation(() => undefined);
        delete process.env.PORT;
        new Server({ listen } as any).raise();
        expect(listen).toHaveBeenCalledWith("8000", expect.any(Function));

        process.env.PORT = "3000";
        new Server({ listen } as any).raise();
        expect(listen).toHaveBeenLastCalledWith("3000", expect.any(Function));
        jest.restoreAllMocks();
    });
});
