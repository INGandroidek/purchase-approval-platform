import React from 'react';

const labels = {
  PENDING: 'Pendiente',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  COMPLETED: 'Completada',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`status status-${status?.toLowerCase()}`}>
      <span className="status-dot" />
      {labels[status] || status}
    </span>
  );
}
