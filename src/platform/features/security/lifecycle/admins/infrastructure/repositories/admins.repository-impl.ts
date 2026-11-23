import { AdminEntity } from "../../domain/admin.entity";
import { AdminsRepository } from "../../domain/repositories/admins.repository";
import { AdminModel } from "../models/admin.model";

export class AdminsRepositoryImpl implements AdminsRepository {
    findByUsername(username: string): Promise<AdminEntity | null> {
        return AdminModel.findOne({ where: { username } });
    }
}
