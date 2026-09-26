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

module.exports = {
  capitalizeWords,
  capitalizeName,
};
