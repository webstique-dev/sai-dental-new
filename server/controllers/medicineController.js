const Medicine = require('../models/Medicine');
const { capitalizeWords } = require('../utils/formatters');

// GET /api/medicines?search=&category=
async function listMedicines(req, res, next) {
  try {
    const { search, category, limit } = req.query;
    const filter = { isActive: { $ne: false } };

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: regex },
        { dosage: regex },
        { category: regex },
      ];
    }

    let query = Medicine.find(filter).sort({ name: 1, dosage: 1 });
    if (limit && Number(limit) > 0) {
      query = query.limit(Number(limit));
    }

    const medicines = await query.exec();
    return res.json({ medicines });
  } catch (err) {
    next(err);
  }
}

// POST /api/medicines
async function createMedicine(req, res, next) {
  try {
    const { name, dosage, category, defaultFrequency, defaultDuration, defaultInstructions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Medicine name is required.' });
    }

    const cleanName = name.trim();
    const cleanDosage = (dosage || '').trim();

    // Check for existing duplicate (case-insensitive)
    let existing = await Medicine.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      dosage: { $regex: new RegExp(`^${cleanDosage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      return res.status(200).json({
        message: 'Medicine already exists in suggestions.',
        medicine: existing,
      });
    }

    const newMed = new Medicine({
      name: capitalizeWords(cleanName),
      dosage: capitalizeWords(cleanDosage),
      category: category ? capitalizeWords(category.trim()) : 'General',
      defaultFrequency: defaultFrequency || '',
      defaultDuration: defaultDuration ? capitalizeWords(defaultDuration.trim()) : '',
      defaultInstructions: defaultInstructions ? capitalizeWords(defaultInstructions.trim()) : '',
      isActive: true,
      isCustom: true,
    });

    await newMed.save();

    return res.status(201).json({
      message: 'Medicine suggestion saved successfully.',
      medicine: newMed,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMedicines,
  createMedicine,
};
