// Web stub for react-native-maps – replaces the native module on web builds
import React from "react";
import { View } from "react-native";

const MapView = React.forwardRef(function MapView({ style, children }, ref) {
  return React.createElement(View, { style }, children);
});

MapView.Animated = MapView;

export default MapView;

export const Marker = (props) => null;
export const Callout = (props) => null;
export const Circle = (props) => null;
export const Polygon = (props) => null;
export const Polyline = (props) => null;
export const Overlay = (props) => null;
export const Heatmap = (props) => null;
export const UrlTile = (props) => null;
export const WMSTile = (props) => null;
export const LocalTile = (props) => null;
export const AnimatedRegion = class AnimatedRegion {};

export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = null;
