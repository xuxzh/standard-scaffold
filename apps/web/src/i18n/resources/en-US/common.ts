const enUSCommon = {
  header: {
    preview: "Preview",
    language: "Switch language",
    languageShort: {
      "zh-CN": "ZH",
      "en-US": "EN",
    },
    languageOption: {
      "zh-CN": "Chinese",
      "en-US": "English",
    },
  },
  navigation: {
    title: "Navigation",
    dashboard: "Dashboard",
    exampleManagement: "Example Management",
    embeddedExample: "Embedded Example",
    packagingManagement: "Packaging Management",
    packagingTypeMaintenance: "Packaging Type Maintenance",
    standalonePreview: "Standalone Preview",
  },
  brand: {
    standardScaffold: "Standard Scaffold",
  },
  pages: {
    dashboard: {
      title: "Dashboard",
      description: "A minimal, extensible shadcn-admin style console scaffold.",
    },
    embeddedExample: {
      title: "Embedded Example",
      description:
        "This example runs inside the admin shell to verify shell and content coordination.",
    },
    packaging: {
      title: "Packaging",
      description: "Manage packaging tasks, operation status, and exceptions.",
      summary: {
        pendingTasks: {
          label: "Pending",
          description: "Packaging tasks waiting for assignment or processing.",
        },
        inProgressTasks: {
          label: "In Progress",
          description: "Packaging operations currently being handled.",
        },
        exceptionTasks: {
          label: "Exceptions",
          description: "Packaging exceptions that need manual handling.",
        },
      },
    },
  },
} as const;

export default enUSCommon;
