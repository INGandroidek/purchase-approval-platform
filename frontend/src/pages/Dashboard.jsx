import React from 'react';
import { Link } from 'react-router-dom';

const demoRequests = [
  {
    id: 'demo-1',
    title: 'Solicitud de compra',
    amount: 8500000,
    status: 'PENDING',
    approvers: [
      { name: 'Carlos Ramirez', status: 'SIGNED' },
      { name: 'Laura Gomez', status: 'PENDING' },
      { name: 'Andres Martinez', status: 'PENDING' },
    ],
  },
];

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function Status({ status }) {
  const labels = {
    PENDING: 'Pendiente',
    SIGNED: 'Firmado',
    REJECTED: 'Rechazado',
    COMPLETED: 'Completada',
  };

  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}

export default function Dashboard() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">PANEL DEL SOLICITANTE</p>
          <h1>Mis solicitudes</h1>
          <p className="hero-description">
            Supervisa el avance de tus solicitudes de compra
            y sus aprobaciones.
          </p>
        </div>

        <Link to="/create" className="primary-button">
          + Nueva solicitud
        </Link>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total solicitudes</span>
          <strong>1</strong>
        </div>

        <div className="stat-card">
          <span>Pendientes</span>
          <strong>1</strong>
        </div>

        <div className="stat-card">
          <span>Completadas</span>
          <strong>0</strong>
        </div>
      </section>

      <section className="requests-section">
        <div className="section-heading">
          <div>
            <h2>Solicitudes recientes</h2>
            <p>Estado actual de cada proceso de aprobación.</p>
          </div>
        </div>

        {demoRequests.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="request-main">
              <div>
                <p className="request-label">SOLICITUD</p>
                <h3>{request.title}</h3>
                <p className="request-id">
                  ID: {request.id}
                </p>
              </div>

              <div className="request-amount">
                {money.format(request.amount)}
              </div>

              <Status status={request.status} />
            </div>

            <div className="approval-list">
              {request.approvers.map((approver) => (
                <div
                  className="approval-row"
                  key={approver.name}
                >
                  <div className="avatar">
                    {approver.name.charAt(0)}
                  </div>

                  <span>{approver.name}</span>

                  <Status status={approver.status} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
