const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Queue name is required'],
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentServing: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: queue names unique per organization
queueSchema.index({ name: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('Queue', queueSchema);
