const bucketExists = jest.fn();
const makeBucket = jest.fn();
const putObject = jest.fn();
const presignedGetObject = jest.fn();
const removeObject = jest.fn();

jest.mock("minio", () => ({
    Client: jest.fn().mockImplementation(() => ({
        bucketExists, makeBucket, putObject, presignedGetObject, removeObject,
    })),
}));

import { MinioConfig } from "./minio";

async function flush() {
    await new Promise((resolve) => setImmediate(resolve));
}

describe("MinioConfig", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MINIO_ENDPOINT = "localhost";
        process.env.MINIO_PORT = "9000";
        process.env.MINIO_ACCESS_KEY = "key";
        process.env.MINIO_SECRET_KEY = "secret";
        process.env.MINIO_BUCKET_NAME = "files";
        bucketExists.mockResolvedValue(true);
        presignedGetObject.mockResolvedValue("http://signed");
        jest.spyOn(console, "log").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("creates the bucket when it is missing and stores, signs, and deletes objects", async () => {
        bucketExists.mockResolvedValueOnce(false);
        const storage = new MinioConfig();
        await flush();
        expect(makeBucket).toHaveBeenCalledWith("files", "us-east-1");

        const file = { originalname: "a.png", buffer: Buffer.from("a") } as Express.Multer.File;
        await storage.setFile(file);
        expect(putObject).toHaveBeenCalledWith("files", "a.png", file.buffer);
        await storage.setFile(undefined as any);

        await expect(storage.getPresignedUrl("a.png")).resolves.toBe("http://signed");
        await expect(storage.getPresignedUrl(null)).resolves.toBeUndefined();

        await storage.deleteImage("a.png");
        await storage.deleteImage("");
        expect(removeObject).toHaveBeenCalledTimes(1);

        await storage.replaceImage("a.png", file);
        expect(removeObject).toHaveBeenCalledTimes(2);
        expect(storage.getBucketName()).toBe("files");
        expect(storage.getStorage()).toBeDefined();
        expect(storage.getClient()).toBeDefined();
    });

    it("keeps the process alive when the bucket check fails", async () => {
        bucketExists.mockRejectedValueOnce(new Error("down"));
        new MinioConfig();
        await flush();
        expect(makeBucket).not.toHaveBeenCalled();
    });
});
