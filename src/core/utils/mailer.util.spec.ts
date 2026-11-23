const sendMail = jest.fn().mockResolvedValue({ messageId: "1" });

jest.mock("../../config/mailer", () => ({
    MailerConfig: class {
        getTransporter() {
            return { sendMail };
        }
    },
}));

import { sendPasswordResetEmail } from "./mailer.util";

describe("sendPasswordResetEmail", () => {
    it("sends the reset link built from the frontend url", async () => {
        process.env.FRONTEND_URL = "http://front";
        process.env.EMAIL_FROM = "base@example.com";
        await sendPasswordResetEmail("ana@example.com", "abc");
        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: "base@example.com",
            to: "ana@example.com",
            subject: "Restablecimiento de Contraseña",
        }));
        expect(sendMail.mock.calls[0][0].text).toContain("http://front/reset-password/abc");
    });
});
