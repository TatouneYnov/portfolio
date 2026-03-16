<script setup>
defineProps({
  visible: Boolean,
});

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<template>
  <button
    id="backToTop"
    class="back-to-top"
    :class="{ visible }"
    aria-label="Retour en haut"
    title="Retour en haut"
    @click="scrollToTop"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>
</template>
