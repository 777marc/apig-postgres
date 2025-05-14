#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApigPostgresStack } from "../lib/apig-postgres-stack";
import { CarsAuthStack } from "../lib/cars-auth-stack";

const app = new cdk.App();

const authStack = new CarsAuthStack(app, "CarsAuthStack");
new ApigPostgresStack(app, "ApigPostgresStack", {
  userPool: authStack.userPool,
});
