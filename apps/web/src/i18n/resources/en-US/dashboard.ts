const enUSDashboard = {
  stats: {
    activeModules: {
      label: "Active Modules",
      description: "Core admin modules wired into the initial scaffold."
    },
    sharedPackages: {
      label: "Shared Packages",
      description: "Continues reusing shared config and UI packages from the monorepo."
    },
    publicExamples: {
      label: "Public Examples",
      description: "Supports both shell-embedded pages and standalone routes."
    }
  }
} as const;

export default enUSDashboard;
