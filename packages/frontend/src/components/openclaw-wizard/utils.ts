export function getOne<T>(val: T | T[]): T {
    return Array.isArray(val) ? val[0] : val;
}
