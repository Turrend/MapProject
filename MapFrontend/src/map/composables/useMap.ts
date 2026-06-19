import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
// import OSM from 'ol/source/OSM'; 
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import VectorImageLayer from 'ol/layer/VectorImage';
import Geometry from 'ol/geom/Geometry';
import MapBrowserEvent from 'ol/MapBrowserEvent';

import { onMounted, onUnmounted, type Ref, reactive, watchEffect } from 'vue';
// import { regionService } from '../services/regionService';
import { mapInteractionService } from '../services/mapInteractionService';
import { getHighlightStyle, getLayerStyle } from '../MapStyle';
import { useMapSearch } from './useMapSearch';
import { ClickedRegionData } from '@/types';
import { geoService } from '../services/geoService';


export function useMap(
  targetRef: Ref<HTMLDivElement | null>,
  popupRef: Ref<HTMLDivElement | null>,
  onRegionClick: (data: ClickedRegionData) => void 
) {
  const ACTIVE_SOURCE_ID = 'georegions'; 
  
  let mapInstance: Map | null = null;
  const regionsSource = new VectorSource<Feature<Geometry>>();
  let regionsLayer: VectorImageLayer<VectorSource<Feature<Geometry>>> | null = null;
  let sputnikLayer: TileLayer<XYZ> | null = null;
  let reliefLayer: TileLayer<XYZ> | null = null;
  let popupOverlay: Overlay | null = null;
  let currentlyHighlightedFeature: Feature<Geometry> | null = null;
  
  const clickSyncState = reactive<ClickedRegionData>({
    name: null,
    id: null,
    coord: null,
    life_exp: 'Неизвестна продолжительность жизни в этом регионе',
    color: 'rgba(200, 200, 200, 1)',
  });
  
  let handleMapClick: (event: MapBrowserEvent) => void;

  const highlightFeature = (feature: Feature): void => {
    if (currentlyHighlightedFeature) {
      currentlyHighlightedFeature.setStyle(undefined);
    }
    
    feature.setStyle(getHighlightStyle);
    currentlyHighlightedFeature = feature;
  };

  const resetSelection = (): void => {
    clickSyncState.name = null;
    clickSyncState.life_exp = 'Неизвестна продолжительность жизни в этом регионе';
    clickSyncState.color = 'rgba(200, 200, 200, 1)';
    clickSyncState.coord = null;
    if (currentlyHighlightedFeature) {
      currentlyHighlightedFeature.setStyle(undefined);
      currentlyHighlightedFeature = null;
    }
  };

  const {searchInMap, selectRegionByName} = useMapSearch(regionsSource, clickSyncState, () => popupOverlay, () => mapInstance, highlightFeature);
  
  watchEffect(() => {
    if (clickSyncState.name && clickSyncState.coord) {
      onRegionClick({ 
        coord: null,
        name: clickSyncState.name, 
        id: clickSyncState.name, 
        life_exp: clickSyncState.life_exp,
        color: clickSyncState.color,
      });
      if (popupOverlay) {
        popupOverlay.setPosition(clickSyncState.coord);
      }
    } 
  });


  let currentAbortController: AbortController | null = null;
  
  onMounted(async () => {
    if (!targetRef.value) return;
    
    reliefLayer = new TileLayer({
      visible: true,
      source: new XYZ({
        url: 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=ru',
      }),
    });
    
    sputnikLayer = new TileLayer({
      visible: false,
      source: new XYZ({
        url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=ru',
      }),
    });
    
    regionsLayer = new VectorImageLayer({
      source: regionsSource,
      visible: false,
      style: getLayerStyle, 
    });
    
    popupOverlay = new Overlay({
      element: popupRef.value as HTMLElement,
      stopEvent: true,
    });
    
    mapInstance = new Map({
      target: targetRef.value,
      
      layers: [
        sputnikLayer,
        reliefLayer,
        regionsLayer,
      ],
      
      overlays: [popupOverlay],
      
      view: new View({
        // projection: 'EPSG:4326',
        center: [9715580, 6295000],
        zoom: 2,
      }),
    });

    handleMapClick = (event) => {
      if (!mapInstance || !regionsLayer) return;
      
      const clickedRegion = mapInteractionService.getRegionAtPixel(mapInstance, event.pixel, regionsLayer);
      
      if (clickedRegion) {
        const feature = mapInteractionService.getFeatureByName(clickedRegion.name ?? 'Неизвестный регион');
        if (feature) {
          highlightFeature(feature);
        }       
        clickSyncState.name = clickedRegion.name;
        clickSyncState.life_exp = clickedRegion.life_exp;
        clickSyncState.color = clickedRegion.color;
        clickSyncState.coord = event.coordinate;
      } else {
        resetSelection();
      }
    };
    
    mapInstance.on('click', handleMapClick);

    const view = mapInstance.getView();
    
    mapInstance.on('moveend', async () => {
      const extent = view.calculateExtent(mapInstance!.getSize());
      const zoom = view.getZoom();

      if (!extent || zoom === undefined) return;

      import('ol/proj').then(async ({ transformExtent }) => {
        const bbox4326 = transformExtent(extent, 'EPSG:3857', 'EPSG:4326') as [number, number, number, number];

        if (currentAbortController) {
          currentAbortController.abort();
        }

        currentAbortController = new AbortController();
        const { signal } = currentAbortController;

        try {
          const features = await geoService.getFeatures({
            sourceId: ACTIVE_SOURCE_ID,
            bbox: bbox4326,
            zoom: Math.round(zoom),
            limit: 1000
          }, signal);

          const previousHighlightedName = clickSyncState.name;

          regionsSource.clear();
          regionsSource.addFeatures(features);
          mapInteractionService.indexFeatures(features);

          if (previousHighlightedName) {
            const foundFeature = mapInteractionService.getFeatureByName(previousHighlightedName);
            
            if (foundFeature) {
              foundFeature.setStyle(getHighlightStyle);
              currentlyHighlightedFeature = foundFeature;
            } else {
              currentlyHighlightedFeature = null;
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          console.error('Ошибка при обновлении регионов на карте:', error);
        } finally {
          if (currentAbortController?.signal === signal) {
            currentAbortController = null;
          }
        }
      });
    });
  });

  
  onUnmounted(() => {
    if (mapInstance) {
      mapInstance.un('click', handleMapClick);
      mapInstance.getOverlays().clear();
      mapInstance.getLayers().clear();
      mapInstance.setTarget(undefined);
      mapInstance = null;
    }
    
    regionsSource.clear();
    regionsLayer = null;
    popupOverlay = null; 
    currentlyHighlightedFeature = null;
    if (currentAbortController) currentAbortController.abort();
  });

  
  const hidePopup = (): void => {
    if (popupOverlay) {
      popupOverlay.setPosition(undefined);
    }
    
    resetSelection();
  };

  const setReliefVisibility = (visible: boolean): void => {
    if (reliefLayer && sputnikLayer) {
      reliefLayer.setVisible(visible);
      sputnikLayer.setVisible(!visible);
    }
  };
  
  const setSputnikVisibility = (visible: boolean): void => {
    if (sputnikLayer && reliefLayer) {
      sputnikLayer.setVisible(visible);
      reliefLayer.setVisible(!visible);
    }
  };

  const setRegionsVisibility = (visible: boolean): void => {
    if (regionsLayer) {
      regionsLayer.setVisible(visible);
    }
  };
  
  const setOpacity = (opacity: number): void => {
    if (regionsLayer) {
      regionsLayer.setOpacity(opacity);
    }
  };

  return {
    setReliefVisibility,
    setSputnikVisibility,
    setRegionsVisibility,
    setOpacity,
    hidePopup,
    highlightFeature,
    searchInMap,
    selectRegionByName,
  };
}
