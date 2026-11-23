import { Op } from "sequelize";

import { pageWindow } from "../../../../../../../core/pagination";
import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { ServiceListParams } from "../../../../access/services/domain/service-qlist.entity";

export function buildServiceListQueryParams(data: ServiceListParams): QueryParams {
    const { page, limit, offset } = pageWindow(data.page, data.limit);

    const filters: { [key: string]: any } = {};

    if (data.name) {
        filters.name = { [Op.iLike]: `%${data.name}%` };
    }

    if (data.code) {
        filters.code = { [Op.iLike]: `${data.code}` };
    }

    return { page, limit, offset, filters };
}