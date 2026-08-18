import { describe, expect, it } from '@jest/globals';

import { Approver } from '../../src/domain/entities/Approver.js';
import { PurchaseRequest } from '../../src/domain/entities/PurchaseRequest.js';
import { ApprovalStatus } from '../../src/domain/enums/ApprovalStatus.js';
import { PurchaseStatus } from '../../src/domain/enums/PurchaseStatus.js';
import { DynamoDBPurchaseRequestRepository } from '../../src/infrastructure/repositories/DynamoDBPurchaseRequestRepository.js';

const repository = new DynamoDBPurchaseRequestRepository();

describe('DynamoDBPurchaseRequestRepository', () => {
  it('should save and retrieve a purchase request with its approvers from DynamoDB', async () => {
    const id = `integration-test-${Date.now()}`;

    const purchaseRequest = PurchaseRequest.create({
      id,
      title: 'Integration Test',
      description: 'DynamoDB integration test',
      amount: 100000,
      requesterName: 'Test User',
      requesterEmail: 'test@example.com',
      status: PurchaseStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const approvers = [
      Approver.create({
        id: `${id}-approver-1`,
        requestId: id,
        name: 'Finance User',
        email: 'finance@example.com',
        role: 'FINANCE',
        token: `token-${id}-1`,
        otp: '100001',
        otpExpiresAt: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
        status: ApprovalStatus.PENDING,
      }),
      Approver.create({
        id: `${id}-approver-2`,
        requestId: id,
        name: 'Manager User',
        email: 'manager@example.com',
        role: 'MANAGER',
        token: `token-${id}-2`,
        otp: '100002',
        otpExpiresAt: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
        status: ApprovalStatus.PENDING,
      }),
      Approver.create({
        id: `${id}-approver-3`,
        requestId: id,
        name: 'Legal User',
        email: 'legal@example.com',
        role: 'LEGAL',
        token: `token-${id}-3`,
        otp: '100003',
        otpExpiresAt: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
        status: ApprovalStatus.PENDING,
      }),
    ];

    await repository.save(purchaseRequest, approvers);

    const result = await repository.findById(id);

    expect(result).not.toBeNull();

    expect(result?.purchaseRequest.id).toBe(id);
    expect(result?.purchaseRequest.title).toBe('Integration Test');
    expect(result?.purchaseRequest.amount).toBe(100000);

    expect(result?.approvers).toHaveLength(3);
    expect(result?.approvers[0].requestId).toBe(id);

    expect(
      result?.approvers.map((approver) => approver.role),
    ).toEqual([
      'FINANCE',
      'MANAGER',
      'LEGAL',
    ]);

    expect(
      result?.approvers.map((approver) => approver.requestId),
    ).toEqual([
      id,
      id,
      id,
    ]);
  });
});