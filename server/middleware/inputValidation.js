function validatePatientData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.firstName !== undefined) {
    if (!data.firstName || !data.firstName.toString().trim()) {
      errors.push('First Name is required.');
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.firstName.toString().trim())) {
      errors.push('First Name must contain letters, spaces, hyphens, or apostrophes only.');
    }
  }

  if (data.lastName && data.lastName.toString().trim()) {
    if (!/^[a-zA-Z\s'-]+$/.test(data.lastName.toString().trim())) {
      errors.push('Last Name must contain letters, spaces, hyphens, or apostrophes only.');
    }
  }

  if (!isUpdate || data.phone !== undefined) {
    if (!data.phone || !data.phone.toString().trim()) {
      errors.push('Phone number is required.');
    } else {
      const cleanPhone = data.phone.toString().trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        errors.push('Phone number must be exactly 10 digits.');
      }
    }
  }

  if (data.dateOfBirth || data.dob) {
    const dob = data.dateOfBirth || data.dob;
    const d = new Date(dob);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (isNaN(d.getTime())) {
      errors.push('Please enter a valid Date of Birth.');
    } else if (d > today) {
      errors.push('Date of Birth cannot be in the future.');
    }
  }

  if (data.age !== undefined && data.age !== null && data.age !== '') {
    const num = Number(data.age);
    if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > 120) {
      errors.push('Age must be a valid whole number between 0 and 120.');
    }
  }

  return errors;
}

function validateUserData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || !data.name.toString().trim()) {
      errors.push('Name is required.');
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.name.toString().trim())) {
      errors.push('Name must contain letters only.');
    }
  }

  if (!isUpdate || data.email !== undefined) {
    if (!data.email || !data.email.toString().trim()) {
      errors.push('Email address is required.');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.toString().trim())) {
        errors.push('Please enter a valid email address.');
      }
    }
  }

  if (data.phone && data.phone.toString().trim()) {
    const cleanPhone = data.phone.toString().trim();
    if (!/^\d+$/.test(cleanPhone) || cleanPhone.length !== 10) {
      errors.push('Phone number must be numbers only and exactly 10 digits long.');
    }
  }

  return errors;
}

module.exports = {
  validatePatientData,
  validateUserData,
};
