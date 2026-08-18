import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getApprovalByToken,
  validateOtp,
  processDecision,
} from '../api/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Approval() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('approver_token');

  const [approval, setApproval] = useState(null);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadApproval() {
      if (!token) {
        setError('No se encontró el token de aprobación.');
        setLoading(false);
        return;
      }

      try {
        const data = await getApprovalByToken(token);
        setApproval(data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'El enlace de aprobación no es válido.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadApproval();
  }, [token]);

  async function handleOtp(event) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await validateOtp(token, otp);
      setVerified(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'OTP inválido o expirado.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(decision) {
    setError('');
    setProcessing(true);

    try {
      const data = await processDecision(
        token,
        decision,
      );

      setResult(data);

      setApproval((current) => ({
        ...current,
        approver: {
          ...current.approver,
          status: data.status,
          signedAt: data.signedAt,
        },
        request: {
          ...current.request,
          status: data.purchaseRequestStatus,
        },
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible procesar la decisión.',
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading && !approval) {
    return (
      <div className="center-state">
        <div className="spinner" />
        <p>Cargando solicitud...</p>
      </div>
    );
  }

  if (error && !approval) {
    return (
      <div className="center-state">
        <div className="error-icon">!</div>
        <h2>Enlace no disponible</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <section className="approval-page">
        <div className="otp-card">
          <div className="security-icon">?</div>

          <p className="eyebrow">APROBACIÓN SEGURA</p>

          <h1>Verifica tu identidad</h1>

          <p>
            Hola <strong>{approval?.approver.name}</strong>.
            Ingresa el código OTP para consultar los detalles
            de esta solicitud.
          </p>

          <form onSubmit={handleOtp}>
            <label className="field">
              <span>Código OTP</span>
              <input
                className="otp-input"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(
                      /\D/g,
                      '',
                    ),
                  )
                }
                placeholder="000000"
                required
              />
            </label>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="primary-button full-button"
              type="submit"
              disabled={loading || otp.length !== 6}
            >
              {loading
                ? 'Verificando...'
                : 'Verificar código'}
            </button>
          </form>

          <small>
            El código es válido durante 3 minutos.
          </small>
        </div>
      </section>
    );
  }

  const isDecided =
    approval?.approver.status !== 'PENDING' ||
    result;

  return (
    <section className="approval-page">
      <div className="approval-detail">
        <div className="approval-header">
          <div>
            <p className="eyebrow">SOLICITUD DE COMPRA</p>
            <h1>{approval.request.title}</h1>
          </div>

          <StatusBadge
            status={
              result?.purchaseRequestStatus ||
              approval.request.status
            }
          />
        </div>

        <div className="amount-display">
          ${approval.request.amount.toLocaleString('es-CO')}
          <span>COP</span>
        </div>

        <div className="detail-grid">
          <div>
            <span>Solicitante</span>
            <strong>
              {approval.request.requesterName}
            </strong>
          </div>

          <div>
            <span>Email</span>
            <strong>
              {approval.request.requesterEmail}
            </strong>
          </div>

          <div>
            <span>Aprobador</span>
            <strong>{approval.approver.name}</strong>
          </div>

          <div>
            <span>Rol</span>
            <strong>{approval.approver.role}</strong>
          </div>
        </div>

        <div className="description-box">
          <span>Descripción</span>
          <p>{approval.request.description}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!isDecided && (
          <div className="decision-actions">
            <button
              className="reject-button"
              onClick={() =>
                handleDecision('REJECTED')
              }
              disabled={processing}
            >
              Rechazar
            </button>

            <button
              className="primary-button"
              onClick={() =>
                handleDecision('APPROVED')
              }
              disabled={processing}
            >
              {processing
                ? 'Procesando...'
                : 'Aprobar solicitud'}
            </button>
          </div>
        )}

        {result && (
          <div className="success-message">
            <strong>
              {result.status === 'SIGNED'
                ? 'Aprobación registrada correctamente.'
                : 'Solicitud rechazada.'}
            </strong>

            <p>
              Tu decisión ha sido registrada con fecha y
              hora.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
