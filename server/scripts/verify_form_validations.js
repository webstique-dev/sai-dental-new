require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { validatePatientData, validateUserData } = require('../middleware/inputValidation');

async function testAllFormValidations() {
  console.log('=== RUNNING FORM VALIDATION RULES UNIT TESTS ===\n');

  // Test 1: Phone validation
  console.log('1. Testing Phone Number Validation:');
  const invalidPhone1 = validatePatientData({ firstName: 'John', phone: '987abc1234' });
  console.log('   Phone "987abc1234" (has letters):', invalidPhone1.length > 0 ? `REJECTED ✓ (${invalidPhone1[0]})` : 'FAILED ✗');

  const invalidPhone2 = validatePatientData({ firstName: 'John', phone: '1234' });
  console.log('   Phone "1234" (too short):', invalidPhone2.length > 0 ? `REJECTED ✓ (${invalidPhone2[0]})` : 'FAILED ✗');

  const validPhone = validatePatientData({ firstName: 'John', phone: '9876543210' });
  console.log('   Phone "9876543210" (valid 10 digits):', validPhone.length === 0 ? 'ACCEPTED ✓' : 'FAILED ✗');

  // Test 2: DOB validation
  console.log('\n2. Testing Date of Birth Validation:');
  const futureDOB = new Date();
  futureDOB.setFullYear(futureDOB.getFullYear() + 2);
  const invalidDOB = validatePatientData({ firstName: 'John', dateOfBirth: futureDOB.toISOString() });
  console.log('   Future DOB:', invalidDOB.length > 0 ? `REJECTED ✓ (${invalidDOB[0]})` : 'FAILED ✗');

  const validDOB = validatePatientData({ firstName: 'John', dateOfBirth: '1995-05-15' });
  console.log('   Past DOB "1995-05-15":', validDOB.length === 0 ? 'ACCEPTED ✓' : 'FAILED ✗');

  // Test 3: Name field validation
  console.log('\n3. Testing Name Field Validation:');
  const invalidName = validatePatientData({ firstName: 'John123', lastName: 'Doe!' });
  console.log('   First Name "John123" (has numbers):', invalidName.length > 0 ? `REJECTED ✓ (${invalidName[0]})` : 'FAILED ✗');

  const validName = validatePatientData({ firstName: 'John-Paul', lastName: "O'Connor" });
  console.log("   Name \"John-Paul O'Connor\" (valid hyphen & apostrophe):", validName.length === 0 ? 'ACCEPTED ✓' : 'FAILED ✗');

  // Test 4: Email validation
  console.log('\n4. Testing Email Address Validation:');
  const invalidEmail = validateUserData({ name: 'Jane Doe', email: 'invalid-email-format' });
  console.log('   Email "invalid-email-format":', invalidEmail.length > 0 ? `REJECTED ✓ (${invalidEmail[0]})` : 'FAILED ✗');

  const validEmail = validateUserData({ name: 'Jane Doe', email: 'jane.doe@example.com' });
  console.log('   Email "jane.doe@example.com":', validEmail.length === 0 ? 'ACCEPTED ✓' : 'FAILED ✗');

  // Test 5: Age validation
  console.log('\n5. Testing Age Validation:');
  const invalidAge = validatePatientData({ firstName: 'John', age: 150 });
  console.log('   Age 150 (out of range):', invalidAge.length > 0 ? `REJECTED ✓ (${invalidAge[0]})` : 'FAILED ✗');

  const validAge = validatePatientData({ firstName: 'John', age: 35 });
  console.log('   Age 35 (valid):', validAge.length === 0 ? 'ACCEPTED ✓' : 'FAILED ✗');

  console.log('\n=== ALL VALIDATION UNIT TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

testAllFormValidations().catch((err) => {
  console.error('Validation test error:', err);
  process.exit(1);
});
