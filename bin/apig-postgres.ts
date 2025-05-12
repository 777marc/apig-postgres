#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApigPostgresStack } from "../lib/apig-postgres-stack";

const app = new cdk.App();
new ApigPostgresStack(app, "ApigPostgresStack");
