import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';

export const useCategoryStore = defineStore('categories', () => {
    const categories = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    // Fetch all categories
    async function fetchCategories() {
        isLoading.value = true;
        try {
            const response = await apiClient.get('/categories');
            categories.value = response.data;
        } catch (err) {
            console.error('Error fetching categories:', err);
            error.value = 'Failed to load categories';
        } finally {
            isLoading.value = false;
        }
    }

    // Add Category
    async function addCategory(name) {
        try {
            const response = await apiClient.post('/categories', { name });
            categories.value.push(response.data);
            return response.data;
        } catch (err) {
            throw err.response?.data?.error || 'Failed to add category';
        }
    }

    // Update Category
    async function updateCategory(id, name) {
        try {
            const response = await apiClient.patch(`/categories/${id}`, { name });
            const index = categories.value.findIndex(c => c.category_id === id);
            if (index !== -1) {
                categories.value[index] = response.data;
            }
            return response.data;
        } catch (err) {
            throw err.response?.data?.error || 'Failed to update category';
        }
    }

    // Delete Category
    async function deleteCategory(id) {
        try {
            await apiClient.delete(`/categories/${id}`);
            categories.value = categories.value.filter(c => c.category_id !== id);
        } catch (err) {
            // This will catch the "Cannot delete... contains products" error
            throw err.response?.data?.error || 'Failed to delete category';
        }
    }

    return {
        categories,
        isLoading,
        error,
        fetchCategories,
        addCategory,
        updateCategory,
        deleteCategory
    };
});