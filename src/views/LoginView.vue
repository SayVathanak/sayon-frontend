<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

// Default values for quick testing against the backend's seeded user
// Since you provided empty ref, we will use that:
const username = ref('cashier1'); 
const password = ref('pos-secure-password'); 

async function handleLogin() {
  const success = await auth.login(username.value, password.value);
  
  if (success) {
    // 💡 FINAL FIX: Determine destination based on the role stored in the Pinia state.
    // This is the safest way to prevent the router guard from kicking off a loop.
    const destination = auth.user.role === 'admin' ? 'admin-dashboard' : 'pos-main';
    router.push({ name: destination }); 
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-xl">
      <h2 class="text-3xl font-bold text-center text-gray-800 mb-6">Cashier Login</h2>
      
      <p v-if="auth.authError" class="text-sm text-red-600 mb-4 text-center p-2 bg-red-50 border border-red-200 rounded">
        {{ auth.authError }}
      </p>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
          <input 
            id="username"
            v-model="username"
            type="text"
            required
            class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        <button
          type="submit"
          :disabled="auth.isLoading"
          class="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <span v-if="auth.isLoading">Logging in...</span>
          <span v-else>Login</span>
        </button>
      </form>
      <div class="mt-4 text-center text-sm text-gray-500">
          Hint: cashier1 / pos-secure-password
      </div>
    </div>
  </div>
</template>