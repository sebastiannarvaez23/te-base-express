import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { isRequired, isString, maxLength } from "../../../../../../../core/middlewares/validators/validation.type";
import { RoleEntity } from "../../domain/role.entity";

export class RoleEditValidator extends BaseValidator<RoleEntity> {
    constructor() {
        super({
            name: [isRequired, isString, maxLength(70)]
        });
    }
}