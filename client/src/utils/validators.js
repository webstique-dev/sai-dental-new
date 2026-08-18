export function validatePhone(phone, required = true) {
  if (!phone || !phone.toString().trim()) {
    if (required) return 'Phone number is required.';
    return null;
  }
  const cleanPhone = phone.toString().trim().replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    return 'Phone number must be exactly 10 digits.';
  }
  return null;
}

export function validateDOB(dob, required = false) {
  if (!dob) {
    if (required) return 'Date of Birth is required.';
    return null;
  }
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    return 'Please enter a valid Date of Birth.';
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d > today) {
    return 'Date of Birth cannot be in the future.';
  }
  return null;
}

export function validateEmail(email, required = false) {
  if (!email || !email.toString().trim()) {
    if (required) return 'Email address is required.';
    return null;
  }
  const cleanEmail = email.toString().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  return null;
}

export function validateName(name, fieldLabel = 'Name', required = false) {
  if (!name || !name.toString().trim()) {
    if (required) return `${fieldLabel} is required.`;
    return null;
  }
  const cleanName = name.toString().trim();
  if (!/^[a-zA-Z\s'-]+$/.test(cleanName)) {
    return `${fieldLabel} must contain letters, spaces, hyphens, or apostrophes only (no numbers or special characters).`;
  }
  if (cleanName.length > 50) {
    return `${fieldLabel} cannot exceed 50 characters.`;
  }
  return null;
}

export function validateAge(age, required = false) {
  if (age === undefined || age === null || age === '') {
    if (required) return 'Age is required.';
    return null;
  }
  const num = Number(age);
  if (isNaN(num) || !Number.isInteger(num)) {
    return 'Age must be a valid whole number.';
  }
  if (num < 0 || num > 120) {
    return 'Age must be between 0 and 120 years.';
  }
  return null;
}

export function validateNumericRange(val, fieldLabel = 'Value', min = 0, max = 1000000, required = false) {
  if (val === undefined || val === null || val === '') {
    if (required) return `${fieldLabel} is required.`;
    return null;
  }
  const num = Number(val);
  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number.`;
  }
  if (num < min || num > max) {
    return `${fieldLabel} must be between ${min} and ${max}.`;
  }
  return null;
}

export function validateSelect(val, fieldLabel = 'Option', required = true) {
  if (!val || !val.toString().trim()) {
    if (required) return `Please select a valid ${fieldLabel}.`;
  }
  return null;
}
