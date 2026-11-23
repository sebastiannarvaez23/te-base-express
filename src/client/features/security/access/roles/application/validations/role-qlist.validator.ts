import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { roleListSchema, zodValidate } from "../../../../../../../core/contracts/input-schemas";
import { RolListParams } from "../../domain/role-qlist.entity";

export class RolListValidator extends BaseValidator<RolListParams> {
    constructor() {
        super({});
    }

    validate(data: RolListParams) {
        return zodValidate(roleListSchema, data);
    }
}
