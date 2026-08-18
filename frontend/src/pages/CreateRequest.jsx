import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPurchaseRequest } from '../api/api.js';

const initialApprovers = [
  { name: '', email: '', role: 'MANAGER' },
  { name: '', email: '', role: 'FINANCE' },
  { name: '', email: '', role: 'DIRECTOR' },
];

export default function CreateRequest() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    requesterName: '',
    requesterEmail: '',
    approvers: initialApprovers,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateApprover(index, field, value) {
    setForm((current) => ({
      ...current,
      approvers: current.approvers.map(
        (approver, currentIndex) =>
          currentIndex === index
            ? {
                ...approver,
                [field]: value,
              }
            : approver,
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const result = await createPurchaseRequest({
        ...form,
        amount: Number(form.amount),
      });

      console.log('Purchase request created:', result);

      alert(
        'Solicitud creada correctamente. Los enlaces de aprobación fueron generados.',
      );

      navigate('/');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'No fue posible crear la solicitud.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <div className="page-header">
        <p className="eyebrow">NUEVO PROCESO</p>
        <h1>Crear solicitud de compra</h1>
        <p>
          Completa los datos de la compra y asigna los tres
          aprobadores requeridos.
        </p>
      </div>

      <form
        className="form-card"
        onSubmit={handleSubmit}
      >
        <div className="form-section">
          <h2>Información de la solicitud</h2>

          <div className="form-grid">
            <label className="field field-full">
              <span>Título</span>
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Ej. Equipos para desarrollo"
                required
              />
            </label>

            <label className="field field-full">
              <span>Descripción</span>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Describe el motivo de la compra..."
                rows="4"
                required
              />
            </label>

            <label className="field">
              <span>Monto (COP)</span>
              <input
                type="number"
                name="amount"
                min="1"
                value={form.amount}
                onChange={updateField}
                placeholder="5000000"
                required
              />
            </label>

            <label className="field">
              <span>Solicitante</span>
              <input
                name="requesterName"
                value={form.requesterName}
                onChange={updateField}
                placeholder="Nombre completo"
                required
              />
            </label>

            <label className="field field-full">
              <span>Email del solicitante</span>
              <input
                type="email"
                name="requesterEmail"
                value={form.requesterEmail}
                onChange={updateField}
                placeholder="solicitante@example.com"
                required
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Aprobadores</h2>

          <p className="section-description">
            Deben participar exactamente tres roles diferentes.
          </p>

          <div className="approver-form-list">
            {form.approvers.map((approver, index) => (
              <div
                className="approver-form"
                key={approver.role}
              >
                <div className="approver-number">
                  0{index + 1}
                </div>

                <div className="approver-role">
                  {approver.role}
                </div>

                <input
                  value={approver.name}
                  onChange={(event) =>
                    updateApprover(
                      index,
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Nombre completo"
                  required
                />

                <input
                  type="email"
                  value={approver.email}
                  onChange={(event) =>
                    updateApprover(
                      index,
                      'email',
                      event.target.value,
                    )
                  }
                  placeholder="correo@example.com"
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/')}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? 'Creando solicitud...'
              : 'Crear solicitud'}
          </button>
        </div>
      </form>
    </section>
  );
}
