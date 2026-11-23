import { EncryptionUtil } from "./encryption.util";

describe("EncryptionUtil", () => {
    it("round-trips a password and rejects a truncated payload", () => {
        process.env.SECRET_KEY = "unit-test-key";
        const encryption = new EncryptionUtil();
        const stored = encryption.encrypt("admin");
        expect(encryption.decrypt(stored)).toBe("admin");
        expect(encryption.decrypt(stored.slice(0, 10))).toBe("");
    });
});