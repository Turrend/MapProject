import { defineComponent, ref, shallowRef } from 'vue';
import { useMap} from '../map/composables/useMap';
import { ClickedRegionData, SearchResultUI } from '@/types';
import $ from 'jquery';

export default defineComponent({
    name: 'App',
    setup() {
        const mapContainer = ref<HTMLDivElement | null>(null);
        const popupElement = ref<HTMLDivElement | null>(null);
        
        const isReliefVisible = ref<boolean>(true);
        const isSputnikVisible = ref<boolean>(false);
        const isRegionsVisible = ref<boolean>(false);
        const regionsOpacity = ref<number>(1);

        const isPopupVisible = ref<boolean>(false);
        const selectedRegionName = ref<string>('');
        const selectedRegionLifeExp = ref<number | string>('Неизвестна продолжительность жизни в этом регионе');
        const selectedRegionColor = ref<string | 'rgba(200, 200, 200, 1)'>();

        const searchQuery = ref<string>('');
        const searchResults = shallowRef<SearchResultUI[]>([]);
        
        $(document).on('click', function(event) {
        if (!$(event.target).closest('#map-search').length) {
            searchResults.value = [];
        }
        });

        const handleRegionClick = (region: ClickedRegionData): void => {
            selectedRegionName.value = region.name ?? 'Неизвестный регион';
            selectedRegionLifeExp.value = region.life_exp;
            selectedRegionColor.value = region.color ??  'rgba(200, 200, 200, 1)';
            isPopupVisible.value = true;
        };

        const { 
            setReliefVisibility,
            setSputnikVisibility,
            setRegionsVisibility, 
            setOpacity, 
            hidePopup, 
            searchInMap,
            selectRegionByName,
        } = useMap(mapContainer, popupElement, handleRegionClick);

        const updateReliefVisibility = (): void => {
            isReliefVisible.value = !isReliefVisible.value;
            if (isReliefVisible.value) {
                isSputnikVisible.value = false;
            }
            if (!isReliefVisible.value) {
                isSputnikVisible.value = true;
            }
            setReliefVisibility(isReliefVisible.value);
        };
        
        const updateSputnikVisibility = (): void => {
            isSputnikVisible.value = !isSputnikVisible.value;
            if (isSputnikVisible.value) {
                isReliefVisible.value = false;
            }
            if (!isSputnikVisible.value) {
                isReliefVisible.value = true;
            }
            setSputnikVisibility(isSputnikVisible.value);
        };

        const updateRegionsVisibility = (): void => {
            isRegionsVisible.value = !isRegionsVisible.value;
            if (!isRegionsVisible.value) {
                isPopupVisible.value = false;
                hidePopup();
            }
            setRegionsVisibility(isRegionsVisible.value);
        };

        const updateRegionsOpacity = (): void => {
            setOpacity(regionsOpacity.value);
        };

        const closePopup = (): void => {
            isPopupVisible.value = false;
            hidePopup();
        };

        const handleSearch = async (): Promise<void> => {
            try {
                searchResults.value = await searchInMap(searchQuery.value);
                console.log(searchResults.value);
            } catch (error) {
                console.error("Ошибка при поиске:", error);
                searchResults.value = [];
            }
        };

        const selectFoundRegion = (region: SearchResultUI): void => {      
            selectedRegionName.value = region.name;
            console.log("selectFoundRegion", region.name);
            searchQuery.value = '';
            searchResults.value = []; 

            if (!isRegionsVisible.value) {
                isRegionsVisible.value = true;
                setRegionsVisibility(true);
            }

            selectRegionByName(region);
        };
 
        const getYearWord = (value: number): string => {
        const num = Math.round(value);
        const num1 = num % 10;
        const num2 = num % 100;
        
        if (num2 >= 11 && num2 <= 19) return ' лет';
        if (num1 === 1) return ' год';
        if (num1 >= 2 && num1 <= 4) return ' года';
        return ' лет';
        };

        return {
            mapContainer,
            isReliefVisible,
            isSputnikVisible,
            isRegionsVisible,
            regionsOpacity,
            updateReliefVisibility,
            updateSputnikVisibility,
            updateRegionsVisibility,
            updateRegionsOpacity,
            selectedRegionName,
            selectedRegionLifeExp,
            selectedRegionColor,
            closePopup,
            isPopupVisible,
            popupElement,
            searchQuery,
            searchResults,
            handleSearch,
            selectFoundRegion,
            getYearWord,

        };
    }
});