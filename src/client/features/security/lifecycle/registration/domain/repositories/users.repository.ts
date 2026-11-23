import { UserEntity } from "../user.entity";

export interface UsersRepository {
    getUserPasswordByNickname(nickname: string): Promise<UserEntity | null>;
    getByNickname(nickname: string): Promise<UserEntity | null>;
    add(user: UserEntity): Promise<UserEntity>;
    edit(id: string, user: UserEntity): Promise<UserEntity>;
    replacePassword(id: string, passwordHash: string, actorId: string): Promise<void>;
}
