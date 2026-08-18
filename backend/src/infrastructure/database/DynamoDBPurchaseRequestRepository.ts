import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { Approver } from '../../domain/entities/Approver.js';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';

import { PurchaseRequestRepository } from '../../application/ports/PurchaseRequestRepository.js';

import { dynamoDBDocumentClient } from '../database/DynamoDBClient.js';

import {
  ApproverMapper,
  ApproverItem,
} from '../database/mappers/ApproverMapper.js';

import {
  PurchaseRequestMapper,
  PurchaseRequestItem,
} from '../database/mappers/PurchaseRequestMapper.js';

const TABLE_NAME =
  process.env.PURCHASE_APPROVAL_TABLE_NAME ??
  'purchase-approval-dev';

export class DynamoDBPurchaseRequestRepository
  implements PurchaseRequestRepository
{
  async save(
    purchaseRequest: PurchaseRequest,
    approvers: Approver[],
  ): Promise<void> {
    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: PurchaseRequestMapper.toItem(
          purchaseRequest,
        ),
      }),
    );

    for (const approver of approvers) {
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: ApproverMapper.toItem(approver),
        }),
      );
    }
  }

  async findById(
    id: string,
  ): Promise<{
    purchaseRequest: PurchaseRequest;
    approvers: Approver[];
  } | null> {
    const result =
      await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,

          KeyConditionExpression:
            'PK = :pk',

          ExpressionAttributeValues: {
            ':pk': `REQUEST#${id}`,
          },
        }),
      );

    const items = result.Items ?? [];

    const requestItem = items.find(
      (item) =>
        item.entityType ===
        'PurchaseRequest',
    );

    if (!requestItem) {
      return null;
    }

    const purchaseRequest =
      PurchaseRequestMapper.toDomain(
        requestItem as PurchaseRequestItem,
      );

    const approvers = items
      .filter(
        (item) =>
          item.entityType === 'Approver',
      )
      .map((item) =>
        ApproverMapper.toDomain(
          item as ApproverItem,
        ),
      );

    return {
      purchaseRequest,
      approvers,
    };
  }

  async findByRequesterEmail(
    email: string,
  ): Promise<PurchaseRequest[]> {
    // Lo implementaremos cuando agreguemos
    // el GSI necesario para esta consulta.
    return [];
  }

  async update(
    purchaseRequest: PurchaseRequest,
  ): Promise<void> {
    await dynamoDBDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,

        Key: {
          PK: `REQUEST#${purchaseRequest.id}`,
          SK: 'REQUEST',
        },

        UpdateExpression: `
          SET #status = :status,
              updatedAt = :updatedAt
        `,

        ExpressionAttributeNames: {
          '#status': 'status',
        },

        ExpressionAttributeValues: {
          ':status': purchaseRequest.status,
          ':updatedAt':
            purchaseRequest.updatedAt,
        },
      }),
    );
  }
}