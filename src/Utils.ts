export function deepCopy<T>(o: any): T {
    return JSON.parse(JSON.stringify(o));
}
