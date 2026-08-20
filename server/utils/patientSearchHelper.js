/**
 * Builds a MongoDB filter object for searching patients by:
 * 1. First Name
 * 2. Last Name
 * 3. Combined Full Name (FirstName + LastName)
 * 4. OP Number
 * 5. Phone Number
 *
 * Supports partial case-insensitive regex matching.
 */
function buildPatientSearchFilter(searchQuery) {
  if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
    return null;
  }
  const qStr = searchQuery.trim();
  const escaped = qStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  return {
    $or: [
      { firstName: regex },
      { lastName: regex },
      { phone: regex },
      { opNumber: regex },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ['$firstName', ' ', '$lastName'] },
            regex: escaped,
            options: 'i',
          },
        },
      },
    ],
  };
}

module.exports = { buildPatientSearchFilter };
