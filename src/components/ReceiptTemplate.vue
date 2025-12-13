<script setup>
import { computed } from 'vue';

const props = defineProps({
  orderId: [String, Number],
  items: {
    type: Array,
    default: () => []
  },
  total: [Number, String],
  timestamp: {
    type: Date,
    default: () => new Date()
  }
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value));
};

const parseItem = (fullName) => {
  const match = fullName.match(/^(.*?)\s*\((.*)\)$/);
  if (match) {
    return { name: match[1], options: match[2] };
  }
  return { name: fullName, options: null };
};

const formattedDate = computed(() => props.timestamp.toLocaleDateString('en-GB'));
const formattedTime = computed(() => props.timestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }));
</script>

<template>
  <div id="receipt-print-area" class="hidden-print-layout">
    <div class="receipt-content">
      
      <div class="text-center mb-2">
        <h2 class="font-black text-base uppercase mb-0.5">Sayon Coffee</h2>
        <p class="text-[9px] text-black leading-tight">St. 230, Phnom Penh</p>
        <p class="text-[9px] text-black leading-tight">Tel: 012-345-678</p>
      </div>

      <div class="dashed-line"></div>
      
      <div class="flex justify-between text-[9px] font-mono my-1">
        <span>{{ formattedDate }}</span>
        <span>{{ formattedTime }}</span>
      </div>
      <div class="text-[9px] font-mono mb-1">Ref: #{{ orderId }}</div>

      <div class="dashed-line"></div>

      <table class="w-full text-[10px] text-left mt-1 mb-1 table-fixed">
        <thead>
          <tr class="font-bold border-b border-black">
            <th class="w-[55%] pb-1">Item</th>
            <th class="w-[15%] pb-1 text-center">Qty</th>
            <th class="w-[30%] pb-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody class="font-mono">
          <tr v-for="(item, i) in items" :key="i" class="align-top">
            <td class="pt-1 pr-1">
              <div class="font-bold leading-tight">{{ parseItem(item.name).name }}</div>
              <div v-if="parseItem(item.name).options" class="text-[8px] text-gray-600 leading-tight mt-0.5">
                - {{ parseItem(item.name).options }}
              </div>
            </td>
            <td class="pt-1 text-center align-top">{{ item.quantity }}</td>
            <td class="pt-1 text-right align-top">
              {{ formatCurrency(Number(item.price) * item.quantity) }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="dashed-line"></div>

      <div class="flex justify-between items-center font-black text-sm mt-1">
        <span>TOTAL</span>
        <span>{{ formatCurrency(total) }}</span>
      </div>
      
      <div class="text-center text-[9px] mt-4 font-mono leading-relaxed">
        <p>THANK YOU!</p>
        <p class="mt-0.5">Wi-Fi: Sayon_Guest</p>
      </div>

      <div class="h-4"></div>
    </div>
  </div>
</template>

<style>
.dashed-line {
  border-bottom: 1px dashed black;
  width: 100%;
  margin: 2px 0;
}

@media print {
  /* 1. Reset Page for 58mm Thermal Paper */
  @page {
    margin: 0;
    size: 58mm auto; /* Critical for Chrome/Edge to detect paper size */
  }

  body * {
    visibility: hidden;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
  }

  #receipt-print-area, 
  #receipt-print-area * {
    visibility: visible !important;
  }

  #receipt-print-area {
    position: absolute;
    left: 0;
    top: 0;
    
    /* 2. Set Width to match printable area of 58mm paper (~48mm) */
    width: 48mm; 
    
    /* Center it slightly if your printer prints left-aligned */
    margin-left: 1mm; 

    /* 3. Typography Adjustments */
    color: black !important;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px; /* Base font size */
    line-height: 1.1;
  }
}

.hidden-print-layout {
  display: none;
}

@media print {
  .hidden-print-layout {
    display: block !important;
  }
}
</style>