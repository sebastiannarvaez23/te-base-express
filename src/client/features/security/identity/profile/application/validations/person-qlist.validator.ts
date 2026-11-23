import { BaseValidator } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { personListSchema, zodValidate } from "../../../../../../../core/contracts/input-schemas";
import { PersonListParams } from "../../domain/person-qlist.entity";

export class PersonListValidator extends BaseValidator<PersonListParams> {
    constructor() {
        super({});
    }

    validate(data: PersonListParams) {
        return zodValidate(personListSchema, data);
    }
}
