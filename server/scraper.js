const cheerio = require('cheerio');

class QuoteScraper {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://quotes.toscrape.com';
    this.maxPages = options.maxPages || 10;
    this.delay = options.delay || 1000;
    this.skipExisting = options.skipExisting !== false;
    this.progress = this.resetProgress();
  }

  resetProgress() {
    return {
      currentPage: 0,
      totalPages: this.maxPages,
      quotesFound: 0,
      newQuotes: 0,
      errors: 0,
      isComplete: false,
      logs: []
    };
  }

  addLog(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    this.progress.logs.push(logEntry);
    console.log(logEntry);
  }

  async scrapeQuotes(onProgress) {
    this.progress = this.resetProgress();
    this.addLog(`Démarrage du scraping de ${this.baseUrl}`, 'info');
    
    const allQuotes = [];
    const errors = [];
    let currentUrl = this.baseUrl;
    let pageCount = 0;

    try {
      while (currentUrl && pageCount < this.maxPages) {
        pageCount++;
        this.progress.currentPage = pageCount;
        
        this.addLog(`Scraping de la page ${pageCount}/${this.maxPages}`, 'info');
        
        try {
          const pageResult = await this.scrapePage(currentUrl);
          allQuotes.push(...pageResult.quotes);
          this.progress.quotesFound += pageResult.quotes.length;
          
          this.addLog(`Page ${pageCount} - ${pageResult.quotes.length} citations trouvées`, 'success');
          
          currentUrl = pageResult.nextPageUrl;
          
          if (onProgress) {
            onProgress({ ...this.progress });
          }
          
          // Délai entre les requêtes
          if (currentUrl && this.delay > 0) {
            this.addLog(`Attente de ${this.delay}ms avant la prochaine page`, 'info');
            await new Promise(resolve => setTimeout(resolve, this.delay));
          }
          
        } catch (error) {
          const errorMessage = `Erreur lors du scraping de la page ${pageCount}: ${error.message}`;
          this.addLog(errorMessage, 'error');
          errors.push(errorMessage);
          this.progress.errors++;
          break;
        }
      }
      
      this.progress.isComplete = true;
      this.addLog(`Scraping terminé. ${allQuotes.length} citations récupérées au total`, 'success');
      
      if (onProgress) {
        onProgress({ ...this.progress });
      }
      
      return {
        quotes: allQuotes,
        totalPages: pageCount,
        errors
      };
      
    } catch (error) {
      const errorMessage = `Erreur générale lors du scraping: ${error.message}`;
      this.addLog(errorMessage, 'error');
      errors.push(errorMessage);
      
      return {
        quotes: allQuotes,
        totalPages: pageCount,
        errors
      };
    }
  }

  async scrapePage(url) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const quotes = [];
      
      $('.quote').each((_, element) => {
        try {
          const text = $(element).find('.text').text().trim();
          const author = $(element).find('.author').text().trim();
          const tags = $(element).find('.tags .tag')
            .map((_, tagEl) => $(tagEl).text().trim())
            .get();
          
          if (text && author) {
            quotes.push({
              text: text.replace(/^[""]|[""]$/g, ''), //Supprime les citations deja existantes 
              author,
              tags: tags.length > 0 ? tags : null,
              sourceUrl: url
            });
          }
        } catch (error) {
          this.addLog(`Erreur lors de l'extraction d'une citation: ${error.message}`, 'warning');
        }
      });
      
      //Trouve l'URL de la prochaine page Find next page URL
      const nextPageHref = $('.pager .next a').attr('href');
      const nextPageUrl = nextPageHref ? new URL(nextPageHref, url).href : null;
      
      return { quotes, nextPageUrl };
      
    } catch (error) {
      throw new Error(`Impossible de récupérer la page ${url}: ${error.message}`);
    }
  }

  getProgress() {
    return { ...this.progress };
  }
}

module.exports = { QuoteScraper };
