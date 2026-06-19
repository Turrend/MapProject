import { type FeatureLike } from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';

export const getRegionColor = (lifeExp: number | 'Неизвестна продолжительность жизни в этом регионе', minExp: number = 66.5, maxExp: number = 79.8): string => {
    if (lifeExp == 'Неизвестна продолжительность жизни в этом регионе') return 'rgba(200, 200, 200, 1)';
    const denominator = maxExp - minExp;
    const factor = denominator > 0 ? (lifeExp - minExp) / denominator : 0.5;
  const clampedFactor = Math.max(0, Math.min(1, factor));

  const r = Math.round((1 - clampedFactor) * 255);
  const g = Math.round(clampedFactor * 255);
  
  return `rgba(${r}, ${g}, 150, 1)`;
};

export const getLayerStyle = (feature: FeatureLike): Style => {
  const lifeExp = feature.get('life_exp') as number | undefined;

  if (lifeExp === undefined || typeof lifeExp !== 'number') {
    return new Style({
      fill: new Fill({ color: 'rgba(200, 200, 200, 1)' }),
      stroke: new Stroke({ color: 'rgba(150, 150, 150, 1)', width: 1 })
    });
  }

  const rgbColor = getRegionColor(lifeExp);

  return new Style({
    fill: new Fill({ color: rgbColor }),
    stroke: new Stroke({ color: 'rgba(255, 255, 255, 1)', width: 1 })
  });
};

export const getHighlightStyle = (feature: FeatureLike): Style => {
  const lifeExp = feature.get('life_exp') as number | undefined;
  
  if (lifeExp === undefined || typeof lifeExp !== 'number') {
    return new Style({
      fill: new Fill({ color: 'rgba(200, 200, 200, 1)' }),
      stroke: new Stroke({ color: 'rgba(50, 50, 50, 1)', width: 4 }),
      zIndex: 99
    });
  }

  const baseColor = getRegionColor(lifeExp);
  const solidColor = baseColor; 

  return new Style({
    fill: new Fill({ color: solidColor }),
    stroke: new Stroke({ color: '#ffffff', width: 4 }),
    zIndex: 99
  });
};
