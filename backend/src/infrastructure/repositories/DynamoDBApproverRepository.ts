import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { Approver } from '../../domain/entities/Approver.js';
import { ApproverRepository } from '../../application/ports/ApproverRepository.js';
import { dynamoDBDocumentClient } from '../database/DynamoDBClient.js';
import {
  ApproverMapper,
  ApproverItem,
} from '../database/mappers/ApproverMapper.js';

const TABLE_NAME =
  process.env.PURCHASE_APPROVAL_TABLE_NAME ??
  'purchase-approval-dev';

export class DynamoDBApproverRepository
  implements ApproverRepository
{
  async saveMany(
    approvers: Approver[],
  ): Promise<void> {
    for (const approver of approvers) {
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: ApproverMapper.toItem(approver),
        }),
      );
    }
  }

  async update(
    approver: Approver,
  ): Promise<void> {
    await dynamoDBDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,

        Key: {
          PK: `REQUEST#${approver.requestId}`,
          SK: `APPROVER#${approver.id}`,
        },

        UpdateExpression: `
          SET #status = :status,
              otp = :otp,
              otpExpiresAt = :otpExpiresAt,
              otpVerifiedAt = :otpVerifiedAt,
              signedAt = :signedAt
        `,

        ExpressionAttributeNames: {
          '#status': 'status',
        },

        ExpressionAttributeValues: {
          ':status': approver.status,
          ':otp': approver.otp,
          ':otpExpiresAt': approver.otpExpiresAt,
            ':otpVerifiedAt': approver.otpVerifiedAt,
          ':signedAt': approver.signedAt,
        },
      }),
    );
  }

  async findByRequestId(
    requestId: string,
  ): Promise<Approver[]> {
    const result =
      await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,

          KeyConditionExpression:
            'PK = :pk AND begins_with(SK, :sk)',

          ExpressionAttributeValues: {
            ':pk': `REQUEST#${requestId}`,
            ':sk': 'APPROVER#',
          },
        }),
      );

    return (result.Items ?? []).map((item) =>
      ApproverMapper.toDomain(
        item as ApproverItem,
      ),
    );
  }

  async findByToken(
        token: string,
    ): Promise<Approver | null> {
        const result =
        await dynamoDBDocumentClient.send(
            new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'ApproverTokenIndex',

            KeyConditionExpression:
                'GSI1PK = :pk',

            ExpressionAttributeValues: {
                ':pk': `APPROVER_TOKEN#${token}`,
            },
            }),
        );

        const item = result.Items?.[0];

        if (!item) {
        return null;
        }

        return ApproverMapper.toDomain(
        item as ApproverItem,
        );
    }

    async findById(
    id: string,
    ): Promise<Approver | null> {
    const result =
        await dynamoDBDocumentClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,

            IndexName: 'ApproverIdIndex',

            KeyConditionExpression:
            'GSI2PK = :pk',

            ExpressionAttributeValues: {
            ':pk': `APPROVER#${id}`,
            },
        }),
        );

    const item = result.Items?.[0];

    if (!item) {
        return null;
    }

    return ApproverMapper.toDomain(
        item as ApproverItem,
    );
    }
}