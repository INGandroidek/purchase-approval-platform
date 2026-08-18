import {
  describe,
  expect,
  it,
} from '@jest/globals';

import { Approver } from '../src/domain/entities/Approver.js';
import { PurchaseRequest } from '../src/domain/entities/PurchaseRequest.js';
import { ApprovalStatus } from '../src/domain/enums/ApprovalStatus.js';
import { PurchaseStatus } from '../src/domain/enums/PurchaseStatus.js';

import { ApproverRepository } from '../src/application/ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../src/application/ports/PurchaseRequestRepository.js';

import { ProcessApprovalDecision } from '../src/application/use-cases/ProcessApprovalDecision.js';

class InMemoryApproverRepository
  implements ApproverRepository
{
  private readonly approvers =
    new Map<string, Approver>();

  async saveMany(
    approvers: Approver[],
  ): Promise<void> {
    for (const approver of approvers) {
      this.approvers.set(
        approver.token,
        approver,
      );
    }
  }

  async findById(
    id: string,
  ): Promise<Approver | null> {
    return (
      [...this.approvers.values()].find(
        (approver) =>
          approver.id === id,
      ) ?? null
    );
  }

  async findByToken(
    token: string,
  ): Promise<Approver | null> {
    return (
      this.approvers.get(token) ?? null
    );
  }

  async findByRequestId(
    requestId: string,
  ): Promise<Approver[]> {
    return [
      ...this.approvers.values(),
    ].filter(
      (approver) =>
        approver.requestId === requestId,
    );
  }

  async update(
    approver: Approver,
  ): Promise<void> {
    this.approvers.set(
      approver.token,
      approver,
    );
  }
}

class InMemoryPurchaseRequestRepository
  implements PurchaseRequestRepository
{
  private readonly requests =
    new Map<
      string,
      {
        purchaseRequest: PurchaseRequest;
        approvers: Approver[];
      }
    >();

  async save(
    purchaseRequest: PurchaseRequest,
    approvers: Approver[],
  ): Promise<void> {
    this.requests.set(
      purchaseRequest.id,
      {
        purchaseRequest,
        approvers,
      },
    );
  }

  async update(
    purchaseRequest: PurchaseRequest,
  ): Promise<void> {
    const existing =
      this.requests.get(
        purchaseRequest.id,
      );

    this.requests.set(
      purchaseRequest.id,
      {
        purchaseRequest,
        approvers:
          existing?.approvers ?? [],
      },
    );
  }

  async findById(
    id: string,
  ): Promise<{
    purchaseRequest: PurchaseRequest;
    approvers: Approver[];
  } | null> {
    return (
      this.requests.get(id) ?? null
    );
  }

  async findByRequesterEmail(
    email: string,
  ): Promise<PurchaseRequest[]> {
    return [
      ...this.requests.values(),
    ]
      .filter(
        ({ purchaseRequest }) =>
          purchaseRequest.requesterEmail ===
          email,
      )
      .map(
        ({ purchaseRequest }) =>
          purchaseRequest,
      );
  }
}

function createPurchaseRequest(
  status: PurchaseStatus =
    PurchaseStatus.PENDING,
): PurchaseRequest {
  return PurchaseRequest.create({
    id: 'request-123',
    title: 'Compra de computadores',
    description:
      'Compra de equipos para desarrollo',
    amount: 5000000,
    requesterName: 'Diego',
    requesterEmail:
      'diego@example.com',
    status,
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
  });
}

function createApprover(
  status: ApprovalStatus =
    ApprovalStatus.PENDING,
): Approver {
  return Approver.create({
    id: 'approver-123',
    requestId: 'request-123',
    name: 'Carlos',
    email: 'carlos@example.com',
    role: 'FINANCE',
    token: 'token-123',
    otp: '123456',
    otpExpiresAt:
      new Date(
        Date.now() + 180000,
      ).toISOString(),
    status,

    // El OTP se considera validado para
    // los tests que prueban exclusivamente
    // la decisión de aprobación.
    otpVerifiedAt:
      new Date().toISOString(),
  });
}

function createUseCase() {
  const approverRepository =
    new InMemoryApproverRepository();

  const purchaseRequestRepository =
    new InMemoryPurchaseRequestRepository();

  const useCase =
    new ProcessApprovalDecision(
      approverRepository,
      purchaseRequestRepository,
    );

  return {
    approverRepository,
    purchaseRequestRepository,
    useCase,
  };
}

describe('ProcessApprovalDecision', () => {
  it('should approve a pending approval', async () => {
    const {
      approverRepository,
      purchaseRequestRepository,
      useCase,
    } = createUseCase();

    const request =
      createPurchaseRequest();

    const approver =
      createApprover();

    await purchaseRequestRepository.save(
      request,
      [approver],
    );

    await approverRepository.saveMany([
      approver,
    ]);

    const result =
      await useCase.execute(
        'token-123',
        'APPROVED',
      );

    expect(result.approverId).toBe(
      'approver-123',
    );

    expect(result.requestId).toBe(
      'request-123',
    );

    expect(result.status).toBe(
      ApprovalStatus.SIGNED,
    );

    expect(result.signedAt).toBeDefined();

    expect(
      result.purchaseRequestStatus,
    ).toBe(PurchaseStatus.COMPLETED);

    const updatedRequest =
      await purchaseRequestRepository.findById(
        'request-123',
      );

    expect(
      updatedRequest?.purchaseRequest.status,
    ).toBe(PurchaseStatus.COMPLETED);
  });

  it('should reject a pending approval', async () => {
    const {
      approverRepository,
      purchaseRequestRepository,
      useCase,
    } = createUseCase();

    const request =
      createPurchaseRequest();

    const approver =
      createApprover();

    await purchaseRequestRepository.save(
      request,
      [approver],
    );

    await approverRepository.saveMany([
      approver,
    ]);

    const result =
      await useCase.execute(
        'token-123',
        'REJECTED',
      );

    expect(result.approverId).toBe(
      'approver-123',
    );

    expect(result.requestId).toBe(
      'request-123',
    );

    expect(result.status).toBe(
      ApprovalStatus.REJECTED,
    );

    expect(result.signedAt).toBeDefined();

    expect(
      result.purchaseRequestStatus,
    ).toBe(PurchaseStatus.REJECTED);

    const updatedRequest =
      await purchaseRequestRepository.findById(
        'request-123',
      );

    expect(
      updatedRequest?.purchaseRequest.status,
    ).toBe(PurchaseStatus.REJECTED);
  });

  it('should reject an empty token', async () => {
    const {
      useCase,
    } = createUseCase();

    await expect(
      useCase.execute(
        '',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'Approver token is required',
    );
  });

  it('should reject an invalid token', async () => {
    const {
      useCase,
    } = createUseCase();

    await expect(
      useCase.execute(
        'invalid-token',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'Invalid approver token',
    );
  });

  it('should reject an invalid decision', async () => {
    const {
      useCase,
    } = createUseCase();

    await expect(
      useCase.execute(
        'token-123',
        'INVALID' as any,
      ),
    ).rejects.toThrow(
      'Invalid approval decision',
    );
  });

  it('should reject a decision when OTP has not been verified', async () => {
    const {
      approverRepository,
      purchaseRequestRepository,
      useCase,
    } = createUseCase();

    const request =
      createPurchaseRequest();

    const approver =
      Approver.create({
        id: 'approver-123',
        requestId: 'request-123',
        name: 'Carlos',
        email: 'carlos@example.com',
        role: 'FINANCE',
        token: 'token-123',
        otp: '123456',
        otpExpiresAt:
          new Date(
            Date.now() + 180000,
          ).toISOString(),
        status: ApprovalStatus.PENDING,
      });

    await purchaseRequestRepository.save(
      request,
      [approver],
    );

    await approverRepository.saveMany([
      approver,
    ]);

    await expect(
      useCase.execute(
        'token-123',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'OTP verification is required',
    );
  });

  it('should reject a decision for an approval that was already processed', async () => {
    const {
      approverRepository,
      purchaseRequestRepository,
      useCase,
    } = createUseCase();

    const request =
      createPurchaseRequest();

    const approver =
      createApprover(
        ApprovalStatus.SIGNED,
      );

    await purchaseRequestRepository.save(
      request,
      [approver],
    );

    await approverRepository.saveMany([
      approver,
    ]);

    await expect(
      useCase.execute(
        'token-123',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'Approval decision has already been made',
    );
  });
});