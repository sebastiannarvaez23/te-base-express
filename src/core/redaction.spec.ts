import { redact, redactPrompt } from "./redaction";

describe("redaction", () => {
    it("hides secrets and contact data in logs and prompts", () => {
        expect(redact({
            password: "secret",
            email: "a@b.co",
            nested: { refresh: "abc", name: "Ada" },
        })).toEqual({
            password: "[redacted]",
            email: "[redacted]",
            nested: { refresh: "[redacted]", name: "Ada" },
        });
        expect(redactPrompt("mail a@b.co Bearer abc.def")).toBe("mail [redacted] Bearer [redacted]");
    });
});