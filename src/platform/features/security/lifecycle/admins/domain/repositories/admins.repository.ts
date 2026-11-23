import { AdminEntity } from "../admin.entity";

export interface AdminsRepository {
    findByUsername(username: string): Promise<AdminEntity | null>;
}
