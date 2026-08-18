import {
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';
import { Approver } from '../../domain/entities/Approver.js';
import { PurchaseRequestRepository } from '../../application/ports/PurchaseRequestRepository.js';
import { dynamoDBDocumentClient } from './DynamoDBClient.js';

const TABLE_NAME = process.env.PURCHASE_APPROVAL_TABLE_NAME ?? 'purchase-approval-dev';

export class DynamoDBPurchaseRequestRepository
  implements PurchaseRequestRepository
{
async save(purchaseRequest: PurchaseRequest): Promise<void> {
    const requestItem = {
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

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: requestItem,
      }),
    );
  }

  async findById(id: string): Promise<{
    purchaseRequest: PurchaseRequest;
    approvers: Approver[];
  } | null> {
    const result = await dynamoDBDocumentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `REQUEST#${id}`,
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const requestItem = result.Items.find(
      (item) => item.entityType === 'PurchaseRequest',
    );

    if (!requestItem) {
      return null;
    }

    const approverItems = result.Items.filter(
      (item) => item.entityType === 'Approver',
    );

    const purchaseRequest = PurchaseRequest.create({
      id: requestItem.id,
      title: requestItem.title,
      description: requestItem.description,
      amount: requestItem.amount,
      requesterName: requestItem.requesterName,
      requesterEmail: requestItem.requesterEmail,
      status: requestItem.status,
      createdAt: requestItem.createdAt,
      updatedAt: requestItem.updatedAt,
    });

    const approvers = approverItems.map((item) =>
      Approver.create({
        id: item.id,
        requestId: item.requestId,
        name: item.name,
        email: item.email,
        role: item.role,
        token: item.token,
        otp: item.otp,
        otpExpiresAt: item.otpExpiresAt,
        status: item.status,
        signedAt: item.signedAt,
      }),
    );

    return {
      purchaseRequest,
      approvers,
    };
  }

    async findByRequesterEmail(
    email: string,
  ): Promise<PurchaseRequest[]> {
    return [];
  }
}