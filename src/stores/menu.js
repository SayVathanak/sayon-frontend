import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';

export const useMenuStore = defineStore('menu', () => {
    const menuData = ref({});
    const categories = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    async function fetchMenu() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/menu');
            menuData.value = response.data;
            categories.value = Object.keys(response.data);
            
            // 💡 DEBUG: Check if we are actually receiving options
            console.log("🔥 Menu Loaded:", response.data); 
        } catch (err) {
            console.error('Fetch menu error:', err);
            error.value = 'Failed to load menu.';
        } finally {
            isLoading.value = false;
        }
    }

    return { menuData, categories, isLoading, error, fetchMenu };
});