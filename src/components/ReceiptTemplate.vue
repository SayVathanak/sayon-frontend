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
  total: [Number, String]
});
</script>

<style>
/* ⚠️ IMPORTANT: NO 'scoped' here! We need global print rules. */

@media print {
  /* 1. Hide EVERYTHING on the page */
  body * {
    visibility: hidden;
  }

  /* 2. Lock the page size so it doesn't try to scroll */
  html, body {
    height: 100vh;
    overflow: hidden;
  }

  /* 3. Make only the receipt visible */
  #receipt-print-area, 
  #receipt-print-area * {
    visibility: visible !important;
  }

  /* 4. Position the receipt at the very top-left of the paper */
  #receipt-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%; /* Let printer driver decide width (58mm) */
    margin: 0;
    padding: 0;
    
    /* Optional: Ensure font is dark black for thermal paper */
    color: black;
    font-family: 'Courier New', Courier, monospace; 
  }

  /* 5. Clear browser margins */
  @page {
    size: auto;
    margin: 0;
  }
}

/* On normal screen, keep the receipt hidden */
.hidden-print-layout {
  display: none;
}

/* On print screen, show it */
@media print {
  .hidden-print-layout {
    display: block !important;
  }
}
</style>