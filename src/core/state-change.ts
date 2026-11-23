import { AuditEventModel } from "../client/features/logging/system/audit/infrastructure/models/audit-event.model";

export interface StateTrace {
    entity: string;
    entityId: string;
    action: string;
    actorId?: string | null;
}

interface TransactionHost {
    transaction<T>(work: (transaction: any) => Promise<T>): Promise<T>;
}

/** The state write and its trace commit together. The trace never carries a secret. */
export async function withStateChange<T>(
    host: TransactionHost | null | undefined,
    work: (transaction: any) => Promise<T>,
    trace: StateTrace,
): Promise<T> {
    if (!host) throw new Error("A state change needs a database transaction.");
    return host.transaction(async (transaction) => {
        const result = await work(transaction);
        await AuditEventModel.create({
            entity: trace.entity,
            entityId: trace.entityId,
            action: trace.action,
            actorId: trace.actorId ?? null,
        }, { transaction });
        return result;
    });
}
