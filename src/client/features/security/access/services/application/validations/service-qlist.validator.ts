import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { namedListSchema, zodValidate } from "../../../../../../../core/contracts/input-schemas";
import { ServiceListParams } from "../../domain/service-qlist.entity";

export class ServiceListValidator extends BaseValidator<ServiceListParams> {
    constructor() {
        super({});
    }

    validate(data: ServiceListParams) {
        return zodValidate(namedListSchema, data);
    }
}
