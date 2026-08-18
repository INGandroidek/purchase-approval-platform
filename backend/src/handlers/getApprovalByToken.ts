import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { corsHeaders } from './cors.js';
import { GetApprovalByToken } from '../application/use-cases/GetApprovalByToken.js';

import { DynamoDBApproverRepository } from '../infrastructure/repositories/DynamoDBApproverRepository.js';

import { DynamoDBPurchaseRequestRepository } from '../infrastructure/repositories/DynamoDBPurchaseRequestRepository.js';

const approverRepository =
  new DynamoDBApproverRepository();

const purchaseRequestRepository =
  new DynamoDBPurchaseRequestRepository();

const getApprovalByToken =
  new GetApprovalByToken(
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
        headers: corsHeaders,
        body: JSON.stringify({
          message:
            'Approver token is required',
        }),
      };
    }

    const result =
      await getApprovalByToken.execute(
        token,
      );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error',
      }),
    };
  }
}