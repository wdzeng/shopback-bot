export function stringify(a: unknown): string {
  if (!a) {
    return '<none>'
  }
  if (typeof a === 'string') {
    return a
  } else {
    return JSON.stringify(a)
  }
}
