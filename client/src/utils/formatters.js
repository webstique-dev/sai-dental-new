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

/**
 * Capitalizes the first letter of every word across a string.
 * Preserves numbers, punctuation, special characters, and existing formatting.
 * E.g., "mahesh kumar" -> "Mahesh Kumar", "dental surgeon" -> "Dental Surgeon",
 * "root canal treatment" -> "Root Canal Treatment", "123 main st." -> "123 Main St."
 *
 * @param {string} str
 * @returns {string}
 */
export function capitalizeWords(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str.replace(/(?:^|[^\p{L}\p{N}])\p{L}/gu, (match) => match.toUpperCase());
}

/**
 * Capitalizes the first letter of each word in a name string.
 *
 * @param {string} str
 * @returns {string}
 */
export function capitalizeName(str) {
  return capitalizeWords(str);
}

/**
 * Returns formatted patient full name with first letter capitalized by default.
 * Supports patient object { firstName, lastName } or strings.
 *
 * @param {Object|string} patientOrFirst - Patient object or first name string
 * @param {string} [lastName=''] - Optional last name if first parameter is a string
 * @returns {string} Capitalized full name
 */
export function formatPatientFullName(patientOrFirst, lastName = '') {
  if (!patientOrFirst) return '';
  if (typeof patientOrFirst === 'object') {
    const first = capitalizeName(patientOrFirst.firstName || '');
    const last = capitalizeName(patientOrFirst.lastName || '');
    const combined = [first, last].filter(Boolean).join(' ');
    if (combined) return combined;
    return patientOrFirst.name ? capitalizeName(patientOrFirst.name) : '';
  }
  const first = capitalizeName(patientOrFirst || '');
  const last = capitalizeName(lastName || '');
  return [first, last].filter(Boolean).join(' ');
}

