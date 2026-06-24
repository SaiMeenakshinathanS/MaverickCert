# Maverick Certify — Frontend UI

A complete certification management platform frontend built with React + Vite + Tailwind CSS.

## Quick Start

```bash
cd maverick-certify
npm install
npm run dev
```

Open http://localhost:5173

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@maverick.com | admin123 |
| Coordinator | user@maverick.com | user123 |

Or use the **Quick Access** buttons on the login page.

## Pages & Routes

### Coordinator
| Route | Description |
|-------|-------------|
| `/dashboard` | Overview with stats, AI insight, batch table |
| `/batches` | All batches list |
| `/certificates` | Certificate viewer |
| `/create-batch` | 5-step batch creation wizard |
| `/template` | AI certificate template generator |
| `/email` | AI email generator + certificate generation |
| `/tracking` | Email delivery tracking table |
| `/linkedin` | LinkedIn posting monitor + reminder engine |
| `/reports` | Reports, history search, QR verification |

### Admin
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | System overview + activity feed |
| `/admin/users` | User management (add, edit role, disable) |
| `/admin/settings` | Email, storage, reminder configuration |
| `/admin/logs` | Full audit log table with filters |

## Tech Stack

- **React 18** + Vite
- **Tailwind CSS** (dark theme, custom design tokens)
- **React Router DOM v6** (protected routes, role-based access)
- **Lucide React** icons
- **Google Fonts**: DM Sans + Outfit + JetBrains Mono

## Project Structure

```
src/
├── components/
│   ├── index.jsx        # All reusable components
│   ├── Sidebar.jsx      # Navigation sidebar
│   └── ProtectedRoute.jsx
├── layouts/
│   └── index.jsx        # MainLayout, AdminLayout, AuthLayout
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Batches.jsx
│   ├── Certificates.jsx
│   ├── CreateBatch.jsx
│   ├── Template.jsx
│   ├── EmailGenerator.jsx
│   ├── EmailTracking.jsx
│   ├── LinkedIn.jsx
│   ├── Reports.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── UserManagement.jsx
│       ├── SystemSettings.jsx
│       └── AuditLogs.jsx
├── mock/
│   ├── data.js          # Coordinator mock data
│   └── adminData.js     # Admin mock data
├── services/
│   └── api.js           # Dummy API (all return mock data)
├── App.jsx
└── main.jsx
```
