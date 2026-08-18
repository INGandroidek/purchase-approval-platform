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

import { GetApprovalByToken } from '../src/application/use-cases/GetApprovalByToken.js';

class InMemoryApproverRepository
  implements ApproverRepository
{
  private readonly approvers = new Map<
    string,
    Approver
  >();

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
  private readonly requests = new Map<
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

  async update(
    purchaseRequest: PurchaseRequest,
  ): Promise<void> {
    const existing =
      this.requests.get(
        purchaseRequest.id,
      );

    if (!existing) {
      throw new Error(
        'Purchase request not found',
      );
    }

    this.requests.set(
      purchaseRequest.id,
      {
        ...existing,
        purchaseRequest,
      },
    );
  }
}

describe('GetApprovalByToken', () => {
  it('should return approval details for a valid token', async () => {
    const approverRepository =
      new InMemoryApproverRepository();

    const purchaseRequestRepository =
      new InMemoryPurchaseRequestRepository();

    const request =
      PurchaseRequest.create({
        id: 'request-123',
        title: 'Compra de computadores',
        description:
          'Compra de equipos para desarrollo',
        amount: 5000000,
        requesterName: 'Diego',
        requesterEmail:
          'diego@example.com',
        status: PurchaseStatus.PENDING,
        createdAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString(),
      });

    const approver =
      Approver.create({
        id: 'approver-123',
        requestId: request.id,
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

    const useCase =
      new GetApprovalByToken(
        approverRepository,
        purchaseRequestRepository,
      );

    const result =
      await useCase.execute(
        'token-123',
      );

    expect(result.request.id).toBe(
      'request-123',
    );

    expect(result.request.title).toBe(
      'Compra de computadores',
    );

    expect(result.request.amount).toBe(
      5000000,
    );

    expect(result.approver.id).toBe(
      'approver-123',
    );

    expect(result.approver.name).toBe(
      'Carlos',
    );

    expect(result.approver.role).toBe(
      'FINANCE',
    );

    expect(result.approver.status).toBe(
      'PENDING',
    );
  });

  it('should reject an empty token', async () => {
    const useCase =
      new GetApprovalByToken(
        new InMemoryApproverRepository(),
        new InMemoryPurchaseRequestRepository(),
      );

    await expect(
      useCase.execute(''),
    ).rejects.toThrow(
      'Approver token is required',
    );
  });

  it('should reject an invalid token', async () => {
    const useCase =
      new GetApprovalByToken(
        new InMemoryApproverRepository(),
        new InMemoryPurchaseRequestRepository(),
      );

    await expect(
      useCase.execute('invalid-token'),
    ).rejects.toThrow(
      'Invalid approver token',
    );
  });
});