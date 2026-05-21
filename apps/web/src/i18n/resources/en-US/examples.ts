const enUSExamples = {
  embedded: {
    title: "Embedded Example",
    description: "This page runs inside the admin shell and fits business forms, tables, and dashboards.",
    quickSetup: "Quick Setup",
    quickSetupDescription: "Demonstrates an admin form layout built with `FieldGroup + Field`.",
    workspaceName: "Workspace Name",
    ownerEmail: "Owner Email",
    saveDraft: "Save Draft",
    layoutNotes: "Layout Notes",
    layoutNotesDescription: "This section explains the responsibility boundary between the shell and the content area.",
    noteOne: "Navigation and global actions stay in the shell while the page focuses on business content.",
    noteTwo: "You can plug in tables, charts, permissions, or real data later without rebuilding the route scaffold.",
    noteThree: "If an example needs a fullscreen presentation, move it to a standalone route directly."
  },
  standalone: {
    routeAccess: "Direct Route Access",
    title: "Standalone Example",
    paragraphOne: "This page bypasses the admin shell, so it does not render the menu, header, or sidebar.",
    paragraphTwo: "It works well for standalone demos, shared pages, login flows, or any content that needs a fullscreen layout.",
    returnToDashboard: "Return to Dashboard",
    fullscreenDemo: "View Fullscreen Demo"
  }
} as const;

export default enUSExamples;
