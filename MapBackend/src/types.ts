export interface Geometry {
    type: 'Point' | 'Polygon' | 'MultiPolygon',
    coordinates: any,
};

export interface GeoJSONFeature {
    type: 'Feature',
    geometry: Geometry,
    properties: Record<string, any>,
};

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection',
    features: GeoJSONFeature[],
};

export interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  featureIndex: number;
}