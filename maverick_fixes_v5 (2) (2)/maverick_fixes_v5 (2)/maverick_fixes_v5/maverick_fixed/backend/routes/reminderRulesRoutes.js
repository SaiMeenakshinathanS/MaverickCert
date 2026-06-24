const express = require('express');
const router = express.Router();
const ReminderRules = require('../models/ReminderRules');
const { logActivity } = require('../utils/auditLogger');

// Default rules used when no DB record exists yet
const DEFAULT_RULES = {
  firstReminderAfter: 3,
  secondReminderAfter: 7,
  reminderInterval: 3,       // NEW default
  maximumReminders: 3,
  reminderTone: 'Friendly',
  autoClosePolicy: 'Never',
};

/**
 * GET /api/reminder-rules
 * Returns current reminder rules. Falls back to defaults if none saved yet.
 */
router.get('/', async (req, res) => {
  try {
    const rules = await ReminderRules.findOne().lean();
    // Backfill reminderInterval for older DB records that pre-date this field
    if (rules && rules.reminderInterval == null) {
      rules.reminderInterval = rules.firstReminderAfter || DEFAULT_RULES.reminderInterval;
    }
    res.json({ success: true, data: rules || DEFAULT_RULES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/reminder-rules
 * Upserts the single reminder rules record.
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstReminderAfter,
      secondReminderAfter,
      reminderInterval,         // NEW
      maximumReminders,
      reminderTone,
      autoClosePolicy,
      updatedBy,
    } = req.body;

    const update = {
      ...(firstReminderAfter  !== undefined && { firstReminderAfter:  Number(firstReminderAfter)  }),
      ...(secondReminderAfter !== undefined && { secondReminderAfter: Number(secondReminderAfter) }),
      ...(reminderInterval    !== undefined && { reminderInterval:    Number(reminderInterval)    }),  // NEW
      ...(maximumReminders    !== undefined && { maximumReminders:    Number(maximumReminders)    }),
      ...(reminderTone        !== undefined && { reminderTone                                     }),
      ...(autoClosePolicy     !== undefined && { autoClosePolicy                                  }),
      updatedBy: updatedBy || 'Admin',
      updatedAt: new Date(),
    };

    const saved = await ReminderRules.findOneAndUpdate(
      {},           // match the single doc
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    console.log('✓ Reminder rules saved:', saved);

    await logActivity({
      userName: updatedBy || 'Admin',
      action: 'Updated LinkedIn reminder rules',
      type: 'settings',
      meta: { ...saved },
    });

    res.json({ success: true, data: saved, message: 'Reminder rules saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
