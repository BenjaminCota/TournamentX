export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .trim();
}

export function matchesSearch(query: string, ...values: unknown[]) {
  const term = normalizeSearchText(query);
  return !term || normalizeSearchText(values.join(' ')).includes(term);
}
