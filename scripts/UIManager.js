class UIManager {
    constructor(app) {
        this.app = app;
    }

    updateFileTree() {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';

        if (this.app.repositoryFiles.size > 0) {
            const repoHeader = document.createElement('div');
            repoHeader.className = 'sidebar-header';
            repoHeader.style.cssText = 'background: #1a1a1a; color: #4fc3f7; margin: 0; padding: 8px 16px; font-size: 10px;';
            repoHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>📁</span>
                    <span>REPOSITORY</span>
                    <button style="background: none; border: none; color: #4fc3f7; cursor: pointer; font-size: 12px;" onclick="app.fileManager.refreshRepository()" title="Actualiser">⟳</button>
                </div>
            `;
            fileTree.appendChild(repoHeader);

            this.app.repositoryFiles.forEach((content, fileName) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.app.fileOperations.openFromRepository(fileName);

                const fileExtension = fileName.split('.').pop().toLowerCase();
                const fileType = this.app.getFileTypeFromExtension(fileExtension);
                const icon = this.app.getFileIcon(fileType);

                fileItem.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <span>${fileName}</span>
                    <span style="color: #888; font-size: 10px; margin-left: auto;">repo</span>
                `;

                fileTree.appendChild(fileItem);
            });
        }

        if (this.app.openFiles.size > 0) {
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

            this.app.openFiles.forEach((fileData, fileId) => {
                const fileItem = document.createElement('div');
                fileItem.className = `file-item ${fileId === this.app.activeFileId ? 'active' : ''}`;
                fileItem.style.paddingLeft = '32px';
                fileItem.onclick = () => this.app.switchToFile(fileId);

                const icon = this.app.getFileIcon(fileData.type);
                const modifiedIndicator = fileData.isModified ? ' •' : '';
                const repoIndicator = fileData.savedToRepository ? ' 🔗' : '';

                fileItem.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <span>${fileData.name}${modifiedIndicator}${repoIndicator}</span>
                `;

                fileTree.appendChild(fileItem);
            });
        }

        if (this.app.repositoryFiles.size === 0 && this.app.openFiles.size === 0) {
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

        this.app.openFiles.forEach((fileData, fileId) => {
            const tab = document.createElement('div');
            tab.className = `editor-tab ${fileId === this.app.activeFileId ? 'active' : ''}`;
            tab.onclick = () => this.app.switchToFile(fileId);

            const icon = this.app.getFileIcon(fileData.type);
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

        if (!this.app.activeFileId || !this.app.openFiles.has(this.app.activeFileId)) {
            editorContent.innerHTML = `
                <div class="welcome-screen">
                    <h2>Bienvenue sur OpenStruct</h2>
                    <p>Créez un nouveau fichier ou ouvrez un fichier existant pour commencer</p>
                    <button class="btn" onclick="createNewFile()">Créer un nouveau fichier</button>
                </div>
            `;
            return;
        }

        const fileData = this.app.openFiles.get(this.app.activeFileId);

        if (fileData.type === 'csv') {
            this.app.renderCSVEditor(fileData);
        } else {
            this.app.renderTextEditor(fileData);
        }
    }

    updateStatusBar() {
        const statusLeft = document.getElementById('statusLeft');
        const statusRight = document.getElementById('statusRight');

        if (!this.app.activeFileId) {
            statusLeft.textContent = 'Prêt';
            statusRight.textContent = 'Aucun fichier';
            return;
        }

        const fileData = this.app.openFiles.get(this.app.activeFileId);
        if (fileData) {
            statusLeft.textContent = fileData.isModified ? 'Modifié' : 'Sauvegardé';
            statusRight.textContent = `${fileData.type.toUpperCase()} • ${fileData.name}`;
        }
    }
}