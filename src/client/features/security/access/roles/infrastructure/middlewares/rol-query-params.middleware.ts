import { Op } from "sequelize";

import { pageWindow } from "../../../../../../../core/pagination";
import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { RolListParams } from "../../domain/role-qlist.entity";

export function buildRolListQueryParams(data: RolListParams): QueryParams {
    const { page, limit, offset } = pageWindow(data.page, data.limit);

    const filters: { [key: string]: any } = {};

    if (data.name) {
        filters.name = { [Op.iLike]: `%${data.name}%` };
    }

    return { page, limit, offset, filters };
}