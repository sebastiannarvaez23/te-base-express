import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";

/** The raw body is read only here, and only after the signature matches. */
export function signBody(secret: string, raw: Buffer): string {
    return createHmac("sha256", secret).update(raw).digest("hex");
}

export function signedBodyMatches(secret: string, raw: Buffer, signature: string | undefined): boolean {
    if (!secret || !signature) return false;
    const expected = Buffer.from(signBody(secret, raw));
    const given = Buffer.from(signature);
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
}

export function requireSignedBody(secret: () => string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
        const header = req.header("x-signature") || undefined;
        if (!signedBodyMatches(secret(), raw, header)) {
            return res.status(400).json({
                errors: [{ field: "signature", code: "VAL_001", detail: "The signature does not match the body. Review the sender." }],
            });
        }
        next();
    };
}
