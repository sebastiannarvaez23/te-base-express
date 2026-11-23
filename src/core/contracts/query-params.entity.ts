export interface QueryParams {
    page: number;
    limit: number;
    offset: number;
    filters: { [key: string]: any };
    through?: { [key: string]: any };
}