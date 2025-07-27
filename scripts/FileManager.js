class FileManager {
    constructor(app) {
        this.app = app;
        this.repositoryPath = './repository';
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
            this.app.repositoryFiles.clear();

            if (window.electronAPI) {
                const files = await window.electronAPI.repository.listFiles();
                for (const file of files) {
                    this.app.repositoryFiles.set(file.name, '');
                }
            } else {
                const savedFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
                for (const [fileName, content] of Object.entries(savedFiles)) {
                    this.app.repositoryFiles.set(fileName, content);
                }
            }

            console.log(`${this.app.repositoryFiles.size} fichiers chargés depuis le repository`);
        } catch (error) {
            console.error('Erreur lors du chargement des fichiers du repository:', error);
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

            this.app.repositoryFiles.set(fileName, content);
            console.log(`Fichier ${fileName} sauvegardé dans le repository`);
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            alert('Erreur lors de la sauvegarde dans le repository');
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
                if (!content) throw new Error(`Fichier ${fileName} non trouvé`);
                return content;
            }
        } catch (error) {
            console.error('Erreur lors du chargement depuis le repository:', error);

            const recreate = confirm(`Le fichier ${fileName} n'existe pas. Le recréer avec un contenu par défaut ?`);
            if (recreate) {
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileType = this.app.getFileTypeFromExtension(fileExtension);
                const defaultContent = this.app.getTemplateContent(fileType);
                await this.saveToRepository(fileName, defaultContent);
                return defaultContent;
            }

            throw error;
        }
    }

    async deleteFromRepository(fileName) {
        if (!confirm(`Supprimer définitivement le fichier "${fileName}" du repository ?`)) {
            return;
        }

        try {
            const repositoryFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
            delete repositoryFiles[fileName];
            localStorage.setItem('repository_files', JSON.stringify(repositoryFiles));

            this.app.repositoryFiles.delete(fileName);

            for (const [fileId, fileData] of this.app.openFiles.entries()) {
                if (fileData.name === fileName && fileData.savedToRepository) {
                    this.app.closeFile(fileId);
                    break;
                }
            }

            this.app.updateStatus(`Fichier ${fileName} supprimé du repository`);
            this.app.updateUI();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression du fichier');
        }
    }

    async refreshRepository() {
        try {
            await this.loadRepositoryFiles();
            this.app.updateUI();
            this.app.updateStatus('Repository actualisé');
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
            this.app.updateStatus('Erreur lors de l\'actualisation');
        }
    }
}