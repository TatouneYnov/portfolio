<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import TheHeader from './components/TheHeader.vue';
import HeroSection from './components/HeroSection.vue';
import AboutSection from './components/AboutSection.vue';
import ProjectsSection from './components/ProjectsSection.vue';
import ContactSection from './components/ContactSection.vue';
import TheFooter from './components/TheFooter.vue';
import BackToTop from './components/BackToTop.vue';

const isHeaderScrolled = ref(false);
const isHeaderHidden = ref(false);
const scrollProgress = ref(0);
const showBackToTop = ref(false);

let lastScrollY = 0;

const onScroll = () => {
  const currentScroll = window.scrollY;
  isHeaderScrolled.value = currentScroll > 100;
  isHeaderHidden.value = currentScroll > lastScrollY && currentScroll > 300;
  showBackToTop.value = currentScroll > 300;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.value = maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0;

  lastScrollY = currentScroll;
};

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <div>
    <canvas id="backgroundCanvas"></canvas>

    <TheHeader
      :is-scrolled="isHeaderScrolled"
      :is-hidden="isHeaderHidden"
      :scroll-progress="scrollProgress"
    />

    <HeroSection />
    <AboutSection />
    <ProjectsSection />
    <ContactSection />
    <TheFooter />
    <BackToTop :visible="showBackToTop" />
  </div>
</template>
