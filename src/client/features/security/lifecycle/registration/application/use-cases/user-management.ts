import { config } from "dotenv";

import { hashPassword, passwordMatches } from "../../../../../../../core/passwords";
import { EncryptionUtil } from "../../../../../../../core/utils/encryption.util";
import { UserEntity } from "../../domain/user.entity";
import { UsersRepository } from "../../domain/repositories/users.repository";
import { HttpError } from "../../../../../../../core/utils/error.util";

config();

export class AddUserUseCase {
    constructor(private readonly users: UsersRepository) { }

    async execute(user: UserEntity): Promise<UserEntity | null> {
        user.password = await hashPassword(user.password!);
        return this.users.add(user);
    }
}

export class EditUserUseCase {
    constructor(private readonly users: UsersRepository) { }

    execute(id: string, user: UserEntity): Promise<UserEntity | null> {
        return this.users.edit(id, user);
    }
}

export class ReplaceUserPasswordUseCase {
    constructor(private readonly users: UsersRepository) { }

    execute(id: string, passwordHash: string, actorId: string): Promise<void> {
        return this.users.replacePassword(id, passwordHash, actorId);
    }
}

export class ValidateUserCredentialUseCase {
    constructor(
        private readonly users: UsersRepository,
        private readonly encryption: EncryptionUtil,
    ) { }

    async execute({ nickname, password }: Partial<UserEntity>): Promise<boolean> {
        const user = await this.users.getUserPasswordByNickname(nickname!);
        if (!user?.password) throw new HttpError("USER_001");
        return passwordMatches(password!, user.password, this.encryption);
    }
}

export class UserManagement {

    constructor(
        private readonly _userRepository: UsersRepository,
        private readonly _encryptedUtils: EncryptionUtil,
    ) { }

    add(user: UserEntity) {
        return new AddUserUseCase(this._userRepository).execute(user);
    }

    edit(id: string, user: UserEntity) {
        return new EditUserUseCase(this._userRepository).execute(id, user);
    }

    replacePassword(id: string, passwordHash: string, actorId: string) {
        return new ReplaceUserPasswordUseCase(this._userRepository).execute(id, passwordHash, actorId);
    }

    validateCredential(input: Partial<UserEntity>) {
        return new ValidateUserCredentialUseCase(this._userRepository, this._encryptedUtils).execute(input);
    }
}
