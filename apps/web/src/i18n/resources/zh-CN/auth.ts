const zhCNAuth = {
  login: {
    title: "登录",
    description: "使用你的账号进入后台工作台。",
    userCode: "用户编码",
    userCodePlaceholder: "请输入用户编码",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    submit: "登录",
    submitting: "登录中",
    validation: {
      userCodeRequired: "请输入用户编码。",
      passwordRequired: "请输入密码。",
    },
    feedback: {
      failed: "登录失败，请检查账号或密码。",
    },
  },
} as const;

export default zhCNAuth;
