<script setup>
import { ref } from 'vue';

defineProps({
  isScrolled: Boolean,
  isHidden: Boolean,
  scrollProgress: Number,
});

const mobileMenuOpen = ref(false);

const navItems = [
  { href: '#home', label: 'Accueil' },
  { href: '#about', label: 'A propos' },
  { href: '#projects', label: 'Projets' },
  { href: '#contact', label: 'Contact' },
];

const scrollToSection = (hash) => {
  const target = document.querySelector(hash);
  const header = document.querySelector('.header');
  if (!target) return;
  const offset = header ? header.offsetHeight : 0;
  window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
};

const onNavClick = (event, hash) => {
  event.preventDefault();
  scrollToSection(hash);
  mobileMenuOpen.value = false;
};
</script>

<template>
  <div class="scroll-progress" :style="{ width: `${scrollProgress}%` }"></div>

  <header class="header" :class="{ scrolled: isScrolled, hidden: isHidden }">
    <nav class="nav">
      <div class="logo-container">
        <div class="profile-pic">
          <img src="/images/placeholder.svg" alt="Ethan Bacquier" />
        </div>
        <div class="logo">BACQUIER ETHAN</div>
      </div>

      <ul class="nav-links" :class="{ active: mobileMenuOpen }">
        <li v-for="item in navItems" :key="item.href">
          <a :href="item.href" @click="(event) => onNavClick(event, item.href)">{{ item.label }}</a>
        </li>
      </ul>

      <button
        class="mobile-menu-toggle"
        aria-label="Toggle menu"
        :class="{ active: mobileMenuOpen }"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  </header>
</template>
