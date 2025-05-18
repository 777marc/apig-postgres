import { PolicyDocument } from "aws-lambda";
import { APIGatewayAuthorizerResult } from "aws-lambda/trigger/api-gateway-authorizer";
import "source-map-support/register";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";

export const handler = async function (
  event: any
): Promise<APIGatewayAuthorizerResult> {
  console.log(`event => ${JSON.stringify(event)}`);

  // authentication step by getting and validating JWT token
  const authToken = event.authorizationToken || "";

  try {
    const token = authToken.replace("Bearer ", "");
    const SECRET_KEY = process.env.SECRET_KEY || "abc123";
    const decoded = jwt.verify(token, SECRET_KEY);

    console.log("decoded:", decoded);

    // After the token is verified we can do Authorization check here if needed.
    // If the request doesn't meet authorization conditions then we should return a Deny policy.
    const policyDocument: PolicyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow", // return Deny if you want to reject the request
          Resource: event["methodArn"],
        },
      ],
    };

    // This is the place you inject custom data into request context which will be available
    // inside `event.requestContext.authorizer` in API Lambdas.
    const context = {
      userId: 123,
      companyId: 456,
      role: "ADMIN",
    };

    const response: APIGatewayAuthorizerResult = {
      principalId: decoded.toString(),
      policyDocument,
      context,
    };
    console.log(`response => ${JSON.stringify(response)}`);

    return response;
  } catch (err) {
    console.error("Invalid auth token. err => ", err);
    throw new Error("Unauthorized");
  }
};
