<template>
  <div id="receipt-print-area" class="hidden-print-layout">
    <div class="receipt-content">
      <div class="text-center mb-4">
        <h2 class="font-black text-xl uppercase">Sayon Coffee</h2>
        <p class="text-xs">St. 230, Phnom Penh</p>
        <p class="text-xs">Tel: 012-345-678</p>
      </div>

      <div class="border-b border-dashed border-black my-2"></div>

      <div class="flex justify-between text-xs mb-2">
        <span>Date: {{ new Date().toLocaleDateString() }}</span>
        <span>Time: {{ new Date().toLocaleTimeString() }}</span>
      </div>
      <div class="text-xs mb-2">Order ID: #{{ orderId }}</div>

      <div class="border-b border-dashed border-black my-2"></div>

      <table class="w-full text-xs text-left">
        <thead>
          <tr>
            <th class="pb-1">Item</th>
            <th class="pb-1 text-center">Qty</th>
            <th class="pb-1 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in items" :key="i">
            <td class="py-1">
                {{ item.name }}
                <div v-if="item.name.includes('(')" class="text-[10px] text-gray-500 pl-1">
                   {{ item.name.split('(')[1].replace(')', '') }}
                </div>
            </td>
            <td class="py-1 text-center">{{ item.quantity }}</td>
            <td class="py-1 text-right">${{ (Number(item.price) * item.quantity).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="border-b border-dashed border-black my-2"></div>

      <div class="flex justify-between font-bold text-sm mt-2">
        <span>TOTAL</span>
        <span>${{ Number(total).toFixed(2) }}</span>
      </div>
      
      <div class="text-center text-[10px] mt-6">
        <p>Thank you for supporting local!</p>
        <p>Wi-Fi: Sayon_Guest / Pass: coffee123</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  orderId: [String, Number],
  items: Array,
  total: [Number, String] // 💡 FIX 3: Allow String or Number
});
</script>

<style>
/* 1. HIDE EVERYTHING ELSE */
@media print {
  body, 
  #app, 
  .pos-layout, 
  main, 
  aside, 
  header, 
  .touch-action-manipulation {
    visibility: hidden !important;
    display: none !important; /* Force layout removal */
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
  }

  /* 2. SHOW ONLY THE RECEIPT */
  #receipt-print-area {
    visibility: visible !important;
    display: block !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important; /* Let printer driver handle width */
    margin: 0 !important;
    padding: 0 !important;
    background: white;
    z-index: 999999 !important; /* Sit on top of everything */
  }

  /* 3. SHOW CHILDREN OF RECEIPT */
  #receipt-print-area * {
    visibility: visible !important;
  }
  
  /* 4. REMOVE BROWSER MARGINS */
  @page {
    size: auto;
    margin: 0;
  }
}

/* Hide receipt on normal screen */
.hidden-print-layout {
  display: none;
}
</style>