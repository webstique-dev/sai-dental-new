/**
 * One-time migration script to transition patient phone fields:
 * - Renames legacy `phone` to `primaryPhone`
 * - Ensures `secondaryPhone` exists (default '')
 * - Drops any lingering unique indexes on phone / primaryPhone / secondaryPhone
 * - Recreates the text search index with primaryPhone and secondaryPhone
 *
 * Usage:
 *   node server/utils/migratePhoneField.js
 *   (or from the server directory: node utils/migratePhoneField.js)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic';

async function runMigration() {
  console.log('=====================================================');
  console.log(' Starting Patient Phone Field Migration');
  console.log(' MongoDB URI:', MONGODB_URI.replace(/\/\/.*@/, '//<redacted>@'));
  console.log('=====================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB successfully.');

    const db = mongoose.connection.db;
    const patientsCol = db.collection('patients');

    // 1. Inspect existing indexes
    console.log('\n1. Checking existing indexes on patients collection...');
    const existingIndexes = await patientsCol.indexes();
    console.log('Found indexes:', existingIndexes.map((idx) => `${idx.name} (${JSON.stringify(idx.key)}) ${idx.unique ? '[UNIQUE]' : ''}`).join('\n  - '));

    for (const idx of existingIndexes) {
      // Check if index is unique and covers phone, primaryPhone, or secondaryPhone
      const keys = Object.keys(idx.key || {});
      const hasPhoneKey = keys.some((k) => ['phone', 'primaryPhone', 'secondaryPhone'].includes(k));

      if (idx.unique && hasPhoneKey) {
        console.log(`\n⚠️  Dropping unique index: ${idx.name}`);
        await patientsCol.dropIndex(idx.name);
        console.log(`✓ Dropped unique index ${idx.name}`);
      }

      // Check for legacy text index containing old phone field
      if (idx.weights && (idx.weights.phone || idx.name.includes('phone_text'))) {
        console.log(`\nℹ️  Dropping old text index: ${idx.name}`);
        await patientsCol.dropIndex(idx.name);
        console.log(`✓ Dropped old text index ${idx.name}`);
      }
    }

    // 2. Migrate documents
    console.log('\n2. Migrating patient records...');
    const cursor = patientsCol.find({
      $or: [
        { phone: { $exists: true } },
        { primaryPhone: { $exists: false } },
        { secondaryPhone: { $exists: false } },
      ],
    });

    let count = 0;
    let modifiedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      count++;

      const legacyPhone = (doc.phone || '').toString().trim();
      const existingPrimary = (doc.primaryPhone || '').toString().trim();
      const existingSecondary = (doc.secondaryPhone || '').toString().trim();

      const newPrimary = existingPrimary || legacyPhone || '';
      const newSecondary = existingSecondary || '';

      const updateOp = {
        $set: {
          primaryPhone: newPrimary,
          secondaryPhone: newSecondary,
        },
      };

      if (doc.phone !== undefined) {
        updateOp.$unset = { phone: '' };
      }

      await patientsCol.updateOne({ _id: doc._id }, updateOp);
      modifiedCount++;
    }

    console.log(`✓ Checked ${count} candidate patient document(s).`);
    console.log(`✓ Successfully updated ${modifiedCount} patient record(s).`);

    // 3. Ensure updated Text Index exists
    console.log('\n3. Ensuring updated search text index...');
    try {
      await patientsCol.createIndex(
        {
          firstName: 'text',
          lastName: 'text',
          primaryPhone: 'text',
          secondaryPhone: 'text',
          opNumber: 'text',
        },
        { name: 'PatientSearchTextIndex' }
      );
      console.log('✓ Successfully created/verified PatientSearchTextIndex on (firstName, lastName, primaryPhone, secondaryPhone, opNumber).');
    } catch (err) {
      console.warn('⚠️ Text index note:', err.message);
    }

    console.log('\n=====================================================');
    console.log(' Migration complete!');
    console.log('=====================================================\n');
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Closed database connection.');
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
