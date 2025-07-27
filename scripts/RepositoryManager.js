class RepositoryManager {
    constructor(app) {
        this.app = app;
        this.currentModal = null;
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

        const filesList = Array.from(this.app.repositoryFiles.keys()).map(fileName => {
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: #1e1e1e; margin: 4px 0; border-radius: 4px;">
                    <span>${this.app.getFileIcon(this.app.getFileTypeFromExtension(fileName.split('.').pop()))}</span>
                    <span style="flex: 1;">${fileName}</span>
                    <button onclick="app.fileOperations.openFromRepository('${fileName}'); app.repositoryManager.closeModal()" 
                            style="background: #0e639c; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        Ouvrir
                    </button>
                    <button onclick="app.fileManager.deleteFromRepository('${fileName}')" 
                            style="background: #d32f2f; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        Suppr
                    </button>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <h3 style="color: #d4d4d4; margin-bottom: 16px;">Gestionnaire Repository</h3>
            <p style="color: #888; margin-bottom: 16px;">Fichiers dans le dossier repository:</p>
            
            ${this.app.repositoryFiles.size > 0 ? filesList : '<p style="color: #888; font-style: italic;">Aucun fichier dans le repository</p>'}
            
            <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="app.fileManager.refreshRepository(); app.repositoryManager.closeModal()" 
                        style="background: #3c3c3c; color: #d4d4d4; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer;">
                    Actualiser
                </button>
                <button onclick="app.repositoryManager.closeModal()" 
                        style="background: #0e639c; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
        this.currentModal = modal;

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
        this.app.updateUI();
    }
}