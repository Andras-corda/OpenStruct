class IDEApp {
    constructor() {
        this.openFiles = new Map();
        this.activeFileId = null;
        this.fileCounter = 0;
        this.repositoryFiles = new Map();
        
        this.fileManager = new FileManager(this);
        this.fileOperations = new FileOperations(this);
        this.uiManager = new UIManager(this);
        this.repositoryManager = new RepositoryManager(this);
        
        this.init();
    }

    async init() {
        await this.fileManager.initializeRepository();
        await this.fileManager.loadRepositoryFiles();
        this.updateUI();
    }

    createNewFile() {
        const fileType = document.getElementById('fileTypeSelect').value;
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
        this.updateUI();
        this.updateStatus(`Nouveau fichier ${fileType.toUpperCase()} créé`);
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

    openFile(event) {
        const file = event.target.files[0];
        if (!file) return;

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
            this.updateUI();
            this.updateStatus(`Fichier ${file.name} ouvert`);
        };

        reader.readAsText(file);
        event.target.value = '';
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

    async saveFile() {
        await this.fileOperations.saveFile();
    }

    saveAsFile() {
        if (!this.activeFileId) return;

        const fileData = this.openFiles.get(this.activeFileId);
        if (!fileData) return;

        const newName = prompt('Nom du fichier:', fileData.name);
        if (!newName) return;

        const content = this.getCurrentEditorContent();
        this.fileOperations.downloadFile(newName, content);

        fileData.name = newName;
        fileData.content = content;
        fileData.isModified = false;
        fileData.isNew = false;

        this.updateUI();
        this.updateStatus(`Fichier sauvegardé sous ${newName}`);
    }

    getCurrentEditorContent() {
        const editor = document.getElementById('currentEditor');
        return editor ? editor.value : '';
    }

    closeFile(fileId) {
        const fileData = this.openFiles.get(fileId);
        if (fileData && fileData.isModified) {
            if (!confirm(`Le fichier ${fileData.name} a été modifié. Fermer sans sauvegarder ?`)) {
                return;
            }
        }

        this.openFiles.delete(fileId);

        if (this.activeFileId === fileId) {
            const remainingFiles = Array.from(this.openFiles.keys());
            this.activeFileId = remainingFiles.length > 0 ? remainingFiles[0] : null;
        }

        this.updateUI();
    }

    switchToFile(fileId) {
        if (this.openFiles.has(fileId)) {
            this.activeFileId = fileId;
            this.updateUI();
        }
    }

    updateUI() {
        this.uiManager.updateFileTree();
        this.uiManager.updateTabs();
        this.uiManager.updateEditor();
        this.uiManager.updateStatusBar();
    }

    async openFromRepository(fileName) {
        await this.fileOperations.openFromRepository(fileName);
    }

    async refreshRepository() {
        await this.fileManager.refreshRepository();
    }

    renderTextEditor(fileData) {
        const editorContent = document.getElementById('editorContent');
        editorContent.innerHTML = `
            <textarea
                id="currentEditor"
                class="editor"
                placeholder="Commencez à taper..."
                oninput="app.onContentChange()"
            >${fileData.content}</textarea>
        `;
    }

    renderCSVEditor(fileData) {
        const editorContent = document.getElementById('editorContent');

        try {
            const rows = this.parseCSV(fileData.content);
            if (rows.length === 0) {
                this.renderTextEditor(fileData);
                return;
            }

            const headers = rows[0];
            const dataRows = rows.slice(1);

            let tableHTML = `
                <div class="csv-viewer">
                    <table class="csv-table">
                        <thead>
                            <tr>
            `;

            headers.forEach(header => {
                tableHTML += `<th>${this.escapeHtml(header)}</th>`;
            });

            tableHTML += `
                            </tr>
                        </thead>
                        <tbody>
            `;

            dataRows.forEach(row => {
                tableHTML += '<tr>';
                headers.forEach((_, index) => {
                    const cellValue = row[index] || '';
                    tableHTML += `<td>${this.escapeHtml(cellValue)}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
                <textarea
                    id="currentEditor"
                    class="editor"
                    style="height: 200px; border-top: 1px solid #3e3e42;"
                    placeholder="Éditez le CSV ici..."
                    oninput="app.onContentChange()"
                >${fileData.content}</textarea>
            `;

            editorContent.innerHTML = tableHTML;
        } catch (error) {
            editorContent.innerHTML = `
                <div class="error-message">
                    Erreur lors du parsing CSV: ${error.message}
                </div>
                <textarea
                    id="currentEditor"
                    class="editor"
                    placeholder="Éditez le CSV ici..."
                    oninput="app.onContentChange()"
                >${fileData.content}</textarea>
            `;
        }
    }

    parseCSV(content) {
        const lines = content.trim().split('\n');
        return lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            result.push(current.trim());
            return result;
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    onContentChange() {
        if (!this.activeFileId) return;

        const fileData = this.openFiles.get(this.activeFileId);
        if (!fileData) return;

        const currentContent = this.getCurrentEditorContent();
        fileData.isModified = currentContent !== fileData.content;

        this.uiManager.updateFileTree();
        this.uiManager.updateTabs();
    }

    updateStatus(message) {
        const statusLeft = document.getElementById('statusLeft');
        statusLeft.textContent = message;
        setTimeout(() => {
            this.uiManager.updateStatusBar();
        }, 2000);
    }

    showRepositoryManager() {
        this.repositoryManager.showRepositoryManager();
    }

    closeModal() {
        this.repositoryManager.closeModal();
    }

    async deleteFromRepository(fileName) {
        await this.fileManager.deleteFromRepository(fileName);
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

const app = new IDEApp();

function createNewFile() {
    app.createNewFile();
}

function openFile(event) {
    app.openFile(event);
}

function saveFile() {
    app.saveFile();
}

function saveAsFile() {
    app.saveAsFile();
}

function changeFileType() {
    console.log('Type de fichier changé');
}