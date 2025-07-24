// main.js - Script principal pour orchestrer l'application
class IDEApp {
    constructor() {
        this.repositoryPath = './repository';
        this.init();
    }

    async init() {
        // Attendre que tous les modules soient chargés
        await this.waitForModules();
        
        // Initialiser les gestionnaires
        this.fileManager = new FileManager();
        this.repositoryManager = new RepositoryManager(this.repositoryPath);
        this.uiManager = new UIManager(this.fileManager, this.repositoryManager);
        this.fileOperations = new FileOperations(this.fileManager, this.repositoryManager, this.uiManager);

        // Initialiser le repository et charger les fichiers
        await this.repositoryManager.init();
        
        // Mettre à jour l'interface
        this.uiManager.updateUI();
        
        console.log('IDE initialisé avec succès');
    }

    async waitForModules() {
        // Attendre que toutes les classes soient disponibles
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (typeof FileManager !== 'undefined' && 
                typeof FileOperations !== 'undefined' && 
                typeof RepositoryManager !== 'undefined' && 
                typeof UIManager !== 'undefined') {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Impossible de charger tous les modules nécessaires');
    }

    // Méthodes publiques pour l'interface
    createNewFile(fileType) {
        const type = fileType === 'NONE' ? document.getElementById('fileTypeSelect').value : fileType;
        this.fileOperations.createNewFile(type);
    }

    openFile(event) {
        this.fileOperations.openFile(event);
    }

    async saveFile() {
        await this.fileOperations.saveFile();
    }

    saveAsFile() {
        this.fileOperations.saveAsFile();
    }

    closeFile(fileId) {
        this.fileOperations.closeFile(fileId);
    }

    switchToFile(fileId) {
        this.fileOperations.switchToFile(fileId);
    }

    async openFromRepository(fileName) {
        await this.fileOperations.openFromRepository(fileName);
    }

    async refreshRepository() {
        try {
            await this.repositoryManager.loadRepositoryFiles();
            this.uiManager.updateUI();
            this.uiManager.updateStatus('Repository actualisé');
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
            this.uiManager.updateStatus('Erreur lors de l\'actualisation');
        }
    }

    onContentChange() {
        this.fileOperations.onContentChange();
    }

    showRepositoryManager() {
        this.uiManager.showRepositoryManager();
    }

    async deleteFromRepository(fileName) {
        await this.repositoryManager.deleteFromRepository(fileName);
        
        // Fermer le fichier s'il est ouvert
        for (const [fileId, fileData] of this.fileManager.openFiles.entries()) {
            if (fileData.name === fileName && fileData.savedToRepository) {
                this.closeFile(fileId);
                break;
            }
        }
        
        this.uiManager.updateStatus(`Fichier ${fileName} supprimé du repository`);
        this.uiManager.updateUI();
    }

    closeModal() {
        this.uiManager.closeModal();
    }
}

// Fonctions globales pour maintenir la compatibilité avec le HTML existant
let app = null;

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new IDEApp();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        alert('Erreur lors du chargement de l\'application. Vérifiez la console pour plus de détails.');
    }
});

// Fonctions globales pour les événements HTML
function createNewFile(fileType = 'NONE') {
    if (app) app.createNewFile(fileType);
}

function openFile(event) {
    if (app) app.openFile(event);
}

function saveFile() {
    if (app) app.saveFile();
}

function saveAsFile() {
    if (app) app.saveAsFile();
}

function changeFileType() {
    // Cette fonction peut être étendue pour changer le type du fichier actif
    console.log('Type de fichier changé');
}

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    if (!app) return;
    
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'n':
                e.preventDefault();
                createNewFile();
                break;
            case 'o':
                e.preventDefault();
                document.getElementById('fileInput').click();
                break;
            case 's':
                e.preventDefault();
                if (e.shiftKey) {
                    saveAsFile();
                } else {
                    saveFile();
                }
                break;
        }
    }
});