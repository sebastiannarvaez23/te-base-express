import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { ServiceEntity } from "../../domain/service.entity";
import { ServicesRepository } from "../../domain/repositories/service.repository";

export class ListServicesUseCase {
    constructor(private readonly services: ServicesRepository) { }
    execute(query: QueryParams) { return this.services.getList(query); }
}

export class GetServiceUseCase {
    constructor(private readonly services: ServicesRepository) { }
    execute(id: string) { return this.services.get(id); }
}

export class AddServiceUseCase {
    constructor(private readonly services: ServicesRepository) { }
    execute(service: ServiceEntity) { return this.services.add(service); }
}

export class EditServiceUseCase {
    constructor(private readonly services: ServicesRepository) { }
    execute(id: string, service: ServiceEntity) { return this.services.edit(id, service); }
}

export class DeleteServiceUseCase {
    constructor(private readonly services: ServicesRepository) { }
    execute(id: string) { return this.services.delete(id); }
}

export class ServiceManagement {
    constructor(private readonly services: ServicesRepository) { }

    getList(query: QueryParams) { return new ListServicesUseCase(this.services).execute(query); }
    get(id: string) { return new GetServiceUseCase(this.services).execute(id); }
    add(service: ServiceEntity) { return new AddServiceUseCase(this.services).execute(service); }
    edit(id: string, service: ServiceEntity) { return new EditServiceUseCase(this.services).execute(id, service); }
    delete(id: string) { return new DeleteServiceUseCase(this.services).execute(id); }
}
