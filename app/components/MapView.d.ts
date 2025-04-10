import { ForwardRefExoticComponent, RefAttributes } from "react";

interface MapViewProps {
  onLoadingProgress: (percentage: number) => void;
  defaultLocation: {
    lat: number;
    lng: number;
  };
}

declare const MapView: ForwardRefExoticComponent<
  MapViewProps &
    RefAttributes<{
      addMarker: (coordinates: { lng: number; lat: number }) => void;
    }>
>;

export default MapView;
