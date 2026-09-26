const Medicine = require('../models/Medicine');
const { capitalizeWords } = require('./formatters');

const INITIAL_MEDICINES = [
  // Image 2 (Items 1 to 16)
  { name: 'Augmentin', dosage: '625 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Augmentin', dosage: '625 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Moxikind-CV', dosage: '625 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Moxikind-CV', dosage: '625 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Moxikind-CV', dosage: '375 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Moxikind-CV', dosage: '375 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Moxikind-CV Syrup', dosage: '200/28.5 mg', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'S. Moxikind-CV', dosage: '200/28.5 mg', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Moxikind-CV Forte Syrup', dosage: '400/57 mg', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'S. Moxikind-CV Forte', dosage: '400/57 mg', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Amoxicillin Syrup', dosage: '250 mg', defaultFrequency: '5ml-0-5ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'S. Amoxicillin', dosage: '250 mg', defaultFrequency: '5ml-0-5ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Amoxicillin', dosage: '500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'C. Amoxicillin', dosage: '500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Amoxicillin', dosage: '250 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Amoxicillin', dosage: '250 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Sporidex', dosage: '500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'C. Sporidex', dosage: '500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Cefixime', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Cefixime', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Macpod-CV', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },
  { name: 'T. Macpod-CV', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic' },

  { name: 'Metronidazole', dosage: '400 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic / Antiprotozoal' },
  { name: 'T. Metronidazole', dosage: '400 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic / Antiprotozoal' },

  { name: 'Metronidazole Syrup', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic / Antiprotozoal' },
  { name: 'S. Metronidazole', dosage: '200 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Antibiotic / Antiprotozoal' },

  { name: 'Zerodol-P', dosage: '100 mg / 325 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / NSAID' },
  { name: 'T. Zerodol-P', dosage: '100 mg / 325 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / NSAID' },

  { name: 'Zerodol-SP', dosage: '100 mg / 325 mg / 15 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Anti-inflammatory' },
  { name: 'T. Zerodol-SP', dosage: '100 mg / 325 mg / 15 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Anti-inflammatory' },

  { name: 'Zerodol-MR', dosage: '100 mg / 2 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Muscle Relaxant' },
  { name: 'T. Zerodol-MR', dosage: '100 mg / 2 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Muscle Relaxant' },

  // Image 3 (Items 17 to 32)
  { name: 'Ketorol-DT', dosage: '10 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / NSAID' },
  { name: 'T. Ketorol-DT', dosage: '10 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / NSAID' },

  { name: 'Ultracet', dosage: '37.5 mg / 325 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic' },
  { name: 'T. Ultracet', dosage: '37.5 mg / 325 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic' },

  { name: 'Flexon MR', dosage: '400 mg / 500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Muscle Relaxant' },
  { name: 'T. Flexon MR', dosage: '400 mg / 500 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Muscle Relaxant' },

  { name: 'Imol Plus', dosage: '400 mg / 325 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },
  { name: 'T. Imol Plus', dosage: '400 mg / 325 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },

  { name: 'Ibugesic Syrup', dosage: '100 mg / 5 ml', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },
  { name: 'S. Ibugesic', dosage: '100 mg / 5 ml', defaultFrequency: '3ml-0-3ml', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },

  { name: 'Ibuclin Junior', dosage: '100 mg / 125 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },
  { name: 'T. Ibuclin Junior', dosage: '100 mg / 125 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Analgesic / Antipyretic' },

  { name: 'A To Z', dosage: 'Multivitamin', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Multivitamin / Supplement' },
  { name: 'T. A To Z', dosage: 'Multivitamin', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Multivitamin / Supplement' },

  { name: 'Renerve Plus', dosage: 'Multivitamin', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Nerve Supplement / Vitamin' },
  { name: 'T. Renerve Plus', dosage: 'Multivitamin', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Nerve Supplement / Vitamin' },

  { name: 'Neurobion Forte', dosage: 'Vitamin B Complex', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Vitamin Supplement' },
  { name: 'T. Neurobion Forte', dosage: 'Vitamin B Complex', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Vitamin Supplement' },

  { name: 'SM Fibro', dosage: 'Antioxidant', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Antioxidant' },
  { name: 'C. SM Fibro', dosage: 'Antioxidant', defaultFrequency: '0-0-1', defaultDuration: '10 Days', defaultInstructions: 'After Food', category: 'Antioxidant' },

  { name: 'Valium', dosage: '5 mg', defaultFrequency: '0-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Anxiolytic / Sedative' },
  { name: 'T. Valium', dosage: '5 mg', defaultFrequency: '0-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Anxiolytic / Sedative' },

  { name: 'Anxit', dosage: '0.5 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Anxiolytic / Sedative' },
  { name: 'T. Anxit', dosage: '0.5 mg', defaultFrequency: 'S-0-S', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Anxiolytic / Sedative' },

  { name: 'Pantoprazole', dosage: '40 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },
  { name: 'T. Pantoprazole', dosage: '40 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },

  { name: 'Pan D', dosage: '40 mg / 30 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },
  { name: 'T. Pan D', dosage: '40 mg / 30 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },

  { name: 'Omez', dosage: '20 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },
  { name: 'T. Omez', dosage: '20 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },

  { name: 'Rabeprazole', dosage: '20 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },
  { name: 'T. Rabeprazole', dosage: '20 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Antacid / PPI' },

  // Image 1 (Items 33 to 39)
  { name: 'Chymoral Forte', dosage: '100,000 Armour Units', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Enzyme / Anti-inflammatory' },
  { name: 'T. Chymoral Forte', dosage: '100,000 Armour Units', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'Before Food', category: 'Enzyme / Anti-inflammatory' },

  { name: 'Wysolone', dosage: '5 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Corticosteroid' },
  { name: 'T. Wysolone', dosage: '5 mg', defaultFrequency: '1-0-1', defaultDuration: '3 Days', defaultInstructions: 'After Food', category: 'Corticosteroid' },

  { name: 'Mucopain', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Analgesic / Gel' },
  { name: 'O. Mucopain', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Analgesic / Gel' },

  { name: 'Metrohex Plus', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Antiseptic / Gel' },
  { name: 'O. Metrohex Plus', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Antiseptic / Gel' },

  { name: 'Dentogel', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Analgesic / Gel' },
  { name: 'O. Dentogel', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Analgesic / Gel' },

  { name: 'Heximetro', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Antiseptic / Gel' },
  { name: 'O. Heximetro', dosage: 'Oral Gel', defaultFrequency: 'Local Application', defaultDuration: '5 Days', defaultInstructions: 'Apply Locally', category: 'Topical Antiseptic / Gel' },

  { name: 'Stolin-R', dosage: 'Medicated Paste', defaultFrequency: 'Brush twice daily', defaultDuration: '15 Days', defaultInstructions: 'Use as directed', category: 'Toothpaste / Desensitizing' },
  { name: 'O. Stolin-R', dosage: 'Medicated Paste', defaultFrequency: 'Brush twice daily', defaultDuration: '15 Days', defaultInstructions: 'Use as directed', category: 'Toothpaste / Desensitizing' }
];

async function seedInitialMedicines() {
  try {
    for (const med of INITIAL_MEDICINES) {
      const cleanName = med.name.trim();
      const cleanDosage = (med.dosage || '').trim();

      const existing = await Medicine.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        dosage: { $regex: new RegExp(`^${cleanDosage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!existing) {
        await Medicine.create({
          ...med,
          name: capitalizeWords(cleanName),
          dosage: capitalizeWords(cleanDosage),
          isActive: true,
          isCustom: false,
        });
      }
    }
  } catch (err) {
    console.error('Failed to seed initial medicines:', err);
  }
}

/**
 * Register or update medicines from a prescription payload into the medicine database if not present
 */
async function registerMedicinesFromPrescription(medicines = []) {
  if (!Array.isArray(medicines) || medicines.length === 0) return;

  for (const item of medicines) {
    const rawName = item.medicine || item.name;
    if (!rawName || !rawName.trim()) continue;

    const cleanName = rawName.trim();
    const cleanDosage = (item.dosage || '').trim();

    try {
      const existing = await Medicine.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        dosage: { $regex: new RegExp(`^${cleanDosage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!existing) {
        await Medicine.create({
          name: capitalizeWords(cleanName),
          dosage: capitalizeWords(cleanDosage),
          defaultFrequency: item.frequency || '',
          defaultDuration: item.duration ? capitalizeWords(item.duration) : '',
          defaultInstructions: item.instructions ? capitalizeWords(item.instructions) : '',
          isActive: true,
          isCustom: true,
        });
      }
    } catch (err) {
      console.error(`Failed to register medicine "${cleanName}":`, err);
    }
  }
}

module.exports = {
  INITIAL_MEDICINES,
  seedInitialMedicines,
  registerMedicinesFromPrescription,
};
