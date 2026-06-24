export const mockUsers = [
  { id: 1, name: 'Priya Sharma', email: 'priya@mavericks.io', role: 'Coordinator', status: 'Active', initials: 'PS', color: 'bg-emerald-500' },
  { id: 2, name: 'Rohan Anand', email: 'rohan@mavericks.io', role: 'Admin', status: 'Active', initials: 'RA', color: 'bg-red-500' },
  { id: 3, name: 'Meera K.', email: 'meera@mavericks.io', role: 'Coordinator', status: 'Active', initials: 'MK', color: 'bg-teal-500' },
  { id: 4, name: 'Sarah Chen', email: 'sarah@mavericks.io', role: 'Coordinator', status: 'Active', initials: 'SC', color: 'bg-blue-500' },
];

export const mockAuditLogs = [
  { id: 1, user: 'Priya Sharma', action: 'Created batch: AI Workshop 2026', timestamp: '2026-04-28 09:12:34', type: 'batch' },
  { id: 2, user: 'Priya Sharma', action: 'Uploaded 248 candidates to AI Workshop 2026', timestamp: '2026-04-28 09:18:55', type: 'upload' },
  { id: 3, user: 'Rohan Anand', action: 'Added user: Sarah Chen (Coordinator)', timestamp: '2026-04-27 14:22:10', type: 'user' },
  { id: 4, user: 'Priya Sharma', action: 'Generated 248 certificates for AI Workshop 2026', timestamp: '2026-04-28 10:05:41', type: 'certificate' },
  { id: 5, user: 'Priya Sharma', action: 'Sent bulk emails to 248 candidates', timestamp: '2026-04-28 10:30:12', type: 'email' },
  { id: 6, user: 'Rohan Anand', action: 'Updated system settings: Email service → SendGrid', timestamp: '2026-04-26 11:45:00', type: 'settings' },
  { id: 7, user: 'Sarah Chen', action: 'Sent reminder to 18 candidates in AI Workshop 2026', timestamp: '2026-04-28 15:02:33', type: 'reminder' },
  { id: 8, user: 'Meera K.', action: 'Downloaded batch report: Cloud Foundations Apr', timestamp: '2026-04-27 16:18:45', type: 'report' },
];

export const mockSettings = {
  emailService: 'SendGrid',
  fileStorage: 'AWS S3',
  linkedinReminderIntervalDays: 3,
  linkedinTracking: true,
  smtpHost: 'smtp.sendgrid.net',
  smtpPort: '587',
  smtpUser: 'apikey',
};
