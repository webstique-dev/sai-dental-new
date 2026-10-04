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

/**
 * Formats a doctor's name ensuring it always starts with "Dr. " exactly once.
 * Avoids duplicate prefixes (e.g. "Dr. John" -> "Dr. John", "Dr John" -> "Dr. John", "John" -> "Dr. John").
 * Handles doctor objects ({ name, ... } or { user: { name } }) or plain name strings.
 *
 * @param {Object|string} doctorOrName - Doctor object or name string
 * @param {string} [fallback='Dr. Doctor'] - Default fallback string if empty
 * @returns {string} Clean formatted name with single "Dr. " prefix
 */
export function formatDoctorName(doctorOrName, fallback = 'Dr. Doctor') {
  if (!doctorOrName) return fallback;

  let rawName = '';
  if (typeof doctorOrName === 'object') {
    rawName = doctorOrName.name || doctorOrName.doctorName || '';
    if (!rawName && doctorOrName.user) {
      rawName = typeof doctorOrName.user === 'string' ? doctorOrName.user : (doctorOrName.user.name || '');
    }
  } else {
    rawName = String(doctorOrName);
  }

  rawName = rawName.trim();
  if (!rawName) return fallback;

  if (rawName.toLowerCase() === 'unassigned') return 'Unassigned';
  if (rawName.toLowerCase() === 'unassigned doctor') return 'Unassigned Doctor';
  if (rawName.toLowerCase() === 'staff doctor') return 'Dr. Staff Doctor';

  // Strip any existing "Dr." / "Dr" / "DR." / "DR" prefixes
  const stripped = rawName.replace(/^(?:dr\.?|dr\b)\s*/gi, '').replace(/^(?:dr\.?|dr\b)\s*/gi, '').trim();
  if (!stripped) {
    return fallback;
  }

  const capitalized = capitalizeWords(stripped);
  return `Dr. ${capitalized}`;
}

/**
 * Formats a Date object or timestamp into a consistent display string with Date and Time.
 * E.g., "Sat, Sep 26, 2026 • 09:00 AM"
 *
 * @param {Date|string|number} dateInput
 * @param {string} [separator=' • ']
 * @returns {string}
 */
export function formatDateTimeDisplay(dateInput, separator = ' • ') {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  let h12 = hours % 12;
  if (h12 === 0) h12 = 12;
  const timeStr = `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
  return `${dateStr}${separator}${timeStr}`;
}

/**
 * Extracts 12-hour formatted time string from Date object or ISO string.
 * E.g., "09:30 AM"
 *
 * @param {Date|string|number} dateInput
 * @returns {string}
 */
export function formatTime12Hour(dateInput) {
  if (!dateInput) return '09:00 AM';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '09:00 AM';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  let h12 = hours % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Combines separate Date and Time inputs into a valid Date object.
 *
 * @param {Date|string} dateInput - Date string (YYYY-MM-DD) or Date object
 * @param {string} timeInput - Time string (e.g. "09:30 AM" or "14:30")
 * @returns {Date}
 */
export function combineDateAndTime(dateInput, timeInput) {
  let d = dateInput instanceof Date ? new Date(dateInput) : null;
  if (!d && typeof dateInput === 'string' && dateInput.trim()) {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const parts = dateInput.split('T')[0].split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      const parsed = Date.parse(dateInput);
      if (!isNaN(parsed)) d = new Date(parsed);
    }
  }
  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }

  let hours = 9;
  let minutes = 0;
  if (timeInput && typeof timeInput === 'string' && timeInput.trim()) {
    const clean = timeInput.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const digitsOnly = clean.replace(/[^0-9:]/g, '');
    const parts = digitsOnly.split(':');
    if (parts.length >= 1 && parts[0] !== '') {
      let h = parseInt(parts[0], 10);
      let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
      if (isNaN(m) || m < 0 || m > 59) m = 0;

      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      if (isNaN(h) || h < 0 || h > 23) h = 0;
      hours = h;
      minutes = m;
    }
  }

  d.setHours(hours, minutes, 0, 0);
  return d;
}

