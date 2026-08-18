import { describe, expect, it } from '@jest/globals';

import { PurchaseRequest } from '../src/domain/entities/PurchaseRequest.js';
import { PurchaseRequestRepository } from '../src/application/ports/PurchaseRequestRepository.js';
import { OtpGenerator } from '../src/domain/services/OtpGenerator.js';
import { TokenGenerator } from '../src/domain/services/TokenGenerator.js';
import { CreatePurchaseRequest } from '../src/application/use-cases/CreatePurchaseRequest.js';
import { Approver } from '../src/domain/entities/Approver.js';

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
    this.requests.set(purchaseRequest.id, {
      purchaseRequest,
      approvers,
    });
  }

  async findById(
    id: string,
  ): Promise<{
    purchaseRequest: PurchaseRequest;
    approvers: Approver[];
  } | null> {
    return this.requests.get(id) ?? null;
  }

  async findByRequesterEmail(
    email: string,
  ): Promise<PurchaseRequest[]> {
    return [...this.requests.values()]
      .filter(
        ({ purchaseRequest }) =>
          purchaseRequest.requesterEmail === email,
      )
      .map(({ purchaseRequest }) => purchaseRequest);
  }
}

class FakeTokenGenerator implements TokenGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }
}

class FakeOtpGenerator implements OtpGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `10000${this.counter}`;
  }
}

describe('CreatePurchaseRequest', () => {
  it('should create a purchase request with three different approver roles', async () => {
    const repository = new InMemoryPurchaseRequestRepository();
    const useCase = new CreatePurchaseRequest(
      repository,
      new FakeTokenGenerator(),
      new FakeOtpGenerator(),
    );

    const result = await useCase.execute({
      title: 'Compra de computadores',
      description: 'Compra de equipos para el equipo de desarrollo',
      amount: 5000000,
      requesterName: 'Diego',
      requesterEmail: 'diego@example.com',
      approvers: [
        {
          name: 'Carlos',
          email: 'carlos@example.com',
          role: 'FINANCE',
        },
        {
          name: 'Laura',
          email: 'laura@example.com',
          role: 'MANAGER',
        },
        {
          name: 'Andrés',
          email: 'andres@example.com',
          role: 'LEGAL',
        },
      ],
    });

  expect(result.request).toBeInstanceOf(PurchaseRequest);
  expect(result.request.title).toBe('Compra de computadores');
  expect(result.request.amount).toBe(5000000);

  expect(result.approvers).toHaveLength(3);

  expect(result.approvers.map((approver) => approver.role)).toEqual([
    'FINANCE',
    'MANAGER',
    'LEGAL',
  ]);
  });

  it('should reject requests with fewer than three approvers', async () => {
    const repository = new InMemoryPurchaseRequestRepository();
    const useCase = new CreatePurchaseRequest(
      repository,
      new FakeTokenGenerator(),
      new FakeOtpGenerator(),
    );

    await expect(
      useCase.execute({
        title: 'Compra',
        description: 'Descripción',
        amount: 1000000,
        requesterName: 'Diego',
        requesterEmail: 'diego@example.com',
        approvers: [
          {
            name: 'Carlos',
            email: 'carlos@example.com',
            role: 'FINANCE',
          },
          {
            name: 'Laura',
            email: 'laura@example.com',
            role: 'MANAGER',
          },
        ],
      }),
    ).rejects.toThrow('Exactly 3 approvers are required');
  });

  it('should reject requests with duplicated approver roles', async () => {
    const repository = new InMemoryPurchaseRequestRepository();
    const useCase = new CreatePurchaseRequest(
      repository,
      new FakeTokenGenerator(),
      new FakeOtpGenerator(),
    );

    await expect(
      useCase.execute({
        title: 'Compra',
        description: 'Descripción',
        amount: 1000000,
        requesterName: 'Diego',
        requesterEmail: 'diego@example.com',
        approvers: [
          {
            name: 'Carlos',
            email: 'carlos@example.com',
            role: 'MANAGER',
          },
          {
            name: 'Laura',
            email: 'laura@example.com',
            role: 'MANAGER',
          },
          {
            name: 'Andrés',
            email: 'andres@example.com',
            role: 'LEGAL',
          },
        ],
      }),
    ).rejects.toThrow('Approver roles must be different');
  });
});

it('should create three approvers with unique tokens and OTPs', async () => {
  const repository = new InMemoryPurchaseRequestRepository();

  const useCase = new CreatePurchaseRequest(
    repository,
    new FakeTokenGenerator(),
    new FakeOtpGenerator(),
  );

  const result = await useCase.execute({
    title: 'Compra de computadores',
    description: 'Equipos para desarrollo',
    amount: 5000000,
    requesterName: 'Diego',
    requesterEmail: 'diego@example.com',
    approvers: [
      {
        name: 'Carlos',
        email: 'carlos@example.com',
        role: 'FINANCE',
      },
      {
        name: 'Laura',
        email: 'laura@example.com',
        role: 'MANAGER',
      },
      {
        name: 'Andrés',
        email: 'andres@example.com',
        role: 'LEGAL',
      },
    ],
  });

  expect(result.approvers).toHaveLength(3);

  const tokens = result.approvers.map((approver) => approver.token);
  const otps = result.approvers.map((approver) => approver.otp);

  expect(new Set(tokens).size).toBe(3);
  expect(new Set(otps).size).toBe(3);

  result.approvers.forEach((approver) => {
    expect(approver.requestId).toBe(result.request.id);
    expect(approver.status).toBe('PENDING');
  });
});

it('should generate an OTP expiration approximately three minutes in the future', async () => {
  const repository = new InMemoryPurchaseRequestRepository();

  const useCase = new CreatePurchaseRequest(
    repository,
    new FakeTokenGenerator(),
    new FakeOtpGenerator(),
  );

  const before = Date.now();

  const result = await useCase.execute({
    title: 'Compra',
    description: 'Descripción',
    amount: 1000000,
    requesterName: 'Diego',
    requesterEmail: 'diego@example.com',
    approvers: [
      {
        name: 'Carlos',
        email: 'carlos@example.com',
        role: 'FINANCE',
      },
      {
        name: 'Laura',
        email: 'laura@example.com',
        role: 'MANAGER',
      },
      {
        name: 'Andrés',
        email: 'andres@example.com',
        role: 'LEGAL',
      },
    ],
  });

  const expiresAt = new Date(
    result.approvers[0].otpExpiresAt,
  ).getTime();

  const after = Date.now();

  const threeMinutes = 3 * 60 * 1000;

  expect(expiresAt).toBeGreaterThanOrEqual(
    before + threeMinutes,
  );

  expect(expiresAt).toBeLessThanOrEqual(
    after + threeMinutes,
  );
});