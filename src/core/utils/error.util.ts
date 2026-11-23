import { ERROR_REGISTRY } from "../errors/catalog";

export class HttpError extends Error {
    statusCode: number;
    internalCode: string;

    constructor(internalCode: string) {
        const entry = ERROR_REGISTRY[internalCode];
        const message = entry?.detail || "The operation could not be completed. Try again.";
        const statusCode = entry?.httpStatus ?? 500;

        super(message);
        this.statusCode = statusCode;
        this.internalCode = internalCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
