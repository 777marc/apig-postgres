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

const secret_name = "dev/postgres_db";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  let response;

  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      })
    );
  } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
  }

  const secret = response.SecretString;

  try {
    switch (event.httpMethod) {
      case "GET":
        const cars = await callDB(secret);
        console.log("in get...", cars);
        return {
          statusCode: 200,
          body: JSON.stringify({ cars }),
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

const callDB: any = async (secret: any) => {
  const client = new Client({
    user: secret.username,
    password: secret.password,
    host: secret.host,
    port: parseInt(secret.port),
    database: secret.dbname,
  });

  client
    .connect()
    .then(() => {
      console.log("Connected to PostgreSQL database");
    })
    .catch((err) => {
      console.error("Error connecting to PostgreSQL database", err);
      close(client);
    });

  client.query("SELECT * FROM cars", (err, result) => {
    if (err) {
      console.error("Error executing query", err);
      close(client);
    } else {
      console.log("Query result:", result.rows);
      close(client);
      return result.rows;
    }
  });
};

const close = (client: Client) => {
  client
    .end()
    .then(() => {
      console.log("Connection to PostgreSQL closed");
    })
    .catch((err) => {
      console.error("Error closing connection", err);
    });
};

export { handler };
