const enUSAuth = {
  login: {
    title: "Sign In",
    description: "Use your account to enter the admin workspace.",
    userCode: "User Code",
    userCodePlaceholder: "Enter user code",
    password: "Password",
    passwordPlaceholder: "Enter password",
    submit: "Sign In",
    submitting: "Signing In",
    validation: {
      userCodeRequired: "Enter user code.",
      passwordRequired: "Enter password.",
    },
    feedback: {
      failed: "Unable to sign in. Check the account or password.",
    },
  },
} as const;

export default enUSAuth;
