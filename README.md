# QuoteScraper - Gestionnaire de Citations

Une application web full-stack moderne pour scraper et gérer des citations depuis quotes.toscrape.com avec des fonctionnalités de recherche avancée.

## Fonctionnalités

### Fonctionnalités Principales
- **Web Scraping** automatisé depuis quotes.toscrape.com
- **CRUD complet** pour la gestion des citations
- **Recherche avancée** avec filtres multiples
- **Tableau de bord** avec statistiques en temps réel
- **Interface responsive** avec Bootstrap 5

### Recherche Avancée
- **Types de recherche** : Contient, commence par, se termine par, correspondance exacte
- **Tri intelligent** : Par date, auteur, longueur de citation
- **Filtres dynamiques** : Auteur, tags avec recherche en temps réel
- **Pagination flexible** : 10, 25, 50 ou 100 résultats par page
- **Compteur de résultats** en temps réel

## Technologies Utilisées
- **Backend** : Node.js + Express.js
- **Base de données** : PostgreSQL (Supabase)
- **Frontend** : HTML5 + CSS3 + Bootstrap 5 + JavaScript ES6
- **Web Scraping** : Cheerio
- **Architecture** : API REST

## Installation et Configuration

### Prérequis
- Node.js v23.9.0 
- Compte Supabase (gratuit)
- Git

### Installation
1. **Cloner le repository**
```bash
git clone http://github.com/Mehdi-ahd/scrapping/
cd scrapping
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de la base de données**
- Créez un projet sur [Supabase](https://supabase.com)
- Récupérez votre chaîne de connexion PostgreSQL
- Modifiez `server/database.js` avec votre chaîne de connexion

4. **Démarrer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5000`

## Structure du Projet
```
quotescraper/
├── index.html            # Interface utilisateur principale
├── app.js                # Logique frontend JavaScript
├── server/
│   ├── index.js          # Serveur Express principal
│   ├── routes.js         # Routes API REST
│   ├── database.js       # Configuration base de données
│   └── scraper.js        # Moteur de web scraping
├── package.json          # Dépendances Node.js
└── README.md             # Documentation
```

## Schéma de Base de Données

### Table `authors`
```sql
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    quotes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Table `tags`
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Table `quotes`
```sql
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    tags TEXT[],
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index pour optimiser les performances
CREATE INDEX idx_quotes_author ON quotes(author);
CREATE INDEX idx_quotes_text ON quotes USING gin(to_tsvector('french', text));
CREATE INDEX idx_quotes_tags ON quotes USING gin(tags);
```

## Utilisation

### Web Scraping
1. Allez dans l'onglet "Web Scraper"
2. Configurez le nombre de pages et le délai
3. Cliquez sur "Démarrer le Scraping"
4. Suivez le progrès en temps réel

### Recherche Avancée
1. Naviguez vers l'onglet "Citations"
2. Utilisez la barre de recherche pour le texte
3. Appliquez des filtres par auteur ou tag
4. Cliquez sur "Filtres Avancés" pour plus d'options
5. Triez par date, auteur ou longueur

### Gestion des Citations
- **Ajouter** : Bouton "Ajouter Citation"
- **Modifier** : Cliquez sur l'icône crayon
- **Supprimer** : Cliquez sur l'icône poubelle
- **Voir détails** : Cliquez sur l'icône œil

## API Endpoints

### Citations
- `GET /api/quotes` - Liste des citations avec filtres
- `GET /api/quotes/:id` - Citation par ID
- `POST /api/quotes` - Créer une citation
- `PUT /api/quotes/:id` - Modifier une citation
- `DELETE /api/quotes/:id` - Supprimer une citation

### Scraping
- `POST /api/scraper/start` - Démarrer le scraping
- `POST /api/scraper/stop` - Arrêter le scraping
- `GET /api/scraper/progress` - Statut du scraping

### Statistiques
- `GET /api/stats` - Statistiques générales
- `GET /api/authors` - Liste des auteurs
- `GET /api/tags` - Liste des tags

## Approche et Décisions Techniques

### Approche Générale
L'application QuoteScraper a été développée avec une approche full-stack minimaliste privilégiant la simplicité et l'efficacité. Le choix s'est porté sur des technologies maitrisées et accessibles pour assurer une réalisation rapide et fonctionnelle.

### Innovations Apportées
- **Recherche avancée** avec 4 types de recherche
- **Tri intelligent** par date, auteur, longueur de citation
- **Filtres dynamiques** avec recherche en temps réel
- **Pagination flexible** (10, 25, 50, 100 résultats)
- **Indexation avancée** pour des recherches rapides

## Problèmes Connus et Améliorations Futures

### Problèmes Identifiés
- **Erreur SASL_SIGNATURE_MISMATCH** : Problème d'authentification Supabase intermittent
- **Configuration SSL** : Paramètres de connexion parfois instables
- **Gestion des timeouts** : Optimisation nécessaire pour les requêtes longues

### Améliorations Futures
- Système d'authentification utilisateur
- Export en différents formats (CSV, PDF, XML)
- API de statistiques avancées
- Cache côté client pour améliorer les performances

## URLs
- **Dépôt GitHub** : http://github.com/Mehdi-ahd/scrapping/
- **Application en production** : https://scrapping-wmac.onrender.com

## Auteur
Créé par Mehdi PATINDE

## Remerciements
- [quotes.toscrape.com](http://quotes.toscrape.com) pour les données de test
- [Bootstrap](https://getbootstrap.com) pour l'interface
- [Supabase](https://supabase.com) pour la base de données
- [Cheerio](https://cheerio.js.org) pour le web scraping
