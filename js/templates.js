// Templates pour les projets
const Templates = {
    // Template pour une carte projet
    projectCard(project) {
        return `
            <div class="helmet-card" data-project="${project.id}">
                <div class="helmet-images">
                    <div class="helmet-img helmet-img-1">
                        <img src="${project.image}" alt="${project.name} Project" loading="lazy">
                    </div>
                    <div class="helmet-img helmet-img-2">
                        <div class="project-preview">
                            <div class="project-tech-badge">${project.badge}</div>
                        </div>
                    </div>
                </div>
                <div class="helmet-info">
                    <h3 class="helmet-name">${project.name}</h3>
                    <p class="helmet-year">${project.year}</p>
                </div>
                <div class="project-description">
                    <p class="project-desc-text">${project.shortDesc}</p>
                    <div class="project-tech-stack">
                        ${project.techStack.slice(0, 3).map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                    </div>
                    <button class="btn-more-info">EN SAVOIR PLUS</button>
                </div>
            </div>
        `;
    },

    // Template pour un modal de détails
    projectModal(project) {
        return `
            <div class="project-details" data-project-id="${project.id}">
                <div class="project-details-content">
                    <button class="btn-close-details">✕</button>
                    <div class="project-details-header">
                        <h3>${project.fullName}</h3>
                        <p class="project-year">${project.year}</p>
                    </div>
                    <div class="project-details-body">
                        <div class="project-details-left">
                            <p class="project-full-desc">${project.fullDesc}</p>
                            <div class="project-tech-details">
                                ${project.techStack.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                            </div>
                        </div>
                        <div class="project-details-right">
                            <h4>Fonctionnalités :</h4>
                            <ul>
                                ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn-github">
                        ${GITHUB_SVG}
                        VOIR SUR GITHUB
                    </a>
                </div>
            </div>
        `;
    }
};
