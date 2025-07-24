// RepositoryManager.js - Gestion du repository local/distant
export class RepositoryManager {
    constructor() {
        this.repositoryPath = './repository';
        this.repositoryFiles = new Map();
    }

    async init() {
        await this.initializeRepository();
        await this.loadRepositoryFiles();
    }

    async initializeRepository() {
        try {
            console.log('Initialisation du dossier repository...');
            const exists = await this.repositoryExists();
            if (!exists) {
                await this.createRepositoryFolder();
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du repository:', error);
            throw error;
        }
    }

    async repositoryExists() {
        if (window.electronAPI) {
            return await window.electronAPI.repository.exists();
        }
        return localStorage.getItem('repository_initialized') === 'true';
    }

    async createRepositoryFolder() {
        if (!window.electronAPI) {
            localStorage.setItem('repository_initialized', 'true');
            console.log('Dossier repository créé (mode web)');
        } else {
            console.log('Dossier repository géré côté main.js');
        }
    }

    async loadRepositoryFiles() {
        try {
            this.repositoryFiles.clear();

            if (window.electronAPI) {
                const files = await window.electronAPI.repository.listFiles();
                for (const file of files) {
                    this.repositoryFiles.set(file.name, ''); // chargement différé
                }
            } else {
                const savedFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
                for (const [fileName, content] of Object.entries(savedFiles)) {
                    this.repositoryFiles.set(fileName, content);
                }
            }

            console.log(`${this.repositoryFiles.size} fichiers chargés depuis le repository`);
            return Array.from(this.repositoryFiles.keys());
        } catch (error) {
            console.error('Erreur lors du chargement des fichiers du repository:', error);
            throw error;
        }
    }

    async saveToRepository(fileName, content) {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.repository.writeFile(fileName, content);
                if (!result.success) throw new Error(result.error);
            } else {
                const repositoryFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
                repositoryFiles[fileName] = content;
                localStorage.setItem('repository_files', JSON.stringify(repositoryFiles));
            }

            this.repositoryFiles.set(fileName, content);
            console.log(`Fichier ${fileName} sauvegardé dans le repository`);
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            throw new Error('Erreur lors de la sauvegarde dans le repository');
        }
    }

    async loadFromRepository(fileName) {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.repository.readFile(fileName);
                if (!result.success) throw new Error(result.error);
                return result.content;
            } else {
                const repositoryFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
                const content = repositoryFiles[fileName];
                if (content === undefined) throw new Error(`Fichier ${fileName} non trouvé`);
                return content;
            }
        } catch (error) {
            console.error('Erreur lors du chargement depuis le repository:', error);
            throw error;
        }
    }

    async deleteFromRepository(fileName) {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.repository.deleteFile(fileName);
                if (!result.success) throw new Error(result.error);
            } else {
                const repositoryFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
                delete repositoryFiles[fileName];
                localStorage.setItem('repository_files', JSON.stringify(repositoryFiles));
            }

            this.repositoryFiles.delete(fileName);
            console.log(`Fichier ${fileName} supprimé du repository`);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw new Error('Erreur lors de la suppression du fichier');
        }
    }

    async refreshRepository() {
        return await this.loadRepositoryFiles();
    }

    getRepositoryFiles() {
        return Array.from(this.repositoryFiles.keys());
    }

    hasFile(fileName) {
        return this.repositoryFiles.has(fileName);
    }
}