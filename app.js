(function() {
    'use strict';
    
    
    const AppState = {
        currentView: 'dashboard',
        quotes: [],
        authors: [],
        tags: [],
        stats: { totalQuotes: 0, totalAuthors: 0, totalTags: 0 },
        pagination: {
            current: 1,
            total: 0,
            perPage: 10,
            totalPages: 0
        },
        filters: {
            search: '',
            author: '',
            tag: ''
        },
        scraping: {
            isActive: false,
            progress: null,
            config: {
                maxPages: 10,
                delay: 1000,
                skipExisting: true
            }
        },
        modal: {
            currentQuote: null,
            isEditing: false
        }
    };

    
    async function apiRequest(method, url, data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erreur réseau' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container') || createToastContainer();
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    function showLoading(show, element = null) {
        if (element) {
            const spinner = element.querySelector('.spinner-border') || document.createElement('div');
            if (show) {
                spinner.className = 'spinner-border spinner-border-sm me-2';
                element.insertBefore(spinner, element.firstChild);
                element.disabled = true;
            } else {
                spinner.remove();
                element.disabled = false;
            }
        }
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    
    function initializeNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('href').substring(1);
                showSection(section);
                updateActiveNav(this);
            });
        });
    }

    function showSection(sectionName) {
        
        document.querySelectorAll('[id$="-section"]').forEach(section => {
            section.style.display = 'none';
        });
        
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            AppState.currentView = sectionName;
            
            switch (sectionName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'quotes':
                    loadQuotes();
                    break;
                case 'scraper':
                    loadScraperProgress();
                    break;
            }
        }
    }

    function updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    
    async function loadDashboard() {
        try {
            const stats = await apiRequest('GET', '/api/stats');
            AppState.stats = stats;
            updateStatsDisplay();
            
            const quotesData = await apiRequest('GET', '/api/quotes?limit=5');
            renderRecentQuotes(quotesData.quotes);
            
            await loadFiltersData();
            
        } catch (error) {
            showToast('Erreur lors du chargement du tableau de bord: ' + error.message, 'danger');
        }
    }

    function updateStatsDisplay() {
        const totalQuotesEl = document.getElementById('total-quotes');
        const totalAuthorsEl = document.getElementById('total-authors');
        const totalTagsEl = document.getElementById('total-tags');
        
        if (totalQuotesEl) totalQuotesEl.textContent = AppState.stats.totalQuotes || 0;
        if (totalAuthorsEl) totalAuthorsEl.textContent = AppState.stats.totalAuthors || 0;
        if (totalTagsEl) totalTagsEl.textContent = AppState.stats.totalTags || 0;
    }

    function renderRecentQuotes(quotes) {
        const container = document.getElementById('recent-quotes');
        if (!container) return;
        
        if (quotes.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-quote-left fa-3x text-muted mb-3"></i>
                    <h5>Aucune citation trouvée</h5>
                    <p class="text-muted">Commencez par ajouter des citations ou lancer le scraper.</p>
                    <button class="btn btn-primary" onclick="showAddQuoteModal()">
                        <i class="fas fa-plus me-1"></i>Ajouter une citation
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = quotes.map(quote => `
            <div class="card quote-card fade-in" data-quote-id="${quote.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <blockquote class="quote-text mb-3">
                                "${escapeHtml(quote.text)}"
                            </blockquote>
                            <div class="d-flex justify-content-between align-items-center">
                                <cite class="author-name">— ${escapeHtml(quote.author)}</cite>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewQuote(${quote.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="editQuote(${quote.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteQuote(${quote.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            ${quote.tags && quote.tags.length > 0 ? `
                                <div class="mt-2">
                                    ${quote.tags.map(tag => `<span class="badge bg-light text-dark tag-badge">${escapeHtml(tag)}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    
    async function loadQuotes() {
        try {
            const params = new URLSearchParams({
                page: AppState.pagination.current.toString(),
                limit: AppState.pagination.perPage.toString(),
                ...(AppState.filters.search && { search: AppState.filters.search }),
                ...(AppState.filters.author && { author: AppState.filters.author }),
                ...(AppState.filters.tag && { tag: AppState.filters.tag })
            });
            
            const data = await apiRequest('GET', `/api/quotes?${params}`);
            AppState.quotes = data.quotes;
            AppState.pagination = { ...AppState.pagination, ...data.pagination };
            
            renderQuotesTable();
            updatePagination();
            
        } catch (error) {
            showToast('Erreur lors du chargement des citations: ' + error.message, 'danger');
        }
    }

    function renderQuotesTable() {
        const tbody = document.querySelector('#quotes-table tbody');
        if (!tbody) return;
        
        if (AppState.quotes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center p-4">
                        <i class="fas fa-quote-left fa-3x text-muted mb-3"></i>
                        <h5>Aucune citation trouvée</h5>
                        <p class="text-muted">Essayez de modifier vos critères de recherche.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = AppState.quotes.map(quote => `
            <tr>
                <td>
                    <div class="text-truncate" style="max-width: 300px;" title="${escapeHtml(quote.text)}">
                        "${escapeHtml(quote.text)}"
                    </div>
                </td>
                <td>${escapeHtml(quote.author)}</td>
                <td>
                    ${quote.tags ? quote.tags.map(tag => `<span class="badge bg-secondary tag-badge">${escapeHtml(tag)}</span>`).join('') : ''}
                </td>
                <td class="text-muted">${formatDate(quote.created_at)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewQuote(${quote.id})" title="Voir">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="editQuote(${quote.id})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteQuote(${quote.id})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function updatePagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        const { current, totalPages } = AppState.pagination;
        let html = '';
        
        html += `
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${current - 1})" ${current === 1 ? 'tabindex="-1"' : ''}>
                    Précédent
                </a>
            </li>
        `;
        
        for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
            html += `
                <li class="page-item ${i === current ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        html += `
            <li class="page-item ${current === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${current + 1})" ${current === totalPages ? 'tabindex="-1"' : ''}>
                    Suivant
                </a>
            </li>
        `;
        
        paginationContainer.innerHTML = html;
    }

    
    window.showAddQuoteModal = function() {
        AppState.modal.isEditing = false;
        AppState.modal.currentQuote = null;
        
        const modal = document.getElementById('quoteModal');
        const title = modal.querySelector('.modal-title');
        const form = modal.querySelector('#quoteForm');
        
        title.textContent = 'Ajouter une nouvelle citation';
        form.reset();
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    };

    window.editQuote = async function(id) {
        try {
            const quote = await apiRequest('GET', `/api/quotes/${id}`);
            AppState.modal.isEditing = true;
            AppState.modal.currentQuote = quote;
            
            const modal = document.getElementById('quoteModal');
            const title = modal.querySelector('.modal-title');
            const form = modal.querySelector('#quoteForm');
            
            title.textContent = 'Modifier la citation';
            
            form.quoteText.value = quote.text;
            form.authorName.value = quote.author;
            form.quoteTags.value = quote.tags ? quote.tags.join(', ') : '';
            form.sourceUrl.value = quote.sourceUrl || '';
            
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
        } catch (error) {
            showToast('Erreur lors du chargement de la citation: ' + error.message, 'danger');
        }
    };

    window.viewQuote = async function(id) {
        try {
            const quote = await apiRequest('GET', `/api/quotes/${id}`);
            
            const modal = document.getElementById('quoteDetailModal');
        
            modal.querySelector('#detail-quote-text').textContent = `"${quote.text}"`;
            modal.querySelector('#detail-author-name').textContent = quote.author;
            
            const tagsContainer = modal.querySelector('#detail-tags-container');
            if (quote.tags && quote.tags.length > 0) {
                modal.querySelector('#detail-tags').innerHTML = quote.tags.map(tag => 
                    `<span class="badge bg-secondary me-1">${escapeHtml(tag)}</span>`
                ).join('');
                tagsContainer.style.display = 'block';
            } else {
                tagsContainer.style.display = 'none';
            }
            
            const sourceContainer = modal.querySelector('#detail-source-container');
            if (quote.sourceUrl) {
                modal.querySelector('#detail-source-url').href = quote.sourceUrl;
                modal.querySelector('#detail-source-url').textContent = quote.sourceUrl;
                sourceContainer.style.display = 'block';
            } else {
                sourceContainer.style.display = 'none';
            }
            
            modal.querySelector('#detail-created-date').textContent = formatDate(quote.created_at);
            
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
        } catch (error) {
            showToast('Erreur lors du chargement de la citation: ' + error.message, 'danger');
        }
    };

    window.deleteQuote = function(id) {
        AppState.modal.currentQuote = { id };
        
        const modal = document.getElementById('deleteModal');
        const confirmBtn = modal.querySelector('#confirmDelete');
        
        confirmBtn.onclick = () => confirmDelete(id);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    };

    window.confirmDelete = async function(id) {
        try {
            await apiRequest('DELETE', `/api/quotes/${id}`);
            showToast('Citation supprimée avec succès');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
            
            if (AppState.currentView === 'dashboard') {
                loadDashboard();
            } else if (AppState.currentView === 'quotes') {
                loadQuotes();
            }
            
        } catch (error) {
            showToast('Erreur lors de la suppression: ' + error.message, 'danger');
        }
    };

    function initializeFormValidation() {
        const form = document.getElementById('quoteForm');
        if (form) {
            form.addEventListener('submit', submitQuote);
        }
    }

    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = 'Ce champ est obligatoire';
        } else if (field.type === 'url' && value && !isValidUrl(value)) {
            isValid = false;
            message = 'Veuillez entrer une URL valide';
        }
        
        if (isValid) {
            hideFieldError(field);
        } else {
            showFieldError(field, message);
        }
        
        return isValid;
    }

    function showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }

    function hideFieldError(field) {
        field.classList.remove('is-invalid');
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    window.submitQuote = async function(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        let isFormValid = true;
        form.querySelectorAll('input, textarea').forEach(field => {
            if (!validateField(field)) {
                isFormValid = false;
            }
        });
        
        if (!isFormValid) return;
        
        showLoading(true, submitBtn);
        
        try {
            const formData = {
                text: form.quoteText.value.trim(),
                author: form.authorName.value.trim(),
                tags: form.quoteTags.value ? form.quoteTags.value.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
                sourceUrl: form.sourceUrl.value.trim() || null
            };
            
            if (AppState.modal.isEditing && AppState.modal.currentQuote) {
                await apiRequest('PUT', `/api/quotes/${AppState.modal.currentQuote.id}`, formData);
                showToast('Citation mise à jour avec succès');
            } else {
                await apiRequest('POST', '/api/quotes', formData);
                showToast('Citation ajoutée avec succès');
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('quoteModal'));
            modal.hide();
            
            if (AppState.currentView === 'dashboard') {
                loadDashboard();
            } else if (AppState.currentView === 'quotes') {
                loadQuotes();
            }
            
        } catch (error) {
            showToast('Erreur lors de la sauvegarde: ' + error.message, 'danger');
        } finally {
            showLoading(false, submitBtn);
        }
    };

    async function loadScraperProgress() {
        try {
            const progress = await apiRequest('GET', '/api/scraper/progress');
            updateScraperUI(progress);
            
            if (progress.isActive) {
                setTimeout(loadScraperProgress, 2000);
            }
        } catch (error) {
            console.error('Error loading scraper progress:', error);
        }
    }

    function updateScraperUI(progress) {
        document.getElementById('current-page').textContent = progress.currentPage || 0;
        document.getElementById('quotes-found').textContent = progress.quotesFound || 0;
        document.getElementById('new-quotes').textContent = progress.newQuotes || 0;
        document.getElementById('scraper-errors').textContent = progress.errors || 0;
        
        const progressBar = document.getElementById('scraper-progress');
        const percentage = progress.totalPages ? Math.round((progress.currentPage / progress.totalPages) * 100) : 0;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${percentage}%`;
        
        const statusEl = document.getElementById('scraper-status');
        if (progress.isActive) {
            statusEl.innerHTML = '<span class="status-indicator status-info"></span>Scraping en cours...';
        } else if (progress.isComplete) {
            statusEl.innerHTML = '<span class="status-indicator status-success"></span>Scraping terminé';
        } else {
            statusEl.innerHTML = '<span class="status-indicator status-warning"></span>En attente...';
        }
        
        if (progress.elapsedTime) {
            const minutes = Math.floor(progress.elapsedTime / 60);
            const seconds = progress.elapsedTime % 60;
            document.getElementById('elapsed-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        updateScraperLogs(progress.logs || []);
        updateScraperButtons(progress.isActive);
    }

    function updateScraperLogs(logs) {
        const container = document.getElementById('scraper-logs');
        if (!container) return;
        
        container.innerHTML = logs.map(log => {
            let logClass = 'log-info';
            if (log.includes('SUCCESS')) logClass = 'log-success';
            else if (log.includes('ERROR')) logClass = 'log-error';
            else if (log.includes('WARNING')) logClass = 'log-warning';
            
            return `<div class="${logClass}">${escapeHtml(log)}</div>`;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    function updateScraperButtons(isActive) {
        const startBtn = document.getElementById('start-scraper');
        const stopBtn = document.getElementById('stop-scraper');
        
        if (startBtn && stopBtn) {
            startBtn.disabled = isActive;
            stopBtn.disabled = !isActive;
        }
    }

    window.startScraping = async function() {
        try {
            const maxPagesEl = document.getElementById('max-pages');
            const delayEl = document.getElementById('delay');
            const skipExistingEl = document.getElementById('skip-existing');
            
            const config = {
                maxPages: parseInt(maxPagesEl.value),
                delay: parseInt(delayEl.value),
                skipExisting: skipExistingEl.checked
            };
            
            await apiRequest('POST', '/api/scraper/start', config);
            showToast('Scraping démarré avec succès');
            
            setTimeout(loadScraperProgress, 1000);
            
        } catch (error) {
            showToast('Erreur lors du démarrage du scraping: ' + error.message, 'danger');
        }
    };

    window.stopScraping = async function() {
        try {
            await apiRequest('POST', '/api/scraper/stop');
            showToast('Scraping arrêté');
            loadScraperProgress();
        } catch (error) {
            showToast('Erreur lors de l\'arrêt du scraping: ' + error.message, 'danger');
        }
    };

    async function loadFiltersData() {
        try {
            const [authorsData, tagsData] = await Promise.all([
                apiRequest('GET', '/api/authors'),
                apiRequest('GET', '/api/tags')
            ]);
            
            AppState.authors = authorsData;
            AppState.tags = tagsData;
            updateFiltersUI();
        } catch (error) {
            console.error('Error loading filters data:', error);
        }
    }

    function updateFiltersUI() {
        const authorFilter = document.getElementById('author-filter');
        const tagFilter = document.getElementById('tag-filter');
        
        if (authorFilter) {
            
            authorFilter.innerHTML = '<option value="">Tous les auteurs</option>' +
                AppState.authors.map(author => 
                    `<option value="${escapeHtml(author.name)}">${escapeHtml(author.name)} </option>`
                ).join('');
        }
        
        if (tagFilter) {
            tagFilter.innerHTML = '<option value="">Tous les tags</option>' +
                AppState.tags.map(tag => 
                    `<option value="${escapeHtml(tag.name)}">${escapeHtml(tag.name)} </option>`
                ).join('');
        }
    }

    function initializeFilters() {
        const searchInput = document.getElementById('search-input');
        const authorFilter = document.getElementById('author-filter');
        const tagFilter = document.getElementById('tag-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                AppState.filters.search = searchInput.value;
                AppState.pagination.current = 1;
                loadQuotes();
            }, 500));
        }
        
        if (authorFilter) {
            authorFilter.addEventListener('change', () => {
                AppState.filters.author = authorFilter.value;
                AppState.pagination.current = 1;
                loadQuotes();
            });
        }
        
        if (tagFilter) {
            tagFilter.addEventListener('change', () => {
                AppState.filters.tag = tagFilter.value;
                AppState.pagination.current = 1;
                loadQuotes();
            });
        }
    }

    window.filterByTag = function(tagName) {
        AppState.filters.tag = tagName;
        AppState.pagination.current = 1;
        showSection('quotes');
        
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.value = tagName;
        }
        
        loadQuotes();
    };

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    window.changePage = function(page) {
        if (page < 1 || page > AppState.pagination.totalPages) return;
        AppState.pagination.current = page;
        loadQuotes();
    };

    window.exportQuotes = async function(format = 'json') {
        try {
            const response = await fetch(`/api/export?format=${format}`);
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quotes.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Export réussi');
        } catch (error) {
            showToast('Erreur lors de l\'export: ' + error.message, 'danger');
        }
    };

    function initializeApp() {
        console.log('QuoteScraper application initialized successfully');
        
        initializeNavigation();
        
        initializeFormValidation();
       
        initializeFilters();
        
        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
