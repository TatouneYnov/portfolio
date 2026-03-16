<script setup>
import { reactive } from 'vue';

const contactForm = reactive({
  name: '',
  email: '',
  message: '',
});

const sendContact = () => {
  const subject = encodeURIComponent(`Message de ${contactForm.name} - Portfolio`);
  const body = encodeURIComponent(
    `Nom: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}`
  );
  window.location.href = `mailto:ethan.bacquier@ynov.com?subject=${subject}&body=${body}`;
  contactForm.name = '';
  contactForm.email = '';
  contactForm.message = '';
};
</script>

<template>
  <section id="contact" class="section contact">
    <div class="contact-container">
      <h2 class="section-title-large">TRAVAILLONS ENSEMBLE</h2>
      <div class="contact-grid">
        <div class="contact-info">
          <div class="contact-item-large">
            <span class="contact-label">EMAIL</span>
            <a href="mailto:ethan.bacquier@ynov.com" class="contact-link">ethan.bacquier@ynov.com</a>
          </div>
          <div class="contact-item-large">
            <span class="contact-label">TELEPHONE</span>
            <a href="tel:+33650142052" class="contact-link">+33 6 50 14 20 52</a>
          </div>
          <div class="contact-item-large">
            <span class="contact-label">LOCALISATION</span>
            <span class="contact-text">Lyon, France</span>
          </div>
        </div>

        <form class="contact-form-modern" @submit.prevent="sendContact">
          <div class="form-row">
            <input v-model="contactForm.name" type="text" name="name" placeholder="NOM" required />
          </div>
          <div class="form-row">
            <input v-model="contactForm.email" type="email" name="email" placeholder="EMAIL" required />
          </div>
          <div class="form-row">
            <textarea v-model="contactForm.message" name="message" rows="6" placeholder="MESSAGE" required></textarea>
          </div>
          <button type="submit" class="btn-modern">ENVOYER →</button>
        </form>
      </div>

      <div class="social-links-modern">
        <a href="https://github.com/TatouneYnov" target="_blank" rel="noopener noreferrer" class="social-link">GITHUB</a>
        <a href="https://www.linkedin.com/in/ethan-bacquier" target="_blank" rel="noopener noreferrer" class="social-link">LINKEDIN</a>
        <a href="https://twitter.com/ethan_bcqr" target="_blank" rel="noopener noreferrer" class="social-link">TWITTER</a>
        <a href="https://www.instagram.com/ethan.bcqr/" target="_blank" rel="noopener noreferrer" class="social-link">INSTAGRAM</a>
      </div>
    </div>
  </section>
</template>
