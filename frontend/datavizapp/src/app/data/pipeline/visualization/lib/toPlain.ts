export const toPlain = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
