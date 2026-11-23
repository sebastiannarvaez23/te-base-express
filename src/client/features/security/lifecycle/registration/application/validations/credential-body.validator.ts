import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { isRequired, isString, minLength, maxLength } from "../../../../../../../core/middlewares/validators/validation.type";
import { UserEntity } from "../../domain/user.entity";

export class CredentialBodyValidator extends BaseValidator<UserEntity> {
    constructor() {
        super({
            nickname: [isRequired, isString, minLength(5), maxLength(20)],
            password: [isRequired, isString, minLength(3), maxLength(200)],
        });
    }
}