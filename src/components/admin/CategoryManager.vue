<template>
  <div class="p-6 bg-white rounded-lg shadow-md">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Category Management</h2>
      <button 
        @click="openAddModal"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition"
      >
        <span>+ Add Category</span>
      </button>
    </div>

    <div v-if="store.error" class="mb-4 p-4 bg-red-100 text-red-700 rounded-md flex justify-between items-center">
      <span>{{ store.error }}</span>
      <button @click="store.error = null" class="font-bold">✕</button>
    </div>

    <div v-if="store.isLoading" class="text-center py-8 text-gray-500">
      Loading categories...
    </div>

    <div v-else class="overflow-x-auto border rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="category in store.categories" :key="category.category_id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              #{{ category.category_id }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ category.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button 
                @click="openEditModal(category)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Edit
              </button>
              <button 
                @click="confirmDelete(category)"
                class="text-red-600 hover:text-red-900"
              >
                Delete
              </button>
            </td>
          </tr>
          
          <tr v-if="store.categories.length === 0">
            <td colspan="3" class="px-6 py-8 text-center text-gray-500">
              No categories found. Add one to get started.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 backdrop-blur-2xl shadow-2xl bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 class="text-xl font-bold mb-4">
          {{ isEditing ? 'Edit Category' : 'Add New Category' }}
        </h3>
        
        <form @submit.prevent="handleSubmit">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Category Name</label>
            <input 
              v-model="form.name"
              type="text" 
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Coffee, Pastries"
              required
            />
          </div>

          <div class="flex justify-end gap-3">
            <button 
              type="button" 
              @click="closeModal"
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useCategoryStore } from '../../stores/categories'; // Ensure path is correct

const store = useCategoryStore();

// Modal State
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);

// Form Data
const form = reactive({
  id: null,
  name: ''
});

// Load Data on Mount
onMounted(() => {
  store.fetchCategories();
});

// --- Actions ---

function openAddModal() {
  isEditing.value = false;
  form.id = null;
  form.name = '';
  showModal.value = true;
}

function openEditModal(category) {
  isEditing.value = true;
  form.id = category.category_id;
  form.name = category.name;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  store.error = null; // Clear any previous errors
}

async function handleSubmit() {
  if (!form.name.trim()) return;
  
  isSubmitting.value = true;
  
  try {
    if (isEditing.value) {
      await store.updateCategory(form.id, form.name);
    } else {
      await store.addCategory(form.name);
    }
    closeModal();
  } catch (err) {
    // Error is handled in store, but we catch here to stop modal closing if needed
    // The store sets store.error, which is displayed in the template
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete(category) {
  if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
    try {
      await store.deleteCategory(category.category_id);
    } catch (err) {
      // Logic handled in store (it will display the foreign key error if products exist)
      alert(store.error); // Optional: show browser alert for delete specific errors
    }
  }
}
</script>