const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TiffinEntrySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format "YYYY-MM-DD"
  time: { type: String, required: true }, // Format "HH:MM"
  status: { type: String, enum: ['taken', 'skipped', 'pending'], default: 'pending' },
  reason: { type: String, default: '' },
   notificationToken: { type: String }
});

const MonthlyHistorySchema = new mongoose.Schema({
  month: { type: String, required: true }, // Format "YYYY-MM"
  entries: [TiffinEntrySchema]
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  
  // User's tiffin settings
  settings: {
    messName: { type: String, default: '' },
    pricePerTiffin: { type: Number, default: 0 },
    timesPerDay: { type: Number, default: 1 },
    notificationTimes: { type: [String], default: [] }, // Array of "HH:MM"
    timezone: { type: String }
  },

  // For push notifications
  pushSubscription: { type: Object },

  // Tiffin history
  tiffinHistory: [MonthlyHistorySchema]

}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;