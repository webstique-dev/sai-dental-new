/**
 * Formats a numeric or string age into a clean string representation.
 * E.g., 30 -> "30", 4.5 -> "4.5", 3.567 -> "3.6", null/empty -> ""
 * Trims unnecessary trailing zeroes (e.g. 30.0 -> 30)
 *
 * @param {number|string|null|undefined} age - The age value to format
 * @param {string} [suffix=''] - Optional suffix like 'yrs' or 'y'
 * @returns {string} Formatted age string
 */
export function formatAge(age, suffix = '') {
  if (age === undefined || age === null || age === '' || isNaN(age)) {
    return '';
  }
  const num = Math.round(Number(age) * 10) / 10;
  if (isNaN(num)) return '';
  
  const formatted = num.toString();
  if (!suffix) return formatted;
  return `${formatted}${suffix.startsWith(' ') || suffix === 'y' ? suffix : ` ${suffix}`}`;
}
