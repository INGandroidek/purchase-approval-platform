import { PurchaseRequest, PurchaseRequestProps } from '../../../domain/entities/PurchaseRequest.js';
import { PurchaseStatus } from '../../../domain/enums/PurchaseStatus.js';

export interface PurchaseRequestItem {
  PK: string;
  SK: string;
  entityType: 'PurchaseRequest';
  id: string;
  title: string;
  description: string;
  amount: number;
  requesterName: string;
  requesterEmail: string;
  status: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
}

export class PurchaseRequestMapper {
  static toItem(purchaseRequest: PurchaseRequest): PurchaseRequestItem {
    return {
      PK: `REQUEST#${purchaseRequest.id}`,
      SK: 'REQUEST',
      entityType: 'PurchaseRequest',
      id: purchaseRequest.id,
      title: purchaseRequest.title,
      description: purchaseRequest.description,
      amount: purchaseRequest.amount,
      requesterName: purchaseRequest.requesterName,
      requesterEmail: purchaseRequest.requesterEmail,
      status: purchaseRequest.status,
      createdAt: purchaseRequest.createdAt,
      updatedAt: purchaseRequest.updatedAt,
    };
  }

  static toDomain(item: PurchaseRequestItem): PurchaseRequest {
    const props: PurchaseRequestProps = {
      id: item.id,
      title: item.title,
      description: item.description,
      amount: item.amount,
      requesterName: item.requesterName,
      requesterEmail: item.requesterEmail,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    return PurchaseRequest.create(props);
  }
}