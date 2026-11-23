import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { isRequired, isString, maxLength, isNumericString } from "../../../../../../../core/middlewares/validators/validation.type";
import { RoleEntity } from "../../domain/role.entity";

export class RoleAddValidator extends BaseValidator<RoleEntity> {
    constructor() {
        super({
            name: [isRequired, isString, maxLength(70)]
        });
    }
}