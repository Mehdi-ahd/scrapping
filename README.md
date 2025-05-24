# scrapping
# QuoteScraper - Gestionnaire de Citations

Une application web full-stack moderne pour scraper et gérer des citations depuis quotes.toscrape.com avec des fonctionnalités de recherche avancée.

## Fonctionnalités

### **Fonctionnalités Principales**
- **Web Scraping** automatisé depuis quotes.toscrape.com
- **CRUD complet** pour la gestion des citations
- **Recherche avancée** avec filtres multiples
- **Tableau de bord** avec statistiques en temps réel
- **Interface responsive** avec Bootstrap 5

### **Recherche Avancée**
- **Types de recherche** : Contient, commence par, se termine par, correspondance exacte
- **Tri intelligent** : Par date, auteur, longueur de citation
- **Filtres dynamiques** : Auteur, tags avec recherche en temps réel
- **Pagination flexible** : 10, 25, 50 ou 100 résultats par page
- **Compteur de résultats** en temps réel

### **Technologies Utilisées**
- **Backend** : Node.js + Express.js
- **Base de données** : PostgreSQL (Supabase)
- **Frontend** : HTML5 + CSS3 + Bootstrap 5 + JavaScript ES6
- **Web Scraping** : Cheerio
- **Architecture** : API REST

## Installation et Configuration

### **Prérequis**
- Node.js v23.9.0 
- Compte Supabase (gratuit)
- Git

### **Installation**

1. **Cloner le repository**
```bash
git clone https://github.com/mehdi-ahd/scrapping
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
├── app.js          # Logique frontend JavaScript
├── server/
│   ├── index.js           # Serveur Express principal
│   ├── routes.js          # Routes API REST
│   ├── database.js        # Configuration base de données
│   └── scraper.js         # Moteur de web scraping
├── package.json           # Dépendances Node.js
└── README.md             # Documentation
```

## Schéma de Base de Données

### Table `quotes`
```sql
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📖 Utilisation

### **Web Scraping**
1. Allez dans l'onglet "Web Scraper"
2. Configurez le nombre de pages et le délai
3. Cliquez sur "Démarrer le Scraping"
4. Suivez le progrès en temps réel

### **Recherche Avancée**
1. Naviguez vers l'onglet "Citations"
2. Utilisez la barre de recherche pour le texte
3. Appliquez des filtres par auteur ou tag
4. Cliquez sur "Filtres Avancés" pour plus d'options
5. Triez par date, auteur ou longueur

### **Gestion des Citations**
- **Ajouter** : Bouton "Ajouter Citation"
- **Modifier** : Cliquez sur l'icône crayon
- **Supprimer** : Cliquez sur l'icône poubelle
- **Voir détails** : Cliquez sur l'icône œil


### Tableau de Bord
Interface claire avec statistiques et citations récentes

### Recherche Avancée
Filtres sophistiqués avec tri et pagination

### Web Scraper
Interface de scraping avec logs en temps réel

## 🔧 API Endpoints

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

## Déploiement

### Vercel/Netlify
1. Connectez votre repository GitHub
2. Configurez les variables d'environnement
3. Déployez automatiquement


## Auteur

Créé par Mehdi-ahd

## Remerciements

- [quotes.toscrape.com](http://quotes.toscrape.com) pour les données de test
- [Bootstrap](https://getbootstrap.com) pour l'interface
- [Supabase](https://supabase.com) pour la base de données
- [Cheerio](https://cheerio.js.org) pour le web scraping
