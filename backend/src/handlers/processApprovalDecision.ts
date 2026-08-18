import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { ProcessApprovalDecision } from '../application/use-cases/ProcessApprovalDecision.js';

import { DynamoDBApproverRepository } from '../infrastructure/repositories/DynamoDBApproverRepository.js';

import { DynamoDBPurchaseRequestRepository } from '../infrastructure/repositories/DynamoDBPurchaseRequestRepository.js';

const approverRepository =
  new DynamoDBApproverRepository();

const purchaseRequestRepository =
  new DynamoDBPurchaseRequestRepository();

const processApprovalDecision =
  new ProcessApprovalDecision(
    approverRepository,
    purchaseRequestRepository,
  );

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const token =
      event.pathParameters?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message:
            'Approver token is required',
        }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message:
            'Request body is required',
        }),
      };
    }

    const input = JSON.parse(
      event.body,
    );

    const result =
      await processApprovalDecision.execute(
        token,
        input.decision,
      );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error',
      }),
    };
  }
}