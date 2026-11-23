const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMERIC = /^[0-9]+$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const isRequired = (value: any): boolean | string =>
    value !== null && value !== undefined ? true : 'This field is required.';

export const isFile = (value: any): boolean | string => {
    if (value && typeof value === 'object' && value.buffer && typeof value.originalname === 'string') {
        return true;
    }
    return 'Must be a valid file.';
};

export const isString = (value: any): boolean | string => {
    return typeof value === 'string' ? true : 'Must be a string.';
};

export const isNumber = (value: any): boolean | string =>
    typeof value === 'number' ? true : 'Must be a number.';

export const isDecimal = (value: any): boolean | string =>
    typeof value === 'string' && /^\d+(\.\d{1,4})?$/.test(value) ? true : 'Must be a decimal.';

export const isObject = (
    shape: Record<string, (value: any) => boolean | string>,
) => (value: any): boolean | string => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Must be an object.';
    for (const key of Object.keys(value)) {
        if (!shape[key]) return `The parameter '${key}' was not expected`;
    }
    for (const [key, check] of Object.entries(shape)) {
        const result = check((value as Record<string, unknown>)[key]);
        if (result !== true) return `${key}: ${result}`;
    }
    return true;
};

export const minLength = (min: number) => (value: any): boolean | string => {
    if (typeof value === 'string' && value.length >= min) {
        return true;
    }
    return `Must be at least ${min} characters long.`;
};

export const maxLength = (max: number) => (value: any): boolean | string => {
    if (typeof value === 'string' && value.length <= max) {
        return true;
    }
    return `Must be no more than ${max} characters long.`;
};

export const isEmail = (value: any): string | boolean => {
    if (typeof value === 'string' && EMAIL.test(value)) {
        return true;
    }
    return 'Must be a valid email address.';
};

export const isDate = (value: any): string | boolean => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return true;
    }
    return 'Must be a valid date.';
};

export const isNumericString = (value: any): string | boolean => {
    if (typeof value === 'string' && NUMERIC.test(value)) {
        return true;
    }
    return 'Must contain only numeric characters.';
};

export const isUnique = async (value: any, checkUniqueFn: (value: any) => Promise<boolean>): Promise<boolean | string> => {
    const isUniqueValue = await checkUniqueFn(value);
    return isUniqueValue ? true : 'Must be unique.';
};

export const isUUID = (value: any): boolean | string => {
    if (typeof value === 'string' && UUID.test(value)) {
        return true;
    }
    return 'Must be a valid UUID.';
};

export const isBoolean = (value: any): boolean | string => {
    return typeof value === 'boolean' ? true : 'Must be a boolean value.';
};

export const isNullable = (value: any): boolean | string => {
    return value === undefined || value === null ? true : 'Value cannot be null.';
};

export const isArray = (
    typeValidator: (value: any) => boolean | string,
    allowDuplicates: boolean = true
) => (value: any): boolean | string => {
    if (!Array.isArray(value)) {
        return 'Must be an array.';
    }

    for (const element of value) {
        const isValid = typeValidator(element);
        if (isValid !== true) {
            return `Array element is invalid: ${isValid}`;
        }
    }

    if (!allowDuplicates) {
        const uniqueElements = new Set(value);
        if (uniqueElements.size !== value.length) {
            return 'Array contains duplicate values, which are not allowed.';
        }
    }
    return true;
};