import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { RoleEntity } from "../../domain/role.entity";
import { RolesRepository } from "../../domain/repositories/roles.repository";

export class ListRolesUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(query: QueryParams) { return this.roles.getList(query); }
}

export class GetRoleUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(id: string) { return this.roles.get(id); }
}

export class AddRoleUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(role: RoleEntity) { return this.roles.add(role); }
}

export class EditRoleUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(id: string, role: RoleEntity) { return this.roles.edit(id, role); }
}

export class DeleteRoleUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(id: string) { return this.roles.delete(id); }
}

export class GrantRoleServicesUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(id: string, services: { services: string[] }) { return this.roles.addServiceAssignment(id, services.services); }
}

export class RevokeRoleServicesUseCase {
    constructor(private readonly roles: RolesRepository) { }
    execute(id: string, services: { services: string[] }) { return this.roles.deleteServiceAssignment(id, services.services); }
}

export class RoleManagement {
    constructor(private readonly roles: RolesRepository) { }

    getList(query: QueryParams) { return new ListRolesUseCase(this.roles).execute(query); }
    get(id: string) { return new GetRoleUseCase(this.roles).execute(id); }
    add(role: RoleEntity) { return new AddRoleUseCase(this.roles).execute(role); }
    edit(id: string, role: RoleEntity) { return new EditRoleUseCase(this.roles).execute(id, role); }
    delete(id: string) { return new DeleteRoleUseCase(this.roles).execute(id); }
    addServiceAssignment(id: string, services: { services: string[] }) { return new GrantRoleServicesUseCase(this.roles).execute(id, services); }
    deleteServiceAssignment(id: string, services: { services: string[] }) { return new RevokeRoleServicesUseCase(this.roles).execute(id, services); }
}
