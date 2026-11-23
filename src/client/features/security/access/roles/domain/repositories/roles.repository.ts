import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { RoleEntity } from "../role.entity";

export interface RolesRepository {
    getList(queryParams: QueryParams): Promise<{ rows: RoleEntity[]; count: number; }>;
    get(id: string): Promise<RoleEntity | null>;
    add(role: RoleEntity): Promise<RoleEntity>;
    edit(id: string, role: RoleEntity): Promise<RoleEntity>;
    delete(id: string): Promise<RoleEntity>;
    addServiceAssignment(roleId: string, services: string[]): Promise<RoleEntity>;
    deleteServiceAssignment(roleId: string, services: string[]): Promise<RoleEntity>;
}
