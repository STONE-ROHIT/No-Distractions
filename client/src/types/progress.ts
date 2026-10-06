export interface WatchProgress {
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface ContinueLearningEntry extends WatchProgress {
  video: import('./video').Video;
}
