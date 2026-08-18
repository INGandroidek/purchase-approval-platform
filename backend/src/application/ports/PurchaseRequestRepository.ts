import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';
import { Approver } from '../../domain/entities/Approver.js';

export interface PurchaseRequestRepository {
  save(
    purchaseRequest: PurchaseRequest,
    approvers: Approver[],
  ): Promise<void>;

  findById(
    id: string,
  ): Promise<{
    purchaseRequest: PurchaseRequest;
    approvers: Approver[];
  } | null>;

  findByRequesterEmail(
    email: string,
  ): Promise<PurchaseRequest[]>;

  update(
    purchaseRequest: PurchaseRequest,
  ): Promise<void>;
}