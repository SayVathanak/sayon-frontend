<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useProductStore } from '../stores/products';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const products = useProductStore();
const router = useRouter();

// State to track if we are adding or editing
const isEditing = ref(false);
const editingId = ref(null);
const statusMessage = ref('');

// Reactive form data (reused for both Add and Edit)
const productForm = reactive({
    category_id: 1, 
    name: '',
    price: 0.00,
    is_available: true
});

onMounted(() => {
    if (auth.user?.role !== 'admin') {
        alert('Access Denied. Redirecting to POS.');
        router.push({ name: 'pos-main' });
        return;
    }
    products.fetchAllProducts();
});

// --- HELPER: Reset Form ---
function resetForm() {
    productForm.name = '';
    productForm.price = 0.00;
    productForm.category_id = 1;
    productForm.is_available = true;
    isEditing.value = false;
    editingId.value = null;
    statusMessage.value = '';
}

// --- ACTION: Populate Form for Editing ---
function startEdit(product) {
    productForm.name = product.name;
    productForm.price = product.price;
    productForm.category_id = product.category_id; // Ensure backend sends this as integer
    productForm.is_available = product.is_available;
    
    isEditing.value = true;
    editingId.value = product.product_id;
    statusMessage.value = `Editing "${product.name}"...`;
    
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ACTION: Submit (Handles both Add and Edit) ---
async function handleSubmit() {
    statusMessage.value = '';
    
    try {
        if (isEditing.value) {
            // Update existing product
            await products.updateProduct(editingId.value, productForm);
            statusMessage.value = `Success: Updated product "${productForm.name}".`;
            resetForm(); // Clear form after success
        } else {
            // Add new product
            await products.addProduct(productForm);
            statusMessage.value = `Success: Added new product "${productForm.name}".`;
            resetForm(); // Clear form after success
        }
    } catch (err) {
        statusMessage.value = `Error: ${err.message}`;
    }
}

// --- ACTION: Delete ---
async function handleDeleteProduct(productId, productName) {
    if (confirm(`Are you sure you want to delete ${productName}?`)) {
        statusMessage.value = '';
        try {
            await products.deleteProduct(productId);
            statusMessage.value = `Success: Deleted product "${productName}".`;
            // If we were editing this deleted product, reset the form
            if (editingId.value === productId) resetForm();
        } catch (err) {
            statusMessage.value = `Error: ${err.message}`;
        }
    }
}

function handleLogout() {
    auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-8 border-b pb-4">
        <h1 class="text-4xl font-extrabold text-indigo-700">Admin Dashboard</h1>
        <div>
            <span class="font-medium text-gray-700 mr-4">User: {{ auth.userName }} (Admin)</span>
            <button @click="handleLogout" class="text-sm text-red-500 hover:text-red-700">
                (Logout)
            </button>
        </div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg mb-8 border border-indigo-200">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold" :class="isEditing ? 'text-indigo-600' : 'text-gray-800'">
                {{ isEditing ? 'Edit Product' : 'Add New Product' }}
            </h2>
            <button v-if="isEditing" @click="resetForm" class="text-sm text-gray-500 underline">
                Cancel Edit
            </button>
        </div>

        <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div class="md:col-span-1">
                <label class="block text-sm font-medium text-gray-700">Name</label>
                <input v-model="productForm.name" type="text" required class="mt-1 block w-full border rounded-md p-2"/>
            </div>
            
            <div class="md:col-span-1">
                <label class="block text-sm font-medium text-gray-700">Price ($)</label>
                <input v-model.number="productForm.price" type="number" step="0.01" required class="mt-1 block w-full border rounded-md p-2"/>
            </div>
            
            <div class="md:col-span-1">
                <label class="block text-sm font-medium text-gray-700">Category</label>
                <select v-model.number="productForm.category_id" class="mt-1 block w-full border rounded-md p-2">
                    <option :value="1">Hot Coffee</option>
                    <option :value="2">Iced Coffee</option>
                    <option :value="3">Pastries</option>
                </select>
            </div>
            
            <div class="md:col-span-1 flex items-center h-10 pb-2">
                 <input type="checkbox" v-model="productForm.is_available" id="avail" class="mr-2 h-5 w-5 text-indigo-600">
                 <label for="avail" class="text-sm font-medium text-gray-700">Available?</label>
            </div>

            <div class="md:col-span-1">
                <button type="submit" :disabled="products.isLoading" 
                    class="w-full py-2 text-white rounded-md transition duration-150 disabled:opacity-50"
                    :class="isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'"
                >
                    {{ products.isLoading ? 'Processing...' : (isEditing ? 'Update Product' : 'Add Product') }}
                </button>
            </div>
        </form>

        <p v-if="statusMessage" class="mt-4 text-sm font-medium" :class="statusMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'">
            {{ statusMessage }}
        </p>
    </div>

    <h2 class="text-2xl font-bold mb-4">Current Products ({{ products.productList.length }})</h2>
    
    <div v-if="products.isLoading && !isEditing" class="text-center py-10 text-gray-500">
        Loading product list...
    </div>
    
    <div v-else>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-lg shadow-md">
                <thead>
                    <tr class="w-full border-b bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th class="py-3 px-6 text-left">Product Name</th>
                        <th class="py-3 px-6 text-left">Category</th>
                        <th class="py-3 px-6 text-right">Price</th>
                        <th class="py-3 px-6 text-center">Status</th>
                        <th class="py-3 px-6 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="text-gray-600 text-sm font-light">
                    <tr v-for="product in products.productList" :key="product.product_id" 
                        class="border-b border-gray-200 hover:bg-gray-50 transition"
                        :class="{'bg-indigo-50': editingId === product.product_id}" 
                    >
                        <td class="py-3 px-6 text-left font-medium">{{ product.name }}</td>
                        <td class="py-3 px-6 text-left">{{ product.category_name }}</td>
                        <td class="py-3 px-6 text-right">${{ Number(product.price).toFixed(2) }}</td>
                        <td class="py-3 px-6 text-center">
                            <span :class="product.is_available ? 'bg-green-200 text-green-600' : 'bg-red-200 text-red-600'" class="py-1 px-3 rounded-full text-xs font-bold">
                                {{ product.is_available ? 'Active' : 'Disabled' }}
                            </span>
                        </td>
                        <td class="py-3 px-6 text-center">
                            <button 
                                @click="startEdit(product)"
                                class="text-indigo-500 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50"
                            >
                                Edit
                            </button>
                            <button 
                                @click="handleDeleteProduct(product.product_id, product.name)"
                                class="text-red-500 hover:text-red-800 text-xs font-bold uppercase tracking-wider border border-red-200 px-3 py-1 rounded ml-2 hover:bg-red-50"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>