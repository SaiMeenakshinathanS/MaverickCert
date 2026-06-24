import { useState } from 'react';

// Badge component
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/20',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
    indigo: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/20',
  };
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Button component
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-surface-muted hover:bg-surface-border text-slate-300 border border-surface-border',
    ghost: 'hover:bg-surface-muted text-slate-400 hover:text-slate-200',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20',
    success: 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20',
    ai: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// Input component
export function Input({ label, placeholder, value, onChange, type = 'text', required, className = '', hint }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input-field"
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Card component
export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-surface-card border border-surface-border rounded-xl ${hover ? 'hover:border-indigo-500/30 transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  );
}

// PageHeader component
export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span>›</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-slate-300' : ''}>{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-semibold text-white font-display">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// Status dot
export function StatusDot({ status }) {
  const colors = {
    'Opened': 'bg-emerald-400',
    'Delivered': 'bg-blue-400',
    'Sent': 'bg-blue-400',
    'Failed': 'bg-red-400',
    'Bounced': 'bg-red-400',
    'Queued': 'bg-amber-400',
    'Not Sent': 'bg-slate-500',
    'Posted': 'bg-emerald-400',
    'Not posted': 'bg-red-400',
    'Reminded ×2': 'bg-amber-400',
    'Completed': 'bg-emerald-400',
    'In progress': 'bg-blue-400',
    'Archived': 'bg-slate-400',
    'Emails Sent': 'bg-blue-400',
    'Active': 'bg-emerald-400',
    'Inactive': 'bg-slate-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-500'} pulse-dot`} />;
}

// Avatar
export function Avatar({ name, color = 'bg-indigo-500', size = 'md' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-sm' };
  return (
    <div className={`${color} ${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, className = '' }) {
  return (
    <div className={`progress-bar w-full ${className}`}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

// Stepper
export function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            i + 1 === current
              ? 'bg-indigo-600 text-white'
              : i + 1 < current
              ? 'text-emerald-400'
              : 'text-slate-500'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              i + 1 < current ? 'bg-emerald-500 text-white' :
              i + 1 === current ? 'bg-white/20' : 'bg-surface-border'
            }`}>
              {i + 1 < current ? '✓' : i + 1}
            </span>
            {step}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 ${i + 1 < current ? 'bg-emerald-500' : 'bg-surface-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// AI Banner
export function AIBanner({ children }) {
  return (
    <div className="relative flex items-start gap-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-5 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
      <span className="ai-badge shrink-0 relative z-10">+ AI</span>
      <p className="text-sm text-indigo-200 relative z-10">{children}</p>
    </div>
  );
}

// Upload box
export function UploadBox({ onFile, fileName }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && onFile) onFile(file);
  };
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onFile) onFile(file);
  };
  return (
    <div
      className="border-2 border-dashed border-surface-border hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-surface-muted/30 hover:bg-indigo-500/5"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => document.getElementById('file-upload').click()}
    >
      <input id="file-upload" type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleChange} />
      {fileName ? (
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <span className="text-2xl">✓</span>
          <span className="font-medium text-sm">{fileName}</span>
        </div>
      ) : (
        <>
          <div className="text-3xl mb-3 text-slate-500">↑</div>
          <p className="text-sm text-slate-400 mb-1">Drag & drop your Excel file here</p>
          <p className="text-xs text-slate-500">Required columns: Name, Email, LinkedIn URL (optional)</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Icon — small inline SVG icon set used to decorate stat cards & headers
// ---------------------------------------------------------------------
const ICON_PATHS = {
  certificate: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  trendingUp: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  checkCircle: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  layers: (
    <>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </>
  ),
};

export function Icon({ name, className = 'w-5 h-5' }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

// ---------------------------------------------------------------------
// StatCard — themed metric card with an icon chip
// ---------------------------------------------------------------------
export function StatCard({ icon, accent = 'indigo', label, value, sub, color = 'text-white', loading, align = 'left' }) {
  const accents = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className={`stat-card ${align === 'center' ? 'text-center' : ''}`}>
      {align === 'center' ? (
        <>
          {icon && (
            <div className={`icon-chip mx-auto mb-2 ${accents[accent] || accents.indigo}`}>
              <Icon name={icon} className="w-4 h-4" />
            </div>
          )}
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        </>
      ) : (
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
          {icon && (
            <div className={`icon-chip ${accents[accent] || accents.indigo}`}>
              <Icon name={icon} className="w-4 h-4" />
            </div>
          )}
        </div>
      )}
      {loading ? (
        <div className={`h-8 w-20 bg-surface-border rounded animate-pulse mb-1 ${align === 'center' ? 'mx-auto' : ''}`} />
      ) : (
        <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Pagination — page navigation with a configurable "rows per page" select
// ---------------------------------------------------------------------
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  itemLabel = 'items',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, total);

  const pageNumbers = () => {
    const pages = [];
    const windowSize = 1;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - safePage) <= windowSize) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  };

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-surface-border">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="pagination-select"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="hidden sm:inline ml-1">
          {startItem}–{endItem} of {total} {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          className="pagination-btn"
          aria-label="Previous page"
        >
          ‹
        </button>
        {pageNumbers().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-600 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`pagination-btn ${p === safePage ? 'pagination-btn-active' : ''}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          className="pagination-btn"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// usePaginatedData — small helper hook for client-side pagination of arrays
// ---------------------------------------------------------------------
export function usePaginatedData(items, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const setPageSizeAndReset = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize: setPageSizeAndReset,
  };
}
