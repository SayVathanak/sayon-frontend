// sayon-frontend/src/stores/products.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api'; 

export const useProductStore = defineStore('products', () => {
    // --- STATE ---
    const productList = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    // --- ACTIONS ---
    async function fetchAllProducts() {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get('/products'); 
            productList.value = response.data;
            
        } catch (err) {
            error.value = err.response?.data?.message || 'Failed to fetch product list.';
            console.error('Product Fetch Error:', err);
        } finally {
            isLoading.value = false;
        }
    }

    async function addProduct(productData) {
        try {
            const response = await apiClient.post('/products', productData);
            productList.value.push(response.data); 
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Failed to add product.';
            throw err;
        }
    }
    
    async function updateProduct(id, productData) {
        try {
            // PATCH request to update the product by ID
            const response = await apiClient.patch(`/products/${id}`, productData);
            
            // Update the product in the local state
            const index = productList.value.findIndex(p => p.product_id === id);
            if (index !== -1) {
                // Replace the old object with the updated one
                productList.value.splice(index, 1, response.data);
            }
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || `Failed to update product ${id}.`;
            throw err;
        }
    }

    async function deleteProduct(id) {
        try {
            // DELETE request to remove the product by ID
            await apiClient.delete(`/products/${id}`);
            
            // Filter the product list to remove the deleted item from the local state
            productList.value = productList.value.filter(p => p.product_id !== id);
        } catch (err) {
            error.value = err.response?.data?.message || `Failed to delete product ${id}.`;
            throw err;
        }
    }

    return { 
        productList, isLoading, error, 
        fetchAllProducts, addProduct, updateProduct, deleteProduct 
    };
});