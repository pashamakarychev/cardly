/** Uppercases the first character for display; leaves the rest unchanged. */
export function capitalizeWord(text) {
  if (text == null || text === '') {
    return text;
  }
  const value = String(text);
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
