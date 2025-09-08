export const ROUTES = {
  home: "/",
  datasetSelectionPage: "/data/data-selection",
  datasetProfilingPage: "/data/pipeline/profiling",
  datasetCleaningPage: "/data/pipeline/cleaning",
  datasetVisualizationPage: "/data/pipeline/visualization",
  loginPage: "/auth/login",
  dashboard: "/dashboard",
};

export const WORKFLOW_STAGES_NAMES_BY_ROUTE = {
  datasetCleaningPage: "CLEANING",
  datasetProfilingPage: "DATASET",
  datasetVisualizationPage: 'VISUALIZATION',
};

export const AGENT_ENUM_BY_ROUTE = {
  datasetCleaningPage: 1,
  datasetProfilingPage: 2,
  datasetVisualizationPage: 3

}