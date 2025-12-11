// sayon-frontend/src/stores/menu.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api'; 

export const useMenuStore = defineStore('menu', () => {
    // --- STATE ---
    // Stores menu grouped by category (e.g., {'Hot Coffee': [...], 'Pastries': [...]})
    const menuData = ref({}); 
    const categories = ref([]); // Stores category names for display order
    const isLoading = ref(false);
    const error = ref(null);

    // --- ACTIONS ---
    async function fetchMenu() {
        isLoading.value = true;
        error.value = null;

        try {
            // This call automatically includes the JWT token set during login
            const response = await apiClient.get('/menu'); 
            
            menuData.value = response.data;
            // Extract and set categories for use in the UI tabs/headers
            categories.value = Object.keys(response.data); 
            
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.error || 'Failed to connect to menu API.';
            console.error('Menu Fetch Error:', err);
        } finally {
            isLoading.value = false;
        }
    }

    return { menuData, categories, isLoading, error, fetchMenu };
});