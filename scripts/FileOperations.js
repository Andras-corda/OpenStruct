class FileOperations {
    constructor(app) {
        this.app = app;
    }

    async saveFile() {
        if (!this.app.activeFileId) return;

        const fileData = this.app.openFiles.get(this.app.activeFileId);
        if (!fileData) return;

        const content = this.app.getCurrentEditorContent();

        if (fileData.savedToRepository) {
            await this.app.fileManager.saveToRepository(fileData.name, content);
            this.app.updateStatus(`Fichier mis à jour dans le repository`);
        } else {
            this.downloadFile(fileData.name, content);
            this.app.updateStatus(`Fichier ${fileData.name} téléchargé`);
        }

        fileData.content = content;
        fileData.isModified = false;
        fileData.isNew = false;

        this.app.updateUI();
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async openFromRepository(fileName) {
        try {
            const content = await this.app.fileManager.loadFromRepository(fileName);
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const fileType = this.app.getFileTypeFromExtension(fileExtension);

            const fileId = `repo-${fileName}-${Date.now()}`;
            const fileData = {
                id: fileId,
                name: fileName,
                type: fileType,
                content: content,
                isModified: false,
                isNew: false,
                savedToRepository: true,
                repositoryPath: `${this.app.fileManager.repositoryPath}/${fileName}`
            };

            this.app.openFiles.set(fileId, fileData);
            this.app.activeFileId = fileId;
            this.app.updateUI();
            this.app.updateStatus(`Fichier ${fileName} chargé depuis le repository`);
        } catch (error) {
            alert(`Impossible d'ouvrir le fichier: ${error.message}`);
        }
    }
}