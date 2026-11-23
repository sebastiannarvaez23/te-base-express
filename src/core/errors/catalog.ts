/**
 * Single error catalog. `message` and `detail` stay in English.
 * `es` is the operator text (what failed and what to review).
 */
export interface CatalogEntry {
    httpStatus: number;
    message: string;
    detail: string;
    es: string;
}

export const ERROR_REGISTRY: Record<string, CatalogEntry> = {
    AUTH_001: {
        httpStatus: 401,
        message: "Invalid credentials",
        detail: "The username or password is incorrect.",
        es: "Usuario o contraseña incorrectos.",
    },
    AUTH_003: {
        httpStatus: 403,
        message: "Account inactive",
        detail: "This account is inactive. Ask an administrator to activate it or use another account.",
        es: "Esa cuenta está inactiva: actívala o elige otra.",
    },
    AUTH_004: {
        httpStatus: 401,
        message: "Invalid token",
        detail: "That session is no longer valid. Sign in again.",
        es: "Esa sesión ya no es válida. Vuelve a iniciar sesión.",
    },
    AUTH_005: {
        httpStatus: 401,
        message: "Authentication required",
        detail: "Sign in to continue.",
        es: "Necesitas iniciar sesión para continuar.",
    },
    AUTH_008: {
        httpStatus: 403,
        message: "Integration application inactive",
        detail: "This integration application is disabled or revoked. Review the client credentials.",
        es: "Esta aplicación de integración está deshabilitada o revocada. Revisa las credenciales.",
    },
    AUTH_021: {
        httpStatus: 401,
        message: "Reset link unavailable",
        detail: "That password reset link is no longer valid. Request another one.",
        es: "Ese enlace para restablecer la contraseña ya no es válido. Pide otro.",
    },
    SESS_001: {
        httpStatus: 404,
        message: "Session unavailable",
        detail: "That session is no longer available. Sign in again.",
        es: "Esa sesión ya no está disponible. Vuelve a iniciar sesión.",
    },
    USER_001: {
        httpStatus: 404,
        message: "User unavailable",
        detail: "That user is not available. Review the selection.",
        es: "Ese usuario no está disponible: revisa la selección.",
    },
    ROLE_001: {
        httpStatus: 404,
        message: "Role unavailable",
        detail: "That role is not available. Review the selection.",
        es: "Ese rol no está disponible: revisa la selección.",
    },
    PERS_001: {
        httpStatus: 404,
        message: "Profile unavailable",
        detail: "That profile is not available. Review the selection.",
        es: "Ese perfil no está disponible: revisa la selección.",
    },
    SVC_001: {
        httpStatus: 404,
        message: "Service unavailable",
        detail: "That service is not available. Review the selection.",
        es: "Ese servicio no está disponible: revisa la selección.",
    },
    PERM_001: {
        httpStatus: 403,
        message: "Insufficient permissions",
        detail: "You do not have permission for this action.",
        es: "No tienes permisos suficientes para realizar esta acción.",
    },
    PERM_002: {
        httpStatus: 403,
        message: "Action not allowed",
        detail: "Your role does not include this action. Ask for access or choose another action.",
        es: "Tu rol no tiene acceso a esta acción.",
    },
    VAL_001: {
        httpStatus: 400,
        message: "Validation error",
        detail: "Review the submitted data: one or more fields are invalid or were not expected.",
        es: "Revisa los datos enviados: hay campos inválidos o que no corresponden.",
    },
    VAL_002: {
        httpStatus: 409,
        message: "Value already in use",
        detail: "That value is already in use. Review the field and choose another.",
        es: "Ese valor ya está en uso: revisa el campo y elige otro.",
    },
    HTTP_001: {
        httpStatus: 404,
        message: "Record unavailable",
        detail: "That record is not available. Review the selection.",
        es: "Ese registro no está disponible: revisa la selección.",
    },
    SRV_001: {
        httpStatus: 500,
        message: "Internal server error",
        detail: "The operation could not be completed. Try again.",
        es: "No se pudo completar la operación. Inténtalo de nuevo.",
    },
    SRV_002: {
        httpStatus: 500,
        message: "Operation not saved",
        detail: "The operation could not be saved. Try again.",
        es: "No se pudo guardar la operación. Inténtalo de nuevo.",
    },
};

const SPANISH = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/;

export function assertCatalogLanguage(): void {
    for (const [code, entry] of Object.entries(ERROR_REGISTRY)) {
        if (!/^([A-Z]+)_(\d{3})$/.test(code)) {
            throw new Error(`Unstable error code: ${code}`);
        }
        if (SPANISH.test(entry.message) || SPANISH.test(entry.detail)) {
            throw new Error(`English catalog contains Spanish text: ${code}`);
        }
        if (!entry.es.trim()) throw new Error(`Missing Spanish operator text: ${code}`);
    }
}

export function errorI18nDocuments(): { en: { errors: Record<string, string> }; es: { errors: Record<string, string> } } {
    assertCatalogLanguage();
    const en: Record<string, string> = {};
    const es: Record<string, string> = {};
    for (const code of Object.keys(ERROR_REGISTRY).sort()) {
        const entry = ERROR_REGISTRY[code];
        en[code] = entry.detail.endsWith(".") ? entry.detail : `${entry.detail}.`;
        es[code] = entry.es;
    }
    en.default = "The operation could not be completed. Try again.";
    es.default = "No se pudo completar la operación. Inténtalo de nuevo.";
    return { en: { errors: en }, es: { errors: es } };
}
