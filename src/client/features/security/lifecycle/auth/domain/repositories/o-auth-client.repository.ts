import { OAuthClientEntity } from "../oauth-client.entity";

export interface IOAuthClientRepository {
    findByClientName(clientId: string): Promise<OAuthClientEntity | null>;
    addMicroservice(credential: { name: string, secret: string }): Promise<OAuthClientEntity | null>;
}
