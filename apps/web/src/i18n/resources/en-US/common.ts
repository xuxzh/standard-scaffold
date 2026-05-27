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
    packagingType: {
      title: "Packaging Type Maintenance",
      description:
        "Maintain packaging type master data, filters, and operation flows.",
      filters: {
        typeCode: "Type Code",
        typeCodePlaceholder: "Enter type code",
        typeName: "Type Name",
        typeNamePlaceholder: "Enter type name",
        isRecyclable: "Reusable Packaging",
        options: {
          all: "All",
          true: "Yes",
          false: "No",
        },
      },
      table: {
        typeCode: "Type Code",
        typeName: "Type Name",
        isRecyclable: "Reusable Packaging",
        description: "Description",
        actions: "Actions",
      },
      actions: {
        search: "Search",
        reset: "Reset",
        create: "Create Type",
        edit: "Edit",
        delete: "Delete",
        batchDelete: "Batch Delete",
        export: "Export",
        confirm: "Confirm",
        cancel: "Cancel",
        back: "Back",
        retry: "Retry",
        previousPage: "Previous",
        nextPage: "Next",
      },
      states: {
        loading: "Loading packaging type data.",
        empty: "No packaging type data",
        errorTitle: "Unable to load packaging types",
        errorDescription: "Check your network connection and try again later.",
        total: "{{count}} items",
        page: "Page {{page}}",
      },
      form: {
        createTitle: "Create Type",
        editTitle: "Edit Type",
        descriptionText: "Maintain packaging type base information.",
        descriptionPlaceholder: "Enter description",
      },
      feedback: {
        created: "Packaging type created",
        updated: "Packaging type updated",
        deleted: "Packaging type deleted",
        batchDeleted: "Packaging types deleted",
        confirmDelete: "Delete {{name}}?",
        confirmBatchDelete: "Delete {{count}} packaging types?",
      },
      export: {
        dialogTitle: "Export data",
        dialogDescription: "Export the current table data to an Excel file.",
        exporting: "Exporting",
        options: {
          all: "All",
          current: "Current",
          selected: "Selected",
        },
        selectedDisabledHint: "Select at least one current page row first.",
        successTitle: "Export complete",
        emptyTitle: "No data to export",
        limitTitle: "Export supports up to 5000 rows",
        limitDescription: "Narrow the filters",
        errorTitle: "Export failed",
      },
    },
  },
} as const;

export default enUSCommon;
