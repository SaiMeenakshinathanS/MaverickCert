const mongoose = require('mongoose');

/**
 * ReminderRules Schema
 * Only ONE document should exist — always upserted, never duplicated.
 */
const reminderRulesSchema = new mongoose.Schema(
  {
    firstReminderAfter: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
      default: 3,
    },
    secondReminderAfter: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
      default: 7,
    },
    // NEW: interval (days) between each reminder after the second one
    reminderInterval: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
      default: 3,
    },
    maximumReminders: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 3,
    },
    reminderTone: {
      type: String,
      enum: ['Friendly', 'Formal', 'Concise'],
      default: 'Friendly',
    },
    autoClosePolicy: {
      type: String,
      enum: ['Never', 'After 30 days', 'After 60 days'],
      default: 'Never',
    },
    updatedBy: {
      type: String,
      default: 'Admin',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const ReminderRules = mongoose.model('ReminderRules', reminderRulesSchema);

module.exports = ReminderRules;
