// sayon-frontend/src/stores/branches.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';

export const useBranchStore = defineStore('branches', () => {
    // State
    const branchList = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    // Actions
    async function fetchBranches() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/branches');
            branchList.value = response.data;
        } catch (err) {
            console.error('Fetch branches error:', err);
            error.value = 'Failed to load branch list.';
        } finally {
            isLoading.value = false;
        }
    }

    async function addBranch(branchData) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/branches', branchData);
            // Add new branch to the list immediately
            branchList.value.unshift(response.data);
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to create branch.';
            error.value = msg;
            throw new Error(msg);
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteBranch(id) {
        try {
            await apiClient.delete(`/branches/${id}`);
            // Remove from list
            branchList.value = branchList.value.filter(b => b.user_id !== id);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to delete branch.';
            alert(msg);
        }
    }

    return { branchList, isLoading, error, fetchBranches, addBranch, deleteBranch };
});