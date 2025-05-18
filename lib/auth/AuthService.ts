import { Amplify } from "aws-amplify";
import { SignInOutput, fetchAuthSession, signIn } from "@aws-amplify/auth";

const userPoolId: string = "us-east-1_FrMsEtLIR";
const userPoolClientId: string = "6bbbd0uq8adf067cpe0gfdgcbh";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
});

export class AuthService {
  public async login(userName: string, password: string) {
    const signInOutput: SignInOutput = await signIn({
      username: userName,
      password: password,
      options: {
        authFlowType: "USER_PASSWORD_AUTH",
      },
    });
    return signInOutput;
  }

  /**
   * call only after login
   */
  public async getIdToken() {
    const authSession = await fetchAuthSession();
    return authSession.tokens?.idToken?.toString();
  }
}
