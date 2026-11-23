import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { isArray, isRequired, isUUID } from "../../../../../../../core/middlewares/validators/validation.type";

export class RoleAddOrDeleteServiceAssignmentValidator extends BaseValidator<{ services: string[] }> {
    constructor() {
        super({
            services: [isRequired, isArray(isUUID, false)]
        });
    }
}