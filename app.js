(function() {
    'use strict';
    
    // État global de l'application
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

    // Fonction pour les requêtes API
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
            
            console.log(`Requête API: ${method} ${url}`, data); // Debug
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erreur réseau' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Réponse API: ${method} ${url}`, result); // Debug
            return result;
        } catch (error) {
            console.error('Erreur API:', error);
            throw error;
        }
    }

    // Fonction pour afficher les notifications toast
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container') || createToastContainer();
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
        return container;
    }

    function showLoading(show, element = null) {
        if (element) {
            const spinner = element.querySelector('.spinner-border') || document.createElement('div');
            if (show) {
                spinner.className = 'spinner-border spinner-border-sm me-2';
                spinner.setAttribute('role', 'status');
                spinner.setAttribute('aria-hidden', 'true');
                element.insertBefore(spinner, element.firstChild);
                element.disabled = true;
            } else {
                spinner.remove();
                element.disabled = false;
            }
        }
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialisation de la navigation
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
        // Masquer toutes les sections
        document.querySelectorAll('[id$="-section"]').forEach(section => {
            section.style.display = 'none';
        });
        
        // Afficher la section cible
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            AppState.currentView = sectionName;
            
            // Charger les données selon la section
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

    // Chargement du tableau de bord avec correction
    async function loadDashboard() {
        console.log('Chargement du tableau de bord...'); // Debug
        
        try {
            // Afficher un indicateur de chargement
            showDashboardLoading(true);
            
            // Charger les statistiques
            console.log('Récupération des statistiques...'); // Debug
            const stats = await apiRequest('GET', '/api/stats');
            console.log('Statistiques reçues:', stats); // Debug
            
            AppState.stats = stats;
            updateStatsDisplay();
            
            // Charger les citations récentes
            console.log('Récupération des citations récentes...'); // Debug
            const quotesData = await apiRequest('GET', '/api/quotes?limit=5');
            console.log('Citations récentes reçues:', quotesData); // Debug
            
            renderRecentQuotes(quotesData.quotes || []);
            
            // Charger les données pour les filtres
            await loadFiltersData();
            
            showToast('Tableau de bord chargé avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors du chargement du tableau de bord:', error);
            showToast('Erreur lors du chargement du tableau de bord: ' + error.message, 'danger');
            
            // Afficher des valeurs par défaut en cas d'erreur
            AppState.stats = { totalQuotes: 0, totalAuthors: 0, totalTags: 0 };
            updateStatsDisplay();
            renderRecentQuotes([]);
        } finally {
            showDashboardLoading(false);
        }
    }

    function showDashboardLoading(show) {
        const recentQuotesContainer = document.getElementById('recent-quotes');
        if (recentQuotesContainer) {
            if (show) {
                recentQuotesContainer.innerHTML = `
                    <div class="text-center p-5">
                        <div class="spinner-custom mx-auto"></div>
                        <p class="mt-3 text-muted">Chargement des données du tableau de bord...</p>
                    </div>
                `;
            }
        }
    }

    function updateStatsDisplay() {
        console.log('Mise à jour de l\'affichage des statistiques:', AppState.stats); // Debug
        
        const totalQuotesEl = document.getElementById('total-quotes');
        const totalAuthorsEl = document.getElementById('total-authors');
        const totalTagsEl = document.getElementById('total-tags');
        
        if (totalQuotesEl) {
            const quotesCount = AppState.stats.totalQuotes || 0;
            totalQuotesEl.textContent = quotesCount;
            console.log('Citations mises à jour:', quotesCount); // Debug
        } else {
            console.error('Élément total-quotes introuvable'); // Debug
        }
        
        if (totalAuthorsEl) {
            const authorsCount = AppState.stats.totalAuthors || 0;
            totalAuthorsEl.textContent = authorsCount;
            console.log('Auteurs mis à jour:', authorsCount); // Debug
        } else {
            console.error('Élément total-authors introuvable'); // Debug
        }
        
        if (totalTagsEl) {
            const tagsCount = AppState.stats.totalTags || 0;
            totalTagsEl.textContent = tagsCount;
            console.log('Tags mis à jour:', tagsCount); // Debug
        } else {
            console.error('Élément total-tags introuvable'); // Debug
        }
    }

    function renderRecentQuotes(quotes) {
        const container = document.getElementById('recent-quotes');
        if (!container) {
            console.error('Conteneur recent-quotes introuvable'); // Debug
            return;
        }
        
        console.log('Rendu des citations récentes:', quotes); // Debug
        
        if (!quotes || quotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="display-icon">
                        <i class="fas fa-quote-left"></i>
                    </div>
                    <h5>Aucune citation trouvée</h5>
                    <p class="text-muted mb-4">Commencez par ajouter des citations ou lancer le scraper.</p>
                    <button class="btn btn-primary" onclick="showAddQuoteModal()">
                        <i class="fas fa-plus me-2"></i>Ajouter une citation
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = quotes.map((quote, index) => `
            <div class="card quote-card fade-in" data-quote-id="${quote.id}" style="animation-delay: ${index * 0.1}s">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <blockquote class="quote-text mb-3">
                                "${escapeHtml(quote.text)}"
                            </blockquote>
                            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start">
                                <cite class="author-name mb-2 mb-md-0">— ${escapeHtml(quote.author)}</cite>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewQuote(${quote.id})" 
                                            data-bs-toggle="tooltip" title="Voir les détails">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="editQuote(${quote.id})"
                                            data-bs-toggle="tooltip" title="Modifier">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteQuote(${quote.id})"
                                            data-bs-toggle="tooltip" title="Supprimer">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            ${quote.tags && quote.tags.length > 0 ? `
                                <div class="mt-3">
                                    ${quote.tags.map(tag => `<span class="badge tag-badge me-1">${escapeHtml(tag)}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Initialiser les tooltips
        initializeTooltips();
    }

    // Variables pour le polling du scraping
    let scraperProgressInterval = null;
    let lastScraperProgress = null;

    // Fonction pour démarrer le scraping - CORRIGÉE POUR VOTRE HTML
    window.startScraping = async function() {
        console.log('🚀 Démarrage du scraping...');
        
        if (AppState.scraping.isActive) {
            showToast('Un scraping est déjà en cours', 'warning');
            return;
        }

        const startBtn = document.getElementById('start-scraping');
        if (startBtn) showLoading(true, startBtn);

        try {
            // Récupérer la configuration depuis les inputs
            const maxPages = parseInt(document.getElementById('max-pages')?.value) || 10;
            const delay = parseInt(document.getElementById('delay')?.value) || 1000;
            const skipExisting = document.getElementById('skip-existing')?.checked !== false;

            console.log('Configuration scraping:', { maxPages, delay, skipExisting });

            const config = { maxPages, delay, skipExisting };
            
            // Initialiser l'affichage de progression
            initializeScraperDisplay();
            
            // Faire la requête API pour démarrer le scraping
            const response = await apiRequest('POST', '/api/scraper/start', config);
            console.log('Scraping démarré:', response);
            
            // Mettre à jour l'état de l'application
            AppState.scraping.isActive = true;
            AppState.scraping.config = config;
            
            showToast('Scraping démarré avec succès!', 'success');
            
            // Mettre à jour les boutons
            updateScraperButtons(true);
            
            // Démarrer le polling pour suivre la progression
            startScraperProgressPolling();
            
        } catch (error) {
            console.error('Erreur démarrage scraping:', error);
            showToast('Erreur: ' + error.message, 'danger');
            AppState.scraping.isActive = false;
            updateScraperButtons(false);
        } finally {
            if (startBtn) showLoading(false, startBtn);
        }
    };

    // Fonction pour arrêter le scraping
    window.stopScraping = async function() {
        console.log('⏹️ Arrêt du scraping...');
        
        const stopBtn = document.getElementById('stop-scraping');
        if (stopBtn) showLoading(true, stopBtn);

        try {
            await apiRequest('POST', '/api/scraper/stop');
            AppState.scraping.isActive = false;
            AppState.scraping.progress = null;
            
            showToast('Scraping arrêté', 'info');
            stopScraperProgressPolling();
            updateScraperButtons(false);
            
        } catch (error) {
            console.error('Erreur arrêt scraping:', error);
            showToast('Erreur: ' + error.message, 'danger');
        } finally {
            if (stopBtn) showLoading(false, stopBtn);
        }
    };

    // Fonction pour initialiser l'affichage du scraper
    function initializeScraperDisplay() {
        console.log('🔄 Initialisation affichage scraper...');
        
        // Réinitialiser la barre de progression
        updateScraperProgressBar(0);
        
        // Réinitialiser les compteurs
        updateScraperElement('current-page', 0);
        updateScraperElement('quotes-found', 0);
        updateScraperElement('new-quotes', 0);
        updateScraperElement('errors-count', 0);
        updateScraperElement('progress-text', '0%');
        
        // Effacer les logs
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            logContainer.innerHTML = `
                <div class="log-info p-3">
                    [${new Date().toLocaleTimeString()}] En attente du démarrage du scraping...
                </div>
            `;
        }
    }

    // Fonction pour démarrer le polling de progression
    function startScraperProgressPolling() {
        console.log('📡 Démarrage polling progression...');
        
        if (scraperProgressInterval) {
            clearInterval(scraperProgressInterval);
        }
        
        scraperProgressInterval = setInterval(async () => {
            try {
                const progress = await apiRequest('GET', '/api/scraper/progress');
                console.log('📊 Progression reçue:', progress);
                
                const previousProgress = lastScraperProgress;
                lastScraperProgress = progress;
                
                AppState.scraping.progress = progress;
                updateScraperProgressDisplay(progress, previousProgress);
                
                // Vérifier si le scraping est terminé
                if (!progress.isActive) {
                    console.log('🏁 Scraping terminé détecté');
                    stopScraperProgressPolling();
                    AppState.scraping.isActive = false;
                    updateScraperButtons(false);
                    
                    if (progress.isComplete) {
                        // Notification détaillée de fin
                        const message = `Scraping terminé avec succès!\n\n` +
                                      `Pages scrapées: ${progress.currentPage || 0}\n` +
                                      `Citations trouvées: ${progress.quotesFound || 0}\n` +
                                      `Nouvelles citations: ${progress.newQuotes || 0}\n` +
                                      `Temps total: ${formatScraperTime(progress.elapsedTime)}`;
                        
                        showToast(message, 'success');
                        
                        // Ajouter log de fin
                        addScraperLog(`SCRAPING TERMINÉ! ${progress.newQuotes || 0} nouvelles citations ajoutées.`, 'success');
                        
                        // Recharger le dashboard après 2 secondes
                        if (AppState.currentView === 'dashboard') {
                            setTimeout(() => {
                                loadDashboard();
                            }, 2000);
                        }
                    }
                }
                
            } catch (error) {
                console.error('❌ Erreur polling progression:', error);
                stopScraperProgressPolling();
                showToast('Erreur de communication avec le serveur', 'danger');
            }
        }, 1500); // Polling toutes les 1.5 secondes
    }

    // Fonction pour arrêter le polling
    function stopScraperProgressPolling() {
        console.log('⏹️ Arrêt polling progression...');
        if (scraperProgressInterval) {
            clearInterval(scraperProgressInterval);
            scraperProgressInterval = null;
        }
    }

    // Fonction pour mettre à jour l'affichage de progression
    function updateScraperProgressDisplay(progress, previousProgress) {
        // Mettre à jour la barre de progression avec animation
        const percentage = progress.totalPages > 0 ? 
            Math.round((progress.currentPage / progress.totalPages) * 100) : 0;
        const isComplete = !progress.isActive || progress.isComplete;
        updateScraperProgressBar(percentage, isComplete);
        updateScraperElement('progress-text', `${percentage}%`);

        // Mettre à jour les statistiques
        updateScraperElement('current-page', progress.currentPage || 0);
        updateScraperElement('quotes-found', progress.quotesFound || 0);
        updateScraperElement('new-quotes', progress.newQuotes || 0);
        updateScraperElement('errors-count', progress.errors || 0);

        // Afficher seulement les nouveaux logs
        if (progress.logs && Array.isArray(progress.logs)) {
            const previousLogs = previousProgress?.logs || [];
            const newLogs = progress.logs.slice(previousLogs.length);
            
            newLogs.forEach(log => {
                addScraperLog(log, getScraperLogLevel(log));
            });
        }
    }

    // Fonction pour mettre à jour la barre de progression sans animation
    function updateScraperProgressBar(percentage, isComplete = false) {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            // Pas d'animation
            progressBar.style.transition = 'none';
            progressBar.className = 'progress-bar';
            
            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', percentage);
            
            // Changer les couleurs selon la progression
            if (percentage < 30) {
                progressBar.classList.add('bg-danger');
            } else if (percentage < 70) {
                progressBar.classList.add('bg-warning');
            } else {
                progressBar.classList.add('bg-success');
            }
        }
    }

    // Fonction pour ajouter un log au conteneur
    function addScraperLog(message, level = 'info') {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            const timestamp = new Date().toLocaleTimeString();
            const logElement = document.createElement('div');
            logElement.className = `log-${level} p-2 border-bottom border-dark`;
            
            logElement.innerHTML = `
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <small class="text-muted">[${timestamp}]</small><br>
                        ${escapeHtml(message)}
                    </div>
                </div>
            `;
            
            logContainer.appendChild(logElement);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // Limiter à 50 logs pour éviter les problèmes de performance
            while (logContainer.children.length > 50) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }
    }

    // Fonction pour déterminer le niveau de log
    function getScraperLogLevel(logMessage) {
        const message = logMessage.toLowerCase();
        if (message.includes('error') || message.includes('erreur')) return 'error';
        if (message.includes('success') || message.includes('succès') || message.includes('terminé')) return 'success';
        if (message.includes('warning') || message.includes('attention')) return 'warning';
        return 'info';
    }

    // Fonction pour formater le temps
    function formatScraperTime(seconds) {
        if (!seconds) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Fonction pour mettre à jour un élément avec animation
    function updateScraperElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            if (element.textContent !== value.toString()) {
                // Animation subtile sur changement
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.05)';
                element.textContent = value;
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 300);
            }
        }
    }

    // Fonction pour mettre à jour les boutons
    function updateScraperButtons(isActive) {
        const startBtn = document.getElementById('start-scraping');
        const stopBtn = document.getElementById('stop-scraping');
        
        if (startBtn) {
            startBtn.disabled = isActive;
            if (isActive) {
                startBtn.innerHTML = 'En cours...';
                startBtn.classList.add('d-none');
            } else {
                startBtn.innerHTML = 'Démarrer le Scraping';
                startBtn.classList.remove('d-none');
            }
        }
        
        if (stopBtn) {
            stopBtn.disabled = !isActive;
            if (isActive) {
                stopBtn.classList.remove('d-none');
            } else {
                stopBtn.classList.add('d-none');
            }
        }
    }

    // Fonction corrigée pour charger la page scraper
    window.loadScraperProgress = async function() {
        console.log('Chargement page scraper...');
        
        try {
            // Vérifier s'il y a un scraping en cours
            const progress = await apiRequest('GET', '/api/scraper/progress');
            console.log('État actuel du scraper:', progress);
            
            if (progress && progress.isActive) {
                console.log('Scraping en cours détecté - reprise du suivi');
                AppState.scraping.isActive = true;
                AppState.scraping.progress = progress;
                lastScraperProgress = progress;
                
                // Afficher la progression actuelle
                updateScraperProgressDisplay(progress, null);
                updateScraperButtons(true);
                
                // Reprendre le polling
                startScraperProgressPolling();
                
                showToast('Scraping en cours détecté - suivi repris', 'info');
            } else {
                // Aucun scraping en cours - afficher l'état par défaut
                initializeScraperDisplay();
                updateScraperButtons(false);
            }
            
        } catch (error) {
            console.error(' Erreur chargement page scraper:', error);
            // En cas d'erreur, afficher l'état par défaut
            initializeScraperDisplay();
            updateScraperButtons(false);
        }
    };
    // Chargement des citations avec améliorations
    async function loadQuotes() {
        console.log('Chargement des citations...'); // Debug
        
        try {
            const params = new URLSearchParams({
                page: AppState.pagination.current.toString(),
                limit: AppState.pagination.perPage.toString(),
                ...(AppState.filters.search && { search: AppState.filters.search }),
                ...(AppState.filters.author && { author: AppState.filters.author }),
                ...(AppState.filters.tag && { tag: AppState.filters.tag })
            });
            
            console.log('Paramètres de requête:', params.toString()); // Debug
            
            const data = await apiRequest('GET', `/api/quotes?${params}`);
            console.log('Données de citations reçues:', data); // Debug
            
            AppState.quotes = data.quotes || [];
            AppState.pagination = { ...AppState.pagination, ...data.pagination };
            
            renderQuotesTable();
            updatePagination();
            
        } catch (error) {
            console.error('Erreur lors du chargement des citations:', error);
            showToast('Erreur lors du chargement des citations: ' + error.message, 'danger');
        }
    }

    function renderQuotesTable() {
    const tbody = document.querySelector('#quotes-table tbody');
    const tableContainer = document.querySelector('#quotes-table').parentElement;
    
    if (!tbody) {
        console.error('Tableau des citations introuvable');
        return;
    }
    
    console.log('Rendu du tableau avec', AppState.quotes.length, 'citations');
    
    if (AppState.quotes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center p-5">
                    <div class="empty-state">
                        <div class="display-icon">
                            <i class="fas fa-quote-left"></i>
                        </div>
                        <h5>Aucune citation trouvée</h5>
                        <p class="text-muted">Essayez de modifier vos critères de recherche.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Détecter si on est sur mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // Cacher le tableau et afficher les cartes mobiles
        document.querySelector('#quotes-table').style.display = 'none';
        
        // Vérifier si le conteneur mobile existe déjà
        let mobileContainer = document.querySelector('.quotes-mobile-container');
        if (!mobileContainer) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'quotes-mobile-container';
            tableContainer.appendChild(mobileContainer);
        }
        
        mobileContainer.style.display = 'block';
        mobileContainer.innerHTML = AppState.quotes.map(quote => `
            <div class="card quote-mobile-card mb-3 shadow-sm">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <small class="text-muted">#${quote.id}</small>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="#" onclick="viewQuote(${quote.id})">
                                        <i class="fas fa-eye me-2"></i>Voir détails
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="#" onclick="editQuote(${quote.id})">
                                        <i class="fas fa-edit me-2"></i>Modifier
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger" href="#" onclick="deleteQuote(${quote.id})">
                                        <i class="fas fa-trash me-2"></i>Supprimer
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <blockquote class="quote-text mb-3">
                        <p class="mb-2 font-italic">
                            "${escapeHtml(quote.text.length > 120 ? quote.text.substring(0, 120) + '...' : quote.text)}"
                        </p>
                        <footer class="blockquote-footer mb-0">
                            <cite class="fw-bold">${escapeHtml(quote.author)}</cite>
                        </footer>
                    </blockquote>
                    
                    ${quote.tags && quote.tags.length > 0 ? `
                        <div class="mb-2">
                            ${quote.tags.slice(0, 3).map(tag => `<span class="badge tag-badge me-1 mb-1">${escapeHtml(tag)}</span>`).join('')}
                            ${quote.tags.length > 3 ? `<span class="badge bg-secondary">+${quote.tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <small class="text-muted">
                            <i class="fas fa-calendar-alt me-1"></i>
                            ${formatDate(quote.created_at)}
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewQuote(${quote.id})" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="editQuote(${quote.id})" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteQuote(${quote.id})" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } else {
        // Mode desktop - afficher le tableau et cacher les cartes mobiles
        document.querySelector('#quotes-table').style.display = 'table';
        const mobileContainer = document.querySelector('.quotes-mobile-container');
        if (mobileContainer) {
            mobileContainer.style.display = 'none';
        }
        
        tbody.innerHTML = AppState.quotes.map(quote => `
            <tr class="quote-row">
                <td class="quote-text-col">
                    <div class="quote-preview" title="${escapeHtml(quote.text)}">
                        <div class="text-truncate" style="max-width: 250px;">
                            "${escapeHtml(quote.text.substring(0, 80))}${quote.text.length > 80 ? '...' : ''}"
                        </div>
                        <small class="text-muted d-block mt-1">ID: ${quote.id}</small>
                    </div>
                </td>
                <td class="d-none d-md-table-cell author-col">
                    <div class="fw-bold">${escapeHtml(quote.author)}</div>
                </td>
                <td class="d-none d-lg-table-cell tags-col">
                    <div class="tags-container">
                        ${quote.tags ? quote.tags.slice(0, 2).map(tag => `<span class="badge tag-badge me-1 mb-1">${escapeHtml(tag)}</span>`).join('') : ''}
                        ${quote.tags && quote.tags.length > 2 ? `<br><small class="text-muted">+${quote.tags.length - 2} autres</small>` : ''}
                    </div>
                </td>
                <td class="d-none d-xl-table-cell date-col">
                    <small class="text-muted">
                        <i class="fas fa-calendar-alt me-1"></i>
                        ${formatDate(quote.created_at)}
                    </small>
                </td>
                <td class="actions-col">
                    <div class="btn-group btn-group-sm action-buttons">
                        <button class="btn btn-outline-primary" onclick="viewQuote(${quote.id})" 
                                data-bs-toggle="tooltip" title="Voir les détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="editQuote(${quote.id})" 
                                data-bs-toggle="tooltip" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteQuote(${quote.id})" 
                                data-bs-toggle="tooltip" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Initialiser les tooltips
    initializeTooltips();
}

    function updatePagination() {
        const paginationContainer = document.getElementById('pagination-container');
        const paginationInfo = document.getElementById('pagination-info');
        
        if (!paginationContainer) return;
        
        const { current, totalPages, total } = AppState.pagination;
        
        // Mise à jour des informations de pagination
        if (paginationInfo) {
            const start = (current - 1) * AppState.pagination.perPage + 1;
            const end = Math.min(current * AppState.pagination.perPage, total);
            paginationInfo.textContent = `Affichage de ${start} à ${end} sur ${total} citations`;
        }
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Bouton précédent
        html += `
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${current - 1})" ${current === 1 ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-left"></i> Précédent
                </a>
            </li>
        `;
        
        // Pages
        for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
            html += `
                <li class="page-item ${current === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Bouton suivant
        html += `
            <li class="page-item ${current === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${current + 1})" ${current === totalPages ? 'tabindex="-1"' : ''}>
                    Suivant <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        paginationContainer.innerHTML = html;
    }

    // Chargement des données pour les filtres
    async function loadFiltersData() {
        try {
            console.log('Chargement des données de filtres...'); // Debug
            
            const [authorsData, tagsData] = await Promise.all([
                apiRequest('GET', '/api/authors'),
                apiRequest('GET', '/api/tags')
            ]);
            
            console.log('Auteurs reçus:', authorsData); // Debug
            console.log('Tags reçus:', tagsData); // Debug
            
            AppState.authors = authorsData || [];
            AppState.tags = tagsData || [];
            
            updateFiltersUI();
            
        } catch (error) {
            console.error('Erreur lors du chargement des filtres:', error);
            showToast('Erreur lors du chargement des filtres: ' + error.message, 'warning');
        }
    }

    function updateFiltersUI() {
        const authorFilter = document.getElementById('author-filter');
        const tagFilter = document.getElementById('tag-filter');
        
        if (authorFilter) {
            authorFilter.innerHTML = '<option value="">👤 Tous les auteurs</option>' +
                AppState.authors.map(author => 
                    `<option value="${escapeHtml(author.name)}">${escapeHtml(author.name)} (${author.quotesCount || author.quotes_count || 0})</option>`
                ).join('');
        }
        
        if (tagFilter) {
            tagFilter.innerHTML = '<option value="">🏷️ Tous les tags</option>' +
                AppState.tags.map(tag => 
                    `<option value="${escapeHtml(tag.name)}">${escapeHtml(tag.name)} (${tag.usageCount || tag.usage_count || 0})</option>`
                ).join('');
        }
    }

    // Initialisation des tooltips
    function initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Fonctions globales pour les interactions
    window.changePage = function(page) {
        if (page < 1 || page > AppState.pagination.totalPages) return;
        AppState.pagination.current = page;
        loadQuotes();
    };

    window.viewQuote = async function(id) {
    console.log('Voir citation:', id);
    try {
        const quote = await apiRequest('GET', `/api/quotes/${id}`);
        
        // Créer et afficher le modal de visualisation
        const modalHtml = `
            <div class="modal fade" id="viewQuoteModal" tabindex="-1" aria-labelledby="viewQuoteModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="viewQuoteModalLabel">
                                <i class="fas fa-eye me-2"></i>Détails de la citation
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                        </div>
                        <div class="modal-body">
                            <div class="quote-details">
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Citation :</label>
                                    <blockquote class="blockquote border-start border-primary border-4 ps-3 py-2 bg-light rounded">
                                        <p class="mb-0">"${escapeHtml(quote.text)}"</p>
                                    </blockquote>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Auteur :</label>
                                        <p class="text-muted mb-0">${escapeHtml(quote.author)}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Date d'ajout :</label>
                                        <p class="text-muted mb-0">${formatDate(quote.created_at)}</p>
                                    </div>
                                </div>
                                
                                ${quote.tags && quote.tags.length > 0 ? `
                                    <div class="mb-3">
                                        <label class="form-label fw-bold">Tags :</label>
                                        <div class="mt-2">
                                            ${quote.tags.map(tag => `<span class="badge tag-badge me-2">${escapeHtml(tag)}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${quote.source_url ? `
                                    <div class="mb-3">
                                        <label class="form-label fw-bold">Source :</label>
                                        <p class="mb-0">
                                            <a href="${escapeHtml(quote.source_url)}" target="_blank" class="text-decoration-none">
                                                <i class="fas fa-external-link-alt me-1"></i>
                                                ${escapeHtml(quote.source_url)}
                                            </a>
                                        </p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            <button type="button" class="btn btn-primary" onclick="editQuote(${quote.id}); bootstrap.Modal.getInstance(document.getElementById('viewQuoteModal')).hide();">
                                <i class="fas fa-edit me-2"></i>Modifier
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Supprimer l'ancien modal s'il existe
        const existingModal = document.getElementById('viewQuoteModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Ajouter le nouveau modal au DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('viewQuoteModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erreur lors de la récupération de la citation:', error);
        showToast('Erreur lors de la récupération de la citation: ' + error.message, 'danger');
    }
};

    window.editQuote = async function(id) {
    console.log('Modifier citation:', id);
    try {
        const quote = await apiRequest('GET', `/api/quotes/${id}`);
        
        // Créer et afficher le modal d'édition
        const modalHtml = `
            <div class="modal fade" id="editQuoteModal" tabindex="-1" aria-labelledby="editQuoteModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editQuoteModalLabel">
                                <i class="fas fa-edit me-2"></i>Modifier la citation
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                        </div>
                        <form id="editQuoteForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="editQuoteText" class="form-label">Citation *</label>
                                    <textarea class="form-control" id="editQuoteText" rows="4" required 
                                              placeholder="Entrez le texte de la citation...">${escapeHtml(quote.text)}</textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editQuoteAuthor" class="form-label">Auteur *</label>
                                    <input type="text" class="form-control" id="editQuoteAuthor" required 
                                           placeholder="Nom de l'auteur" value="${escapeHtml(quote.author)}">
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editQuoteTags" class="form-label">Tags</label>
                                    <input type="text" class="form-control" id="editQuoteTags" 
                                           placeholder="Séparés par des virgules (ex: motivation, succès, vie)"
                                           value="${quote.tags ? quote.tags.join(', ') : ''}">
                                    <div class="form-text">Séparez les tags par des virgules</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editQuoteSource" class="form-label">URL Source</label>
                                    <input type="url" class="form-control" id="editQuoteSource" 
                                           placeholder="https://..." value="${quote.source_url || ''}">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                                <button type="submit" class="btn btn-primary" id="saveEditQuoteBtn">
                                    <i class="fas fa-save me-2"></i>Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Supprimer l'ancien modal s'il existe
        const existingModal = document.getElementById('editQuoteModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Ajouter le nouveau modal au DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Gérer la soumission du formulaire
        document.getElementById('editQuoteForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const saveBtn = document.getElementById('saveEditQuoteBtn');
            showLoading(true, saveBtn);
            
            try {
                const formData = {
                    text: document.getElementById('editQuoteText').value.trim(),
                    author: document.getElementById('editQuoteAuthor').value.trim(),
                    tags: document.getElementById('editQuoteTags').value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0),
                    sourceUrl: document.getElementById('editQuoteSource').value.trim() || null
                };
                
                if (!formData.text || !formData.author) {
                    showToast('Le texte et l\'auteur sont obligatoires', 'warning');
                    return;
                }
                
                await apiRequest('PUT', `/api/quotes/${id}`, formData);
                
                // Fermer le modal
                bootstrap.Modal.getInstance(document.getElementById('editQuoteModal')).hide();
                
                // Recharger les données selon la vue actuelle
                if (AppState.currentView === 'quotes') {
                    await loadQuotes();
                } else if (AppState.currentView === 'dashboard') {
                    await loadDashboard();
                }
                
                showToast('Citation modifiée avec succès', 'success');
                
            } catch (error) {
                console.error('Erreur lors de la modification:', error);
                showToast('Erreur lors de la modification: ' + error.message, 'danger');
            } finally {
                showLoading(false, saveBtn);
            }
        });
        
        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('editQuoteModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erreur lors de la récupération de la citation:', error);
        showToast('Erreur lors de la récupération de la citation: ' + error.message, 'danger');
    }
};

    window.deleteQuote = async function(id) {
    console.log('Supprimer citation:', id);
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette citation ? Cette action est irréversible.')) {
        return;
    }
    
    try {
        await apiRequest('DELETE', `/api/quotes/${id}`);
        
        // Recharger les données selon la vue actuelle
        if (AppState.currentView === 'quotes') {
            await loadQuotes();
        } else if (AppState.currentView === 'dashboard') {
            await loadDashboard();
        }
        
        showToast('Citation supprimée avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast('Erreur lors de la suppression: ' + error.message, 'danger');
    }
};

    window.showAddQuoteModal = function() {
        console.log('Afficher modal d\'ajout');
        // Implémenter l'ajout de citation
        showToast('Fonctionnalité d\'ajout à implémenter', 'info');
    };

    

    window.exportQuotes = function() {
        console.log('Exporter citations');
        // Implémenter l'export
        showToast('Fonctionnalité d\'export à implémenter', 'info');
    };

    window.loadScraperProgress = function() {
        console.log('Charger progression du scraper');
        // Implémenter le chargement du scraper
        showToast('Section scraper chargée', 'info');
    };

    // Initialisation au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initialisation de l\'application...'); // Debug
        
        initializeNavigation();
        initializeTooltips();
        
        // Charger le tableau de bord par défaut
        loadDashboard();
        
        // Initialiser les événements de recherche et filtres
        const searchInput = document.getElementById('search-input');
        const authorFilter = document.getElementById('author-filter');
        const tagFilter = document.getElementById('tag-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                AppState.filters.search = this.value;
                AppState.pagination.current = 1;
                if (AppState.currentView === 'quotes') {
                    loadQuotes();
                }
            }, 300));
        }
        
        if (authorFilter) {
            authorFilter.addEventListener('change', function() {
                AppState.filters.author = this.value;
                AppState.pagination.current = 1;
                if (AppState.currentView === 'quotes') {
                    loadQuotes();
                }
            });
        }
        
        if (tagFilter) {
            tagFilter.addEventListener('change', function() {
                AppState.filters.tag = this.value;
                AppState.pagination.current = 1;
                if (AppState.currentView === 'quotes') {
                    loadQuotes();
                }
            });
        }
    });

    // Fonction utilitaire pour le debounce
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

})();
