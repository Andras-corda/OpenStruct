// UIManager.js - Gestion de l'interface utilisateur
export class UIManager {
    constructor(fileManager, repositoryManager) {
        this.fileManager = fileManager;
        this.repositoryManager = repositoryManager;
        this.currentModal = null;
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
        const repositoryFiles = this.repositoryManager.getRepositoryFiles();
        if (repositoryFiles.length > 0) {
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

            repositoryFiles.forEach(fileName => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.openFromRepository(fileName);

                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileType = this.fileManager.getFileTypeFromExtension(fileExtension);
                const icon = this.fileManager.getFileIcon(fileType);

                fileItem.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <span>${fileName}</span>
                    <span style="color: #888; font-size: 10px; margin-left: auto;">repo</span>
                `;

                fileTree.appendChild(fileItem);
            });
        }

        // Section Fichiers ouverts
        const openFiles = this.fileManager.getAllOpenFiles();
        if (openFiles.length > 0) {
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

            openFiles.forEach(fileData => {
                const fileItem = document.createElement('div');
                fileItem.className = `file-item ${fileData.id === this.fileManager.activeFileId ? 'active' : ''}`;
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.switchToFile(fileData.id);

                const icon = this.fileManager.getFileIcon(fileData.type);
                const modifiedIndicator = fileData.isModified ? ' •' : '';
                const repoIndicator = fileData.savedToRepository ? ' 🔗' : '';

                fileItem.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <span>${fileData.name}${modifiedIndicator}${repoIndicator}</span>
                `;

                fileTree.appendChild(fileItem);
            });
        }

        // Message par défaut
        if (repositoryFiles.length === 0 && openFiles.length === 0) {
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

    updateTabs() {
        const tabsContainer = document.getElementById('editorTabs');
        tabsContainer.innerHTML = '';

        this.fileManager.getAllOpenFiles().forEach(fileData => {
            const tab = document.createElement('div');
            tab.className = `editor-tab ${fileData.id === this.fileManager.activeFileId ? 'active' : ''}`;
            tab.onclick = () => this.switchToFile(fileData.id);

            const icon = this.fileManager.getFileIcon(fileData.type);
            const modifiedIndicator = fileData.isModified ? ' •' : '';

            tab.innerHTML = `
                <span class="file-icon">${icon}</span>
                <span>${fileData.name}${modifiedIndicator}</span>
                <button class="tab-close" onclick="event.stopPropagation(); app.closeFile('${fileData.id}')">&times;</button>
            `;

            tabsContainer.appendChild(tab);
        });
    }

    updateEditor() {
        const editorContent = document.getElementById('editorContent');
        const activeFile = this.fileManager.getActiveFile();

        if (!activeFile) {
            editorContent.innerHTML = `
                <div class="welcome-screen">
                    <h2>Bienvenue dans l'IDE Multi-Format</h2>
                    <p>Créez un nouveau fichier ou ouvrez un fichier existant pour commencer</p>
                    <button class="btn" onclick="createNewFile()">Créer un nouveau fichier</button>
                </div>
            `;
            return;
        }

        if (activeFile.type === 'csv') {
            this.renderCSVEditor(activeFile);
        } else {
            this.renderTextEditor(activeFile);
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

    updateStatusBar() {
        const statusLeft = document.getElementById('statusLeft');
        const statusRight = document.getElementById('statusRight');
        const activeFile = this.fileManager.getActiveFile();

        if (!activeFile) {
            statusLeft.textContent = 'Prêt';
            statusRight.textContent = 'Aucun fichier';
            return;
        }

        statusLeft.textContent = activeFile.isModified ? 'Modifié' : 'Sauvegardé';
        statusRight.textContent = `${activeFile.type.toUpperCase()} • ${activeFile.name}`;
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

        const repositoryFiles = this.repositoryManager.getRepositoryFiles();
        const filesList = repositoryFiles.map(fileName => {
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const fileType = this.fileManager.getFileTypeFromExtension(fileExtension);
            const icon = this.fileManager.getFileIcon(fileType);
            
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: #1e1e1e; margin: 4px 0; border-radius: 4px;">
                    <span>${icon}</span>
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
            
            ${repositoryFiles.length > 0 ? filesList : '<p style="color: #888; font-style: italic;">Aucun fichier dans le repository</p>'}
            
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

    // Méthodes de délégation pour simplifier l'interface
    switchToFile(fileId) {
        this.fileManager.switchToFile(fileId);
        this.updateUI();
    }

    getCurrentEditorContent() {
        const editor = document.getElementById('currentEditor');
        return editor ? editor.value : '';
    }
}