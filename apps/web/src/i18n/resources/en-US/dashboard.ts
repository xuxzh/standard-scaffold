const enUSDashboard = {
  status: {
    loading: "Loading dashboard overview.",
    errorTitle: "Unable to load the overview",
    errorDescription:
      "Check the current data source status or try again shortly.",
    retry: "Retry",
  },
  stats: {
    activeModules: {
      label: "Active Modules",
      description: "Core admin modules wired into the initial scaffold.",
    },
    sharedPackages: {
      label: "Shared Packages",
      description:
        "Continues reusing shared config and UI packages from the monorepo.",
    },
    publicExamples: {
      label: "Public Examples",
      description: "Supports both shell-embedded pages and standalone routes.",
    },
  },
} as const;

export default enUSDashboard;
