export enum AppMode {
  TRANSLATE = 'TRANSLATE',
  EDIT = 'EDIT'
}

export interface Annotation {
  original: string;
  translation: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface ImageState {
  original: string | null; // base64
  processed: string | null; // base64 (for edit mode)
  annotations: Annotation[]; // (for translate mode)
  width: number;
  height: number;
}
