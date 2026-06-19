<script lang="ts" src="./App.ts"></script>


<template>
    <main class="app-layer">

        <div ref="mapContainer" class="map-container"></div>
        
        
        <div class="map-layers">
            <h4>Слои</h4>
            <div class="layer-item">

            <div class="layer-main-info">
                <button class="btn-visibility" @click="updateReliefVisibility">
                {{ isReliefVisible ? 'Скрыть' : 'Показать' }}
                </button>

                <span class="layer-title"> Рельеф </span>
            </div>

            <div class="layer-main-info">
                <button class="btn-visibility" @click="updateSputnikVisibility">
                {{ isSputnikVisible ? 'Скрыть' : 'Показать' }}
                </button>

                <span class="layer-title"> Спутник </span>
            </div>
            <div class="layer-main-info">
                <button class="btn-visibility" @click="updateRegionsVisibility">
                {{ isRegionsVisible ? 'Скрыть' : 'Показать' }}
                </button>

                <span class="layer-title"> Средний срок жизни</span>
            </div>
            
            <div class="opacity-control">
                <label>Прозрачность</label>
                <input type="range" min="0" max="1" step="0.002" v-model.number="regionsOpacity" @input="updateRegionsOpacity"/>
            </div>
            </div>
        </div>
        
        <div ref="popupElement" class="popup-anchor">
        
            <div v-show="isPopupVisible" class="map-popup">
                <div class="popup-header">
                    <h4>{{ selectedRegionName }}</h4>
                    <button @click="closePopup" class="popup-close-btn"> ✖ </button>
                </div>

                <h4 v-if="typeof selectedRegionLifeExp === 'number'"> Срд. срок жизни:
                    <span :style="{ color: selectedRegionColor, fontWeight: 'bold' }">
                    {{ selectedRegionLifeExp }}
                    </span>
                    {{ getYearWord(selectedRegionLifeExp) }}
                </h4>

            </div>

        </div>
        
        <div class="map-search">
            <div class="search-input-wrapper">
                <input type="text" placeholder="Поиск региона..." v-model="searchQuery" @input="handleSearch"/>
            </div>
        
            <div class="search-results-list" v-show="searchResults.length > 0">
                <div v-for="region in searchResults" :key="region.name" class="search-result-item" @click="selectFoundRegion(region)" >
                    <span class="result-marker-dot"></span>
                    <span class="result-title">{{ region.name }}</span>
                </div>
            </div>
        </div>
    </main>

</template>


<style scoped lang="scss" src="./App.scss"></style>
