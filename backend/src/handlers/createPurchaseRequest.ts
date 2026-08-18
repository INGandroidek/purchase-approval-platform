import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { CreatePurchaseRequest } from '../application/use-cases/CreatePurchaseRequest.js';
import { DynamoDBPurchaseRequestRepository } from '../infrastructure/repositories/DynamoDBPurchaseRequestRepository.js';
import { CryptoTokenGenerator } from '../infrastructure/services/CryptoTokenGenerator.js';
import { SecureOtpGenerator } from '../infrastructure/services/SecureOtpGenerator.js';

const repository =
  new DynamoDBPurchaseRequestRepository();

const tokenGenerator =
  new CryptoTokenGenerator();

const otpGenerator =
  new SecureOtpGenerator();

const createPurchaseRequest =
  new CreatePurchaseRequest(
    repository,
    tokenGenerator,
    otpGenerator,
  );

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Request body is required',
        }),
      };
    }

    const input = JSON.parse(event.body);

    const result =
      await createPurchaseRequest.execute(
        input,
      );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: {
          id: result.request.id,
          title: result.request.title,
          description: result.request.description,
          amount: result.request.amount,
          requesterName:
            result.request.requesterName,
          requesterEmail:
            result.request.requesterEmail,
          status: result.request.status,
          createdAt:
            result.request.createdAt,
          updatedAt:
            result.request.updatedAt,
        },

        approvers:
          result.approvers.map(
            (approver) => ({
              id: approver.id,
              name: approver.name,
              email: approver.email,
              role: approver.role,
              token: approver.token,
              otp: approver.otp,
              otpExpiresAt:
                approver.otpExpiresAt,
              status: approver.status,
            }),
          ),
      }),
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
