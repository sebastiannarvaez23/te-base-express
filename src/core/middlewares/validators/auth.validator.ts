import { AuthEntity } from "../../../client/features/security/lifecycle/auth/domain/auth.entity";
import { loginSchema, zodValidate } from "../../contracts/input-schemas";
import { BaseValidator } from "./validation.middleware";

export class AuthValidator extends BaseValidator<AuthEntity> {
    constructor() {
        super({});
    }

    validate(data: AuthEntity) {
        return zodValidate(loginSchema, data);
    }
}
