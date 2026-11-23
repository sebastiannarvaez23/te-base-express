import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { PersonEntity } from "../../domain/person.entity";
import { PersonsRepository } from "../../domain/repositories/persons.repository";

export class ListPersonsUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(query: QueryParams) { return this.persons.getList(query); }
}

export class GetPersonUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(id: string) { return this.persons.get(id); }
}

export class AddPersonUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(person: PersonEntity) { return this.persons.add(person); }
}

export class EditPersonUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(id: string, person: PersonEntity) { return this.persons.edit(id, person); }
}

export class DeletePersonUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(id: string) { return this.persons.delete(id); }
}

export class GetPersonByNicknameUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(nickname: string) { return this.persons.getPersonByNickname(nickname); }
}

export class GetPersonByEmailUseCase {
    constructor(private readonly persons: PersonsRepository) { }
    execute(email: string) { return this.persons.getPersonByEmail(email); }
}

export class PersonManagement {
    constructor(private readonly persons: PersonsRepository) { }

    getList(query: QueryParams) { return new ListPersonsUseCase(this.persons).execute(query); }
    get(id: string) { return new GetPersonUseCase(this.persons).execute(id); }
    add(person: PersonEntity) { return new AddPersonUseCase(this.persons).execute(person); }
    edit(id: string, person: PersonEntity) { return new EditPersonUseCase(this.persons).execute(id, person); }
    delete(id: string) { return new DeletePersonUseCase(this.persons).execute(id); }
    getPersonByNickname(nickname: string) { return new GetPersonByNicknameUseCase(this.persons).execute(nickname); }
    getPersonByEmail(email: string) { return new GetPersonByEmailUseCase(this.persons).execute(email); }
}
