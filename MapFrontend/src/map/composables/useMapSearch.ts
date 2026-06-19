import VectorSource from 'ol/source/Vector';
import { type Feature } from 'ol';
import { Geometry, MultiPolygon, Polygon } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { getCenter } from 'ol/extent';
import { getHighlightStyle, getRegionColor } from '../MapStyle';
import Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import { ClickedRegionData, SearchResultUI } from '@/types';
import { GeoJSON } from 'ol/format'; 

export function useMapSearch(
  regionsSource: VectorSource<Feature<Geometry>>,
  clickSyncState: ClickedRegionData,
  getPopupOverlay: () => Overlay | null,
  getMapInstance: () => Map | null,
  highlightFeature: (feature: Feature<Geometry>) => void,
) {
  const geoJsonFormat = new GeoJSON();
  let searchAbortController: AbortController | null = null;

  const getInteriorCoordinate = (geometry: Geometry): Coordinate | null => {
    if (geometry instanceof Polygon) {
      return geometry.getInteriorPoint().getCoordinates();
    } else if (geometry instanceof MultiPolygon) {
      const multiPoint = geometry.getInteriorPoints();
      const coordinates = multiPoint.getCoordinates();
      return coordinates[0] || null;
    } else {
      const extent = geometry.getExtent();
      return extent ? getCenter(extent) : null;
    }
  };
  
  const focusOnFeature = (feature: Feature): void => {
    const mapInstance = getMapInstance();
    if (!mapInstance) return;
    
    const geometry = feature.getGeometry();
    if (!geometry) return;
    
    const view = mapInstance.getView();
    const targetCoordinate = getInteriorCoordinate(geometry);
    
    if (targetCoordinate) {
      view.animate({
        center: targetCoordinate,
        duration: 750,
        zoom: 6
      });
    }
  };
  
  const searchInMap = async (query: string): Promise<SearchResultUI[]> => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    if (searchAbortController) {
      searchAbortController.abort();
    }
    searchAbortController = new AbortController();

    try {
      const response = await fetch(
        `http://localhost:3000/api/features/georegions/search?q=${encodeURIComponent(cleanQuery)}&limit=7`,
        { signal: searchAbortController.signal }
      );
      
      if (!response.ok) return [];
      
      const jsonFeatures = await response.json() as Record<string, unknown>[];
      
      return jsonFeatures.map((f: Record<string, unknown>) => {
        const props = (f.properties || {}) as Record<string, unknown>;
        return {
          name: typeof props.name === 'string' ? props.name : 'Неизвестный регион',
          _rawFeature: f 
        };
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return [];
      console.error('Ошибка глобального поиска:', error);
      return [];
    }
  };
    
  const selectRegionByName = (uiItem: SearchResultUI & { _rawFeature?: Record<string, unknown> }): void => {
    const name = uiItem.name;
    const features = regionsSource.getFeatures();
    const found = features.find(f => f.get('name') === name);
      
    if (found) {
      focusOnFeature(found);
      highlightFeature(found);
      
      const popupOverlay = getPopupOverlay();
      if (popupOverlay) {
        const geom = found.getGeometry();
        if (geom) {
          const targetCoordinate = getInteriorCoordinate(geom);
          if (targetCoordinate) {
            const rawLifeExp = found.get('life_exp') as number | undefined;
            
            clickSyncState.name = name;
            clickSyncState.life_exp = rawLifeExp ?? 'Неизвестна продолжительность жизни в этом регионе';
            clickSyncState.color = typeof rawLifeExp === 'number' ? getRegionColor(rawLifeExp) : 'rgb(200, 200, 200)';
            clickSyncState.coord = targetCoordinate;
            popupOverlay.setPosition(targetCoordinate);
          }
        }
      }
    } 
    else if (uiItem._rawFeature) {
      const mapInstance = getMapInstance();
      if (!mapInstance) return;

      const olFeature = geoJsonFormat.readFeature(uiItem._rawFeature, {
        dataProjection: 'EPSG:4326',  
        featureProjection: 'EPSG:3857' 
      }) as Feature<Geometry>;

      const geom = olFeature.getGeometry();
      if (geom) {
        const targetCoordinate = getInteriorCoordinate(geom);
        if (targetCoordinate) {
          const rawLifeExp = olFeature.get('life_exp') as number | undefined;

          clickSyncState.name = name;
          clickSyncState.life_exp = rawLifeExp ?? 'Неизвестна продолжительность жизни в этом регионе';
          clickSyncState.color = typeof rawLifeExp === 'number' ? getRegionColor(rawLifeExp) : 'rgb(200, 200, 200)';
          clickSyncState.coord = targetCoordinate;

          mapInstance.getView().animate({
            center: targetCoordinate,
            duration: 750,
            zoom: 6
          });
        }
      }
    }
  };
  
  return { searchInMap, selectRegionByName };
}
