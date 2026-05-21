const enUSCommon = {
  header: {
    preview: "Preview",
    language: "Switch language",
    languageShort: {
      "zh-CN": "ZH",
      "en-US": "EN"
    },
    languageOption: {
      "zh-CN": "Chinese",
      "en-US": "English"
    }
  },
  navigation: {
    title: "Navigation",
    dashboard: "Dashboard",
    embeddedExample: "Embedded Example",
    standalonePreview: "Standalone Preview"
  },
  brand: {
    standardScaffold: "Standard Scaffold"
  },
  pages: {
    dashboard: {
      title: "Dashboard",
      description: "A minimal, extensible shadcn-admin style console scaffold."
    },
    embeddedExample: {
      title: "Embedded Example",
      description: "This example runs inside the admin shell to verify shell and content coordination."
    }
  }
} as const;

export default enUSCommon;
