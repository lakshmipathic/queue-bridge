const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: Number,
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Queue',
      required: [true, 'Queue is required'],
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'skipped'],
      default: 'waiting',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment tokenNumber per queue before saving
tokenSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastToken = await this.constructor
      .findOne({ queueId: this.queueId })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    this.tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;
  }
  next();
});

tokenSchema.index({ queueId: 1, tokenNumber: 1 });
tokenSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Token', tokenSchema);
