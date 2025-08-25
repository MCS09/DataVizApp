import {ROUTES} from './routes';

export const DATA_STEPS = ["upload", "clean", "annotate", "visualize"];

// Enum for safe step labels
export enum StepKey {
  Upload = 'Upload',
  Clean = 'Clean',
  Annotate = 'Annotate',
  Visualize = 'Visualize',
}

export type StepInfo = {
  title: string;
  subtitle: string;
  path: string;
  order: number; // 1-based index
};

export const DATA_STEPS_INFO: Record<StepKey, StepInfo> = {
  [StepKey.Upload]: {
    title: 'Upload',
    subtitle: 'Upload your data files',
    path: ROUTES.DATA.UPLOAD,
    order: 1,
  },
  [StepKey.Clean]: {
    title: 'Clean',
    subtitle: 'Clean your data',
    path: ROUTES.DATA.CLEANING,
    order: 2,
  },
  [StepKey.Annotate]: {
    title: 'Annotate',
    subtitle: 'Annotate your data',
    path: ROUTES.DATA.ANNOTATION,
    order: 3,
  },
  [StepKey.Visualize]: {
    title: 'Visualize',
    subtitle: 'Visualize your data',
    path: ROUTES.DATA.VISUALIZATION,
    order: 4,
  },
};




// export const DATA_STEPS_ARRAY: DataStep[] = [
//   { step: 1, label: StepKey.Upload, path: '/data/upload' },
//   { step: 2, label: StepKey.Clean, path: '/data/cleaning' },
//   { step: 3, label: StepKey.Annotate, path: '/data/annotation' },
//   { step: 4, label: StepKey.Visualize, path: '/data/visualization' },
// ];

