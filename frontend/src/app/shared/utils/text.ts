/** Minúsculas e sem acentos, para comparação de buscas. */
export function normalizeSearchText(text: string): string {
  return text
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
