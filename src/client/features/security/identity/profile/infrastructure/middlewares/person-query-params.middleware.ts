import { Op } from "sequelize";

import { pageWindow } from "../../../../../../../core/pagination";
import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { PersonListParams } from "../../domain/person-qlist.entity";

export function buildPersonListQueryParams(data: PersonListParams): QueryParams {
    const { page, limit, offset } = pageWindow(data.page, data.limit);

    const filters: { [key: string]: any } = {};

    if (data.firstName) {
        filters.firstName = { [Op.iLike]: `%${data.firstName}%` };
    }

    if (data.lastName) {
        filters.lastName = { [Op.iLike]: `%${data.lastName}%` };
    }

    if (data.email) {
        filters.email = { [Op.iLike]: `%${data.email}%` };
    }

    return { page, limit, offset, filters };
}