import { PersonEntity } from "../person.entity";
import { QueryParams } from '../../../../../../../core/contracts/query-params.entity';

export interface PersonsRepository {
    getList(queryParams: QueryParams): Promise<{ rows: PersonEntity[]; count: number; }>;
    get(id: string): Promise<PersonEntity | null>;
    add(person: PersonEntity): Promise<PersonEntity>;
    edit(id: string, person: PersonEntity): Promise<PersonEntity>;
    delete(id: string): Promise<PersonEntity>;
    getPersonByNickname(nickname: string): Promise<PersonEntity | null>;
    getPersonByEmail(email: string): Promise<PersonEntity | null>;
}
