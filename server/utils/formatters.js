/**
 * Utility functions for string formatting and normalization across the server.
 */

/**
 * Capitalizes the first letter of every word in a string, respecting Unicode letters
 * and preserving numbers, punctuation, hyphens, brackets, etc.
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/(?:^|[^\p{L}\p{N}])\p{L}/gu, (match) => match.toUpperCase());
}

const capitalizeName = capitalizeWords;

function formatDoctorName(doctorOrName, fallback = 'Dr. Doctor') {
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

  const stripped = rawName.replace(/^(?:dr\.?|dr\b)\s*/gi, '').replace(/^(?:dr\.?|dr\b)\s*/gi, '').trim();
  if (!stripped) {
    return fallback;
  }

  const capitalized = capitalizeWords(stripped);
  return `Dr. ${capitalized}`;
}

module.exports = {
  capitalizeWords,
  capitalizeName,
  formatDoctorName,
};
