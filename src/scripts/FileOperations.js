// FileOperations.js - Opérations de sauvegarde, chargement, etc.
export class FileOperations {
    constructor(fileManager, repositoryManager, uiManager) {
        this.fileManager = fileManager;
        this.repositoryManager = repositoryManager;
        this.uiManager = uiManager;
    }

    async saveFile() {
        const activeFile = this.fileManager.getActiveFile();
        if (!activeFile) return;

        const content = this.uiManager.getCurrentEditorContent();

        try {
            // Proposer de sauvegarder dans le repository
            if (activeFile.isNew && !activeFile.savedToRepository) {
                const saveToRepo = confirm(`Sauvegarder "${activeFile.name}" dans le dossier repository ?`);
                if (saveToRepo) {
                    await this.saveToRepository(activeFile.name, content);
                    activeFile.savedToRepository = true;
                    activeFile.repositoryPath = `${this.repositoryManager.repositoryPath}/${activeFile.name}`;
                    this.uiManager.updateStatus(`Fichier sauvegardé dans le repository`);
                }
            } else if (activeFile.savedToRepository) {
                // Mise à jour du fichier dans le repository
                await this.saveToRepository(activeFile.name, content);
                this.uiManager.updateStatus(`Fichier mis à jour dans le repository`);
            } else {
                // Sauvegarde classique (téléchargement)
                this.fileManager.downloadFile(activeFile.name, content);
                this.uiManager.updateStatus(`Fichier ${activeFile.name} téléchargé`);
            }

            activeFile.content = content;
            activeFile.isModified = false;
            activeFile.isNew = false;

            this.uiManager.updateUI();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.uiManager.updateStatus('Erreur lors de la sauvegarde');
        }
    }

    async saveToRepository(fileName, content) {
        try {
            await this.repositoryManager.saveToRepository(fileName, content);
        } catch (error) {
            alert(error.message);
            throw error;
        }
    }

    async loadFromRepository(fileName) {
        try {
            return await this.repositoryManager.loadFromRepository(fileName);
        } catch (error) {
            console.error('Erreur lors du chargement depuis le repository:', error);

            const recreate = confirm(`Le fichier ${fileName} n'existe pas. Le recréer avec un contenu par défaut ?`);
            if (recreate) {
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileType = this.fileManager.getFileTypeFromExtension(fileExtension);
                const defaultContent = this.fileManager.getTemplateContent(fileType);
                await this.saveToRepository(fileName, defaultContent);
                return defaultContent;
            }

            throw error;
        }
    }

    async openFromRepository(fileName) {
        try {
            const content = await this.loadFromRepository(fileName);
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const fileType = this.fileManager.getFileTypeFromExtension(fileExtension);

            const fileId = `repo-${fileName}-${Date.now()}`;
            const fileData = {
                id: fileId,
                name: fileName,
                type: fileType,
                content: content,
                isModified: false,
                isNew: false,
                savedToRepository: true,
                repositoryPath: `${this.repositoryManager.repositoryPath}/${fileName}`
            };

            this.fileManager.openFiles.set(fileId, fileData);
            this.fileManager.activeFileId = fileId;
            this.uiManager.updateUI();
            this.uiManager.updateStatus(`Fichier ${fileName} chargé depuis le repository`);
        } catch (error) {
            alert(`Impossible d'ouvrir le fichier: ${error.message}`);
        }
    }

    saveAsFile() {
        const activeFile = this.fileManager.getActiveFile();
        if (!activeFile) return;

        const newName = prompt('Nom du fichier:', activeFile.name);
        if (!newName) return;

        const content = this.uiManager.getCurrentEditorContent();
        this.fileManager.downloadFile(newName, content);

        activeFile.name = newName;
        activeFile.content = content;
        activeFile.isModified = false;
        activeFile.isNew = false;

        this.uiManager.updateUI();
        this.uiManager.updateStatus(`Fichier sauvegardé sous ${newName}`);
    }

    async openFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await this.readFileContent(file);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const fileType = this.fileManager.getFileTypeFromExtension(fileExtension);

            const fileId = `file-${this.fileManager.fileCounter++}`;
            const fileData = {
                id: fileId,
                name: file.name,
                type: fileType,
                content: content,
                isModified: false,
                isNew: false,
                originalFile: file
            };

            this.fileManager.openFiles.set(fileId, fileData);
            this.fileManager.activeFileId = fileId;
            this.uiManager.updateUI();
            this.uiManager.updateStatus(`Fichier ${file.name} ouvert`);

            // Réinitialiser l'input file
            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'ouverture du fichier:', error);
            this.uiManager.updateStatus('Erreur lors de l\'ouverture du fichier');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    }

    createNewFile(fileType = 'json') {
        const fileId = `new-file-${++this.fileManager.fileCounter}`;
        const fileName = `nouveau-fichier.${fileType}`;

        const fileData = {
            id: fileId,
            name: fileName,
            type: fileType,
            content: this.fileManager.getTemplateContent(fileType),
            isModified: false,
            isNew: true
        };

        this.fileManager.openFiles.set(fileId, fileData);
        this.fileManager.activeFileId = fileId;
        this.uiManager.updateUI();
        this.uiManager.updateStatus(`Nouveau fichier ${fileType.toUpperCase()} créé`);
    }

    onContentChange() {
        const activeFile = this.fileManager.getActiveFile();
        if (!activeFile) return;

        const currentContent = this.uiManager.getCurrentEditorContent();
        activeFile.isModified = currentContent !== activeFile.content;

        // Mise à jour partielle de l'UI pour les indicateurs de modification
        this.uiManager.updateFileTree();
        this.uiManager.updateTabs();
    }

    closeFile(fileId) {
        const fileData = this.fileManager.openFiles.get(fileId);
        if (fileData && fileData.isModified) {
            if (!confirm(`Le fichier ${fileData.name} a été modifié. Fermer sans sauvegarder ?`)) {
                return;
            }
        }

        this.fileManager.openFiles.delete(fileId);

        if (this.fileManager.activeFileId === fileId) {
            const remainingFiles = Array.from(this.fileManager.openFiles.keys());
            this.fileManager.activeFileId = remainingFiles.length > 0 ? remainingFiles[0] : null;
        }

        this.uiManager.updateUI();
    }

    switchToFile(fileId) {
        if (this.fileManager.openFiles.has(fileId)) {
            this.fileManager.activeFileId = fileId;
            this.uiManager.updateUI();
        }
    }
}