<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { projects } from '../data/projects';

const activeProjectId = ref('');

const activeProject = computed(() =>
  projects.find((project) => project.id === activeProjectId.value)
);

const openProjectModal = (projectId) => {
  activeProjectId.value = projectId;
};

const closeProjectModal = () => {
  activeProjectId.value = '';
};

const onEscape = (event) => {
  if (event.key === 'Escape') closeProjectModal();
};

watch(activeProjectId, (projectId) => {
  document.body.classList.toggle('modal-open', Boolean(projectId));
  document.body.style.overflow = projectId ? 'hidden' : '';
});

onMounted(() => window.addEventListener('keydown', onEscape));

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEscape);
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
});
</script>

<template>
  <section id="projects" class="section projects">
    <div class="projects-intro">
      <h2 class="section-title-large">PROJETS</h2>
      <p class="projects-description">
        Une selection de mes projets les plus marquants, alliant creativite et performance technique.
      </p>
    </div>

    <div class="helmets-gallery">
      <article
        v-for="project in projects"
        :key="project.id"
        class="helmet-card"
        :data-project="project.id"
      >
        <div class="helmet-images">
          <div class="helmet-img helmet-img-1">
            <img :src="project.image" :alt="`${project.name} Project`" loading="lazy" />
          </div>
          <div class="helmet-img helmet-img-2">
            <div class="project-preview">
              <div class="project-tech-badge">{{ project.badge }}</div>
            </div>
          </div>
        </div>

        <div class="helmet-info">
          <h3 class="helmet-name">{{ project.name }}</h3>
          <p class="helmet-year">{{ project.year }}</p>
        </div>

        <div class="project-description">
          <p class="project-desc-text">{{ project.shortDesc }}</p>
          <div class="project-tech-stack">
            <span
              v-for="tech in project.techStack.slice(0, 3)"
              :key="`${project.id}-${tech}`"
              class="tech-tag"
            >{{ tech }}</span>
          </div>
          <button class="btn-more-info" @click="openProjectModal(project.id)">EN SAVOIR PLUS</button>
        </div>
      </article>
    </div>
  </section>

  <div
    v-if="activeProject"
    class="project-details active"
    :data-project-id="activeProject.id"
    @click.self="closeProjectModal"
  >
    <div class="project-details-content">
      <button class="btn-close-details" @click="closeProjectModal">✕</button>
      <div class="project-details-header">
        <h3>{{ activeProject.fullName }}</h3>
        <p class="project-year">{{ activeProject.year }}</p>
      </div>
      <div class="project-details-body">
        <div class="project-details-left">
          <p class="project-full-desc">{{ activeProject.fullDesc }}</p>
          <div class="project-tech-details">
            <span
              v-for="tech in activeProject.techStack"
              :key="`detail-${tech}`"
              class="tech-tag"
            >{{ tech }}</span>
          </div>
        </div>
        <div class="project-details-right">
          <h4>Fonctionnalites :</h4>
          <ul>
            <li v-for="feature in activeProject.features" :key="feature">{{ feature }}</li>
          </ul>
        </div>
      </div>
      <a :href="activeProject.githubUrl" target="_blank" rel="noopener noreferrer" class="btn-github">
        VOIR SUR GITHUB
      </a>
    </div>
  </div>
</template>
