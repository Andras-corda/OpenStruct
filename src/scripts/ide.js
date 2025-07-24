class IDEApp {
    constructor() {
        this.openFiles = new Map();
        this.activeFileId = null;
        this.fileCounter = 0;
        this.repositoryPath = './repository';
        this.repositoryFiles = new Map(); // Cache des fichiers du repository
        this.init();
    }

    async init() {
        await this.initializeRepository();
        await this.loadRepositoryFiles();
        this.updateUI();
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
            // Repository Electron créé côté main.js automatiquement
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
        } catch (error) {
            console.error('Erreur lors du chargement des fichiers du repository:', error);
        }
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
        if (!this.activeFileId) return;

        const fileData = this.openFiles.get(this.activeFileId);
        if (!fileData) return;

        const content = this.getCurrentEditorContent();

        // Proposer de sauvegarder dans le repository
        // if (fileData.isNew && !fileData.savedToRepository) {
        //     const saveToRepo = confirm(`Sauvegarder "${fileData.name}" dans le dossier repository ?`);
        //     if (saveToRepo) {
        //         await this.saveToRepository(fileData.name, content);
        //         fileData.savedToRepository = true;
        //         fileData.repositoryPath = `${this.repositoryPath}/${fileData.name}`;
        //         this.updateStatus(`Fichier sauvegardé dans le repository`);
        //     }
        // } 
        if (fileData.savedToRepository) {
            // Mise à jour du fichier dans le repository
            await this.saveToRepository(fileData.name, content);
            this.updateStatus(`Fichier mis à jour dans le repository`);
        } else {
            // Sauvegarde classique (téléchargement)
            this.downloadFile(fileData.name, content);
            this.updateStatus(`Fichier ${fileData.name} téléchargé`);
        }

        fileData.content = content;
        fileData.isModified = false;
        fileData.isNew = false;

        this.updateUI();
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
                const fileType = this.getFileTypeFromExtension(fileExtension);
                const defaultContent = this.getTemplateContent(fileType);
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
            const fileType = this.getFileTypeFromExtension(fileExtension);

            const fileId = `repo-${fileName}-${Date.now()}`;
            const fileData = {
                id: fileId,
                name: fileName,
                type: fileType,
                content: content,
                isModified: false,
                isNew: false,
                savedToRepository: true,
                repositoryPath: `${this.repositoryPath}/${fileName}`
            };

            this.openFiles.set(fileId, fileData);
            this.activeFileId = fileId;
            this.updateUI();
            this.updateStatus(`Fichier ${fileName} chargé depuis le repository`);
        } catch (error) {
            alert(`Impossible d'ouvrir le fichier: ${error.message}`);
        }
    }

    saveAsFile() {
        if (!this.activeFileId) return;

        const fileData = this.openFiles.get(this.activeFileId);
        if (!fileData) return;

        const newName = prompt('Nom du fichier:', fileData.name);
        if (!newName) return;

        const content = this.getCurrentEditorContent();
        this.downloadFile(newName, content);

        fileData.name = newName;
        fileData.content = content;
        fileData.isModified = false;
        fileData.isNew = false;

        this.updateUI();
        this.updateStatus(`Fichier sauvegardé sous ${newName}`);
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
        this.updateFileTree();
        this.updateTabs();
        this.updateEditor();
        this.updateStatusBar();
    }

    updateFileTree() {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';

        // Section Repository
        if (this.repositoryFiles.size > 0) {
            const repoHeader = document.createElement('div');
            repoHeader.className = 'sidebar-header';
            repoHeader.style.cssText = 'background: #1a1a1a; color: #4fc3f7; margin: 0; padding: 8px 16px; font-size: 10px;';
            repoHeader.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>📁</span>
                            <span>REPOSITORY</span>
                            <button style="background: none; border: none; color: #4fc3f7; cursor: pointer; font-size: 12px;" onclick="app.refreshRepository()" title="Actualiser">⟳</button>
                        </div>
                    `;
            fileTree.appendChild(repoHeader);

            this.repositoryFiles.forEach((content, fileName) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.openFromRepository(fileName);

                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileType = this.getFileTypeFromExtension(fileExtension);
                const icon = this.getFileIcon(fileType);

                fileItem.innerHTML = `
                            <div class="file-icon">${icon}</div>
                            <span>${fileName}</span>
                            <span style="color: #888; font-size: 10px; margin-left: auto;">repo</span>
                        `;

                fileTree.appendChild(fileItem);
            });
        }

        // Section Fichiers ouverts
        if (this.openFiles.size > 0) {
            const openHeader = document.createElement('div');
            openHeader.className = 'sidebar-header';
            openHeader.style.cssText = 'background: #1a1a1a; color: #a5d6a7; margin: 0; padding: 8px 16px; font-size: 10px;';
            openHeader.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>📝</span>
                            <span>FICHIERS OUVERTS</span>
                        </div>
                    `;
            fileTree.appendChild(openHeader);

            this.openFiles.forEach((fileData, fileId) => {
                const fileItem = document.createElement('div');
                fileItem.className = `file-item ${fileId === this.activeFileId ? 'active' : ''}`;
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.switchToFile(fileId);

                const icon = this.getFileIcon(fileData.type);
                const modifiedIndicator = fileData.isModified ? ' •' : '';
                const repoIndicator = fileData.savedToRepository ? ' 🔗' : '';

                fileItem.innerHTML = `
                            <div class="file-icon">${icon}</div>
                            <span>${fileData.name}${modifiedIndicator}${repoIndicator}</span>
                        `;

                fileTree.appendChild(fileItem);
            });
        }

        if (this.repositoryFiles.size === 0 && this.openFiles.size === 0) {
            fileTree.innerHTML = `
                        <div class="file-item">
                            <div class="file-icon">📁</div>
                            <span>Aucun fichier</span>
                        </div>
                        <div class="file-item" onclick="app.createNewFile()" style="color: #4fc3f7; cursor: pointer;">
                            <div class="file-icon">➕</div>
                            <span>Créer un fichier</span>
                        </div>
                    `;
        }
    }

    async refreshRepository() {
        try {
            await this.loadRepositoryFiles();
            this.updateUI();
            this.updateStatus('Repository actualisé');
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
            this.updateStatus('Erreur lors de l\'actualisation');
        }
    }

    updateTabs() {
        const tabsContainer = document.getElementById('editorTabs');
        tabsContainer.innerHTML = '';

        this.openFiles.forEach((fileData, fileId) => {
            const tab = document.createElement('div');
            tab.className = `editor-tab ${fileId === this.activeFileId ? 'active' : ''}`;
            tab.onclick = () => this.switchToFile(fileId);

            const icon = this.getFileIcon(fileData.type);
            const modifiedIndicator = fileData.isModified ? ' •' : '';

            tab.innerHTML = `
                        <span class="file-icon">${icon}</span>
                        <span>${fileData.name}${modifiedIndicator}</span>
                        <button class="tab-close" onclick="event.stopPropagation(); app.closeFile('${fileId}')">&times;</button>
                    `;

            tabsContainer.appendChild(tab);
        });
    }

    updateEditor() {
        const editorContent = document.getElementById('editorContent');
        const welcomeScreen = document.getElementById('welcomeScreen');

        if (!this.activeFileId || !this.openFiles.has(this.activeFileId)) {
            editorContent.innerHTML = `
                        <div class="welcome-screen">
                            <h2>Bienvenue sur OpenStruct</h2>
                            <p>Créez un nouveau fichier ou ouvrez un fichier existant pour commencer</p>
                            <button class="btn" onclick="createNewFile()">Créer un nouveau fichier</button>
                        </div>
                    `;
            return;
        }

        const fileData = this.openFiles.get(this.activeFileId);

        if (fileData.type === 'csv') {
            this.renderCSVEditor(fileData);
        } else {
            this.renderTextEditor(fileData);
        }
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

        this.updateFileTree();
        this.updateTabs();
    }

    updateStatusBar() {
        const statusLeft = document.getElementById('statusLeft');
        const statusRight = document.getElementById('statusRight');

        if (!this.activeFileId) {
            statusLeft.textContent = 'Prêt';
            statusRight.textContent = 'Aucun fichier';
            return;
        }

        const fileData = this.openFiles.get(this.activeFileId);
        if (fileData) {
            statusLeft.textContent = fileData.isModified ? 'Modifié' : 'Sauvegardé';
            statusRight.textContent = `${fileData.type.toUpperCase()} • ${fileData.name}`;
        }
    }

    updateStatus(message) {
        const statusLeft = document.getElementById('statusLeft');
        statusLeft.textContent = message;
        setTimeout(() => {
            this.updateStatusBar();
        }, 2000);
    }

    showRepositoryManager() {
        const modal = document.createElement('div');
        modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                `;

        const content = document.createElement('div');
        content.style.cssText = `
                    background: #2d2d30;
                    padding: 24px;
                    border-radius: 8px;
                    min-width: 400px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                `;

        const filesList = Array.from(this.repositoryFiles.keys()).map(fileName => {
            return `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: #1e1e1e; margin: 4px 0; border-radius: 4px;">
                            <span>${this.getFileIcon(this.getFileTypeFromExtension(fileName.split('.').pop()))}</span>
                            <span style="flex: 1;">${fileName}</span>
                            <button onclick="app.openFromRepository('${fileName}'); app.closeModal()" 
                                    style="background: #0e639c; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                Ouvrir
                            </button>
                            <button onclick="app.deleteFromRepository('${fileName}')" 
                                    style="background: #d32f2f; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                Suppr
                            </button>
                        </div>
                    `;
        }).join('');

        content.innerHTML = `
                    <h3 style="color: #d4d4d4; margin-bottom: 16px;">Gestionnaire Repository</h3>
                    <p style="color: #888; margin-bottom: 16px;">Fichiers dans le dossier repository:</p>
                    
                    ${this.repositoryFiles.size > 0 ? filesList : '<p style="color: #888; font-style: italic;">Aucun fichier dans le repository</p>'}
                    
                    <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
                        <button onclick="app.refreshRepository(); app.closeModal()" 
                                style="background: #3c3c3c; color: #d4d4d4; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer;">
                            Actualiser
                        </button>
                        <button onclick="app.closeModal()" 
                                style="background: #0e639c; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer;">
                            Fermer
                        </button>
                    </div>
                `;

        modal.appendChild(content);
        document.body.appendChild(modal);
        this.currentModal = modal;

        // Fermer en cliquant à côté
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        if (this.currentModal) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
        this.updateUI();
    }

    async deleteFromRepository(fileName) {
        if (!confirm(`Supprimer définitivement le fichier "${fileName}" du repository ?`)) {
            return;
        }

        try {
            // Dans Electron, vous utiliseriez:
            // const fs = require('fs').promises;
            // await fs.unlink(path.join(this.repositoryPath, fileName));

            // Ici on simule la suppression
            const repositoryFiles = JSON.parse(localStorage.getItem('repository_files') || '{}');
            delete repositoryFiles[fileName];
            localStorage.setItem('repository_files', JSON.stringify(repositoryFiles));

            // Mettre à jour le cache local
            this.repositoryFiles.delete(fileName);

            // Fermer le fichier s'il est ouvert
            for (const [fileId, fileData] of this.openFiles.entries()) {
                if (fileData.name === fileName && fileData.savedToRepository) {
                    this.closeFile(fileId);
                    break;
                }
            }

            this.updateStatus(`Fichier ${fileName} supprimé du repository`);
            this.updateUI();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression du fichier');
        }
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

// Initialisation de l'application
const app = new IDEApp();

// Fonctions globales pour les événements
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
    // Cette fonction peut être étendue pour changer le type du fichier actif
    console.log('Type de fichier changé');
}

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
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