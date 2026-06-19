import { Coordinate } from "ol/coordinate";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";

export interface ClickedRegionData {
    name: string | null;
    id: string | null;
    coord: Coordinate | null; 
    life_exp: number | 'Неизвестна продолжительность жизни в этом регионе';
    color: string | null;
}

export interface SearchResultUI {
    name: string;
    feature?: Feature<Geometry>; 
}

export interface FetchFeaturesParams {
  sourceId: string;
  bbox: [number, number, number, number];
  zoom: number;
  limit?: number;
}