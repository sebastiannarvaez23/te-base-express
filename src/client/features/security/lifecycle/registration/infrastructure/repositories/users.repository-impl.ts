import { Optional, UniqueConstraintError } from "sequelize";

import { withStateChange } from "../../../../../../../core/state-change";
import { HttpError } from "../../../../../../../core/utils/error.util";
import { UserEntity } from "../../domain/user.entity";
import { UserModel } from "../models/user.model";
import { UsersRepository } from "../../domain/repositories/users.repository";

export class UsersRepositoryImpl implements UsersRepository {

    async getUserPasswordByNickname(nickname: string): Promise<UserModel | null> {
        try {
            return await UserModel.findOne(
                {
                    where: { nickname }
                });
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw error;
            }
            throw new HttpError("SRV_001");
        }
    }

    async getByNickname(nickname: string): Promise<UserModel | null> {
        try {
            return await UserModel.findOne(
                {
                    where: { nickname },
                    attributes: { exclude: ['password'] }
                });
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw error;
            }
            throw new HttpError("SRV_001");
        }
    }

    async add(user: UserEntity): Promise<UserModel> {
        try {
            return await UserModel.create(user as Optional<any, string>);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw error;
            }
            throw new HttpError("SRV_001");
        }
    }

    async edit(id: string, user: UserEntity): Promise<UserModel> {
        try {
            const [affectRows, editedUser] = await UserModel.update(
                user as Optional<any, string>, {
                where: {
                    id: id,
                },
                returning: true
            });
            if (!editedUser[0]) throw new HttpError("USER_001")
            return editedUser[0];
        } catch (error) {
            throw error;
        }
    }

    async replacePassword(id: string, passwordHash: string, actorId: string): Promise<void> {
        await withStateChange(UserModel.sequelize, async (transaction) => {
            const [count] = await UserModel.update(
                { password: passwordHash },
                { where: { id }, transaction },
            );
            if (!count) throw new HttpError("USER_001");
        }, { entity: "User", entityId: id, action: "PASSWORD_RESET", actorId });
    }
}