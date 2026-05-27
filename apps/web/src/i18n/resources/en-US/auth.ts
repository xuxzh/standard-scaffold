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
  logout: {
    action: "Sign Out",
    cancel: "Cancel",
    confirmTitle: "Confirm sign out",
    confirmDescription: "You need to sign in again to continue using the admin shell.",
    fallbackName: "Current User",
  },
} as const;

export default enUSAuth;
