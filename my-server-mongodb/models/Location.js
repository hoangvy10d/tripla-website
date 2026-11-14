const mongoose = require('mongoose');

const visualSearchLocationSchema = new mongoose.Schema(
  {
    landmark_name: { type: String, required: true, trim: true },
    formatted_address: { type: String, required: true, trim: true }
  },
  { collection: 'locations', strict: false, timestamps: true }
);

visualSearchLocationSchema.index({ landmark_name: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.VisualSearchLocation ||
  mongoose.model('VisualSearchLocation', visualSearchLocationSchema);