<script setup>
// RouterView will render either the LoginView or the POSLayout
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>

<template>
  <RouterView />
  <Toaster position="top-right" richColors />
</template>