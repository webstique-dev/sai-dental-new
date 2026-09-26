const mongoose = require('mongoose');
const { capitalizeWords } = require('../utils/formatters.js');

const toothConditionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: capitalizeWords,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    color: {
      type: String,
      default: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

toothConditionSchema.index({ name: 1 }, { unique: false });

module.exports = mongoose.model('ToothCondition', toothConditionSchema);
