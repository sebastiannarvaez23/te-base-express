export function resetSubject(person: { user?: { nickname?: string | null } | null } | null): string | null {
    return person?.user?.nickname || null;
}
