const Treatment = require('../models/Treatment');

// GET /api/treatments?active=&search=&category=
async function listTreatments(req, res, next) {
  try {
    const { active, search, category } = req.query;
    const filter = {};

    if (active !== undefined && active !== '') {
      filter.isActive = active === 'true' || active === '1';
    }

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { category: regex }];
    }

    const treatments = await Treatment.find(filter).sort({ category: 1, name: 1 });
    return res.json({ treatments });
  } catch (err) {
    next(err);
  }
}

// POST /api/treatments (Admin Only)
async function createTreatment(req, res, next) {
  try {
    const { name, code, category, description, defaultCost, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Treatment name is required.' });
    }

    const treatment = new Treatment({
      name: name.trim(),
      code: code ? code.trim() : '',
      category: category ? category.trim() : 'General',
      description: description ? description.trim() : '',
      defaultCost: Number(defaultCost) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await treatment.save();

    return res.status(201).json({
      message: 'Treatment catalog item created successfully',
      treatment,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/treatments/:id (Admin Only)
async function updateTreatment(req, res, next) {
  try {
    const { name, code, category, description, defaultCost, isActive } = req.body;

    const treatment = await Treatment.findById(req.params.id);
    if (!treatment) {
      return res.status(404).json({ message: 'Treatment item not found.' });
    }

    if (name !== undefined) treatment.name = name.trim();
    if (code !== undefined) treatment.code = code.trim();
    if (category !== undefined) treatment.category = category.trim();
    if (description !== undefined) treatment.description = description.trim();
    if (defaultCost !== undefined) treatment.defaultCost = Number(defaultCost);
    if (isActive !== undefined) treatment.isActive = Boolean(isActive);

    await treatment.save();

    return res.json({
      message: 'Treatment catalog item updated successfully',
      treatment,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTreatments,
  createTreatment,
  updateTreatment,
};
