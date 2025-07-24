// FileManager.js - Gestion des fichiers et opérations de base
export class FileManager {
    constructor() {
        this.openFiles = new Map();
        this.activeFileId = null;
        this.fileCounter = 0;
    }

    createNewFile(fileType) {
        const fileId = `new-file-${++this.fileCounter}`;
        const fileName = `nouveau-fichier.${fileType}`;

        const fileData = {
            id: fileId,
            name: fileName,
            type: fileType,
            content: this.getTemplateContent(fileType),
            isModified: false,
            isNew: true
        };

        this.openFiles.set(fileId, fileData);
        this.activeFileId = fileId;
        return fileData;
    }

    getTemplateContent(fileType) {
        const templates = {
            json: '{\n  "exemple": "valeur",\n  "nombre": 42,\n  "tableau": [1, 2, 3]\n}',
            xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <element>contenu</element>\n  <autre attribut="valeur">texte</autre>\n</root>',
            yaml: 'exemple: valeur\nnombre: 42\ntableau:\n  - element1\n  - element2\n  - element3',
            toml: '[section]\nexemple = "valeur"\nnombre = 42\ntableau = [1, 2, 3]',
            csv: 'nom,age,ville\nJean,25,Paris\nMarie,30,Lyon\nPierre,35,Marseille'
        };
        return templates[fileType] || '';
    }

    openFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const fileExtension = file.name.split('.').pop().toLowerCase();
                const fileType = this.getFileTypeFromExtension(fileExtension);

                const fileId = `file-${this.fileCounter++}`;
                const fileData = {
                    id: fileId,
                    name: file.name,
                    type: fileType,
                    content: content,
                    isModified: false,
                    isNew: false,
                    originalFile: file
                };

                this.openFiles.set(fileId, fileData);
                this.activeFileId = fileId;
                resolve(fileData);
            };

            reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
            reader.readAsText(file);
        });
    }

    getFileTypeFromExtension(ext) {
        const mapping = {
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'csv': 'csv'
        };
        return mapping[ext] || 'json';
    }

    closeFile(fileId) {
        const fileData = this.openFiles.get(fileId);
        if (fileData && fileData.isModified) {
            if (!confirm(`Le fichier ${fileData.name} a été modifié. Fermer sans sauvegarder ?`)) {
                return false;
            }
        }

        this.openFiles.delete(fileId);

        if (this.activeFileId === fileId) {
            const remainingFiles = Array.from(this.openFiles.keys());
            this.activeFileId = remainingFiles.length > 0 ? remainingFiles[0] : null;
        }

        return true;
    }

    switchToFile(fileId) {
        if (this.openFiles.has(fileId)) {
            this.activeFileId = fileId;
            return this.openFiles.get(fileId);
        }
        return null;
    }

    updateFileContent(fileId, content) {
        const fileData = this.openFiles.get(fileId);
        if (fileData) {
            const wasModified = fileData.isModified;
            fileData.isModified = content !== fileData.content;
            return wasModified !== fileData.isModified;
        }
        return false;
    }

    getActiveFile() {
        return this.activeFileId ? this.openFiles.get(this.activeFileId) : null;
    }

    getAllOpenFiles() {
        return Array.from(this.openFiles.values());
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

    getFileIcon(type) {
        const icons = {
            json: '📄',
            xml: '📰',
            yaml: '📝',
            toml: '⚙️',
            csv: '📊'
        };
        return icons[type] || '📄';
    }
}