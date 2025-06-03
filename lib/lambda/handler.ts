import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const secret_name = "dev/postgres_db_1";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  try {
    switch (event.httpMethod) {
      case "GET":
        const carResults = await getCars();
        return {
          statusCode: 200,
          body: JSON.stringify({ cars: carResults }),
        };
      default:
        break;
    }
  } catch (error: any) {
    return {
      statusCode: 400,
      body: error.message,
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify(`unsupported method: ${event.httpMethod}`),
  };
}

const getCars = async () => {
  let response;

  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  const secret: any = response.SecretString;

  if (secret) {
    const creds = JSON.parse(secret);

    const dbClient = new Client({
      user: creds.username,
      password: creds.password,
      host: creds.host,
      port: parseInt(creds.port),
      database: creds.dbname,
    });

    await dbClient.connect();

    const query = {
      name: "get-cars",
      text: "SELECT * FROM cars",
      rowMode: "array",
    };

    const result = await dbClient.query(query);
    await dbClient.end();
    return result.rows;
  }
  return {
    statusCode: 500,
    body: "error",
  };
};

export { handler };
