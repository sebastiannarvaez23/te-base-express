import { signBody, signedBodyMatches } from "./signed-body";

describe("signed body", () => {
    it("accepts the raw body only when the signature matches", () => {
        const raw = Buffer.from('{"event":"ping"}');
        const signature = signBody("secret", raw);
        expect(signedBodyMatches("secret", raw, signature)).toBe(true);
        expect(signedBodyMatches("secret", raw, "deadbeef")).toBe(false);
        expect(signedBodyMatches("secret", Buffer.from("other"), signature)).toBe(false);
    });
});