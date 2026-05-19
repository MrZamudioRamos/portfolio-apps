import React, { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type CaptureOptions = { format?: string; quality?: number; result?: string };
export type ViewShotRef = { capture: () => Promise<string> };

type ViewShotProps = ViewProps & {
  options?: CaptureOptions;
  captureMode?: string;
};

let _ViewShot: React.ComponentType<ViewShotProps> = forwardRef<View, ViewShotProps>(
  ({ options: _options, captureMode: _captureMode, ...rest }, ref) =>
    React.createElement(View, { ref, ...rest })
) as unknown as React.ComponentType<ViewShotProps>;

let _viewShotAvailable = false;

try {
  const mod = require('react-native-view-shot');
  const Native = mod?.default ?? mod;
  if (Native) {
    _ViewShot = Native;
    _viewShotAvailable = true;
  }
} catch {
  // react-native-view-shot unavailable (Expo Go without dev build) — View fallback
}

export const ViewShot = _ViewShot;
export const isViewShotAvailable = () => _viewShotAvailable;
