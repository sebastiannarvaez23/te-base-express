import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { ServiceEntity } from "../service.entity";

export interface ServicesRepository {
    getList(queryParams: QueryParams): Promise<{ rows: ServiceEntity[]; count: number; }>;
    get(id: string): Promise<ServiceEntity | null>;
    add(service: ServiceEntity): Promise<ServiceEntity>;
    edit(id: string, service: ServiceEntity): Promise<ServiceEntity>;
    delete(id: string): Promise<ServiceEntity>;
}
