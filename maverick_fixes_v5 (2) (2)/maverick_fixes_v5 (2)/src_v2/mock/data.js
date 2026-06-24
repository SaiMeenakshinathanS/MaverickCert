// Mock data for Maverick Certify

export const mockBatches = [
  {
    id: 'MCB-20260422-087',
    name: 'AI Workshop 2026',
    event: 'AI Workshop 2026',
    date: 'Apr 22, 2026',
    organization: 'Mavericks Inc.',
    total: 248,
    posted: 74,
    pending: 174,
    completion: 30,
    status: 'In progress',
    emailStatus: 'Emails Sent',
  },
  {
    id: 'MCB-20260415-062',
    name: 'Cloud Foundations Apr',
    event: 'Cloud Foundations Apr',
    date: 'Apr 15, 2026',
    organization: 'Mavericks Inc.',
    total: 312,
    posted: 275,
    pending: 37,
    completion: 88,
    status: 'Completed',
    emailStatus: 'Completed',
  },
  {
    id: 'MCB-20260330-041',
    name: 'Leadership Lab Mar',
    event: 'Leadership Lab Mar',
    date: 'Mar 30, 2026',
    organization: 'Mavericks Inc.',
    total: 680,
    posted: 385,
    pending: 295,
    completion: 57,
    status: 'Archived',
    emailStatus: 'Completed',
  },
];

export const mockCandidates = [
  { id: 1, name: 'Arun Krishnamurthy', email: 'arun@co.io', linkedin: 'https://linkedin.com/in/arun', emailStatus: 'Opened', linkedinStatus: 'Not posted', day: 4, reminders: 1 },
  { id: 2, name: 'Meera Subramaniam', email: 'meera@co.io', linkedin: 'https://linkedin.com/in/meera', emailStatus: 'Delivered', linkedinStatus: 'Reminded ×2', day: 8, reminders: 2 },
  { id: 3, name: 'Rahul Menon', email: 'rahul@co.io', linkedin: '', emailStatus: 'Bounced', linkedinStatus: 'Not posted', day: 0, reminders: 0 },
  { id: 4, name: 'Divya Nair', email: 'divya@co.io', linkedin: 'https://linkedin.com/in/divya', emailStatus: 'Queued', linkedinStatus: 'Posted', day: 2, reminders: 0 },
  { id: 5, name: 'Priya Ramachandran', email: 'priya.r@example.com', linkedin: '', emailStatus: 'Opened', linkedinStatus: 'Posted', day: 5, reminders: 0 },
  { id: 6, name: 'Rohan Kumar', email: 'rohan.k@example.com', linkedin: '', emailStatus: 'Opened', linkedinStatus: 'Not posted', day: 3, reminders: 1 },
  { id: 7, name: 'Aisha Sharma', email: 'aisha.s@example.com', linkedin: '', emailStatus: 'Delivered', linkedinStatus: 'Not posted', day: 6, reminders: 1 },
  { id: 8, name: 'Meera Joshi', email: 'meera.j@example.com', linkedin: '', emailStatus: 'Failed', linkedinStatus: 'Not posted', day: 0, reminders: 0 },
];

export const mockStats = {
  totalCertificates: 1248,
  emailsSent: 1186,
  linkedinPosts: 743,
  pendingUsers: 443,
  completionRate: 59,
};
