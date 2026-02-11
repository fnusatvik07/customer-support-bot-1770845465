
class AgentChat {
    constructor() {
        this.messages = document.getElementById('messages');
        this.form = document.getElementById('chatForm');
        this.input = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.status = document.getElementById('status');
        this.backendUrlInput = document.getElementById('backendUrl');
        
        this.backendUrl = null; // Store the working backend URL
        
        this.initializeEventListeners();
        this.loadFiles();
        this.checkBackendStatus();
    }
    
    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    async checkBackendStatus() {
        try {
            // Use the URL from input field or stored URL
            const backendUrl = this.backendUrl || (this.backendUrlInput ? this.backendUrlInput.value : null) || 'http://localhost:8001';
            
            console.log('Checking backend health at:', backendUrl + '/health');
            this.updateStatus('[CONNECTING] Connecting...', '#ffeaa7');
            
            const response = await fetch(backendUrl + '/health');
            if (response.ok) {
                const data = await response.json();
                this.updateStatus('[CONNECTED] Connected', '#55efc4');
                console.log('Backend health check passed:', data);
                this.backendUrl = backendUrl; // Store the working URL
            } else {
                this.updateStatus('[ERROR] Backend Error (' + response.status + ')', '#fd79a8');
                console.error('Backend health check failed:', response.status);
            }
        } catch (error) {
            console.error('Backend connection error:', error);
            this.updateStatus('[ERROR] Connection Failed', '#fd79a8');
            // Try alternative ports
            await this.tryAlternativePorts();
        }
    }
    
    async tryAlternativePorts() {
        const currentPort = parseInt(window.location.port);
        const portsToTry = [
            currentPort - 1,  // Most likely (frontend = backend + 1)
            currentPort + 1,  // Alternative  
            8001,    // Fallback to generated port
            8002, 8003, 8004, 8005, 8006, 8007, 8008  // Common ports
        ];
        
        for (const port of portsToTry) {
            try {
                const testUrl = `http://localhost:${port}`;
                console.log('Trying backend at:', testUrl);
                const response = await fetch(testUrl + '/health');
                if (response.ok) {
                    console.log('Found backend at port:', port);
                    // Update the input field and stored URL
                    this.backendUrl = testUrl;
                    if (this.backendUrlInput) {
                        this.backendUrlInput.value = testUrl;
                    }
                    this.updateStatus('[CONNECTED] Connected', 'connected');
                    return;
                }
            } catch (e) {
                // Port not available, continue trying
            }
        }
        
        this.updateStatus('[ERROR] No Backend Found', 'error');
    }
    
    getBackendUrl() {
        return this.backendUrl || (this.backendUrlInput ? this.backendUrlInput.value : null) || 'http://localhost:8001';
    }
    
    updateStatus(text, colorOrClass = '#e6fffa') {
        this.status.textContent = text;
        
        // Check if it's a color code or class name
        if (colorOrClass.startsWith('#')) {
            this.status.style.backgroundColor = colorOrClass;
            this.status.style.color = '#2d3436';
        } else {
            this.status.className = `status ${colorOrClass}`;
        }
    }
    
    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.input.value = '';
        this.setLoading(true);
        
        try {
            const backendUrl = this.getBackendUrl();
            console.log('Sending message to:', backendUrl + '/query');
            const response = await fetch(`${backendUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: message,
                    max_turns: 20
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.addMessage(result.response, 'assistant');
                // Refresh files after each query in case new files were generated
                setTimeout(() => this.loadFiles(), 2000);
            } else {
                this.addMessage(`Error: ${result.error || 'Unknown error'}`, 'assistant error');
            }
        } catch (error) {
            this.addMessage(`Connection error: ${error.message}`, 'assistant error');
            this.updateStatus('[ERROR] Connection Error', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.messages.appendChild(messageDiv);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    
    setLoading(loading) {
        this.sendButton.disabled = loading;
        const sendText = this.sendButton.querySelector('.send-text');
        const loadingSpan = this.sendButton.querySelector('.loading');
        
        if (loading) {
            sendText.style.display = 'none';
            loadingSpan.style.display = 'inline';
        } else {
            sendText.style.display = 'inline';
            loadingSpan.style.display = 'none';
        }
    }
    
    async loadFiles() {
        try {
            const backendUrl = this.getBackendUrl();
            console.log('Loading files from:', backendUrl + '/files');
            const response = await fetch(`${backendUrl}/files`);
            const result = await response.json();
            
            this.displayFiles(result.files || []);
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }
    
    displayFiles(files) {
        const filesList = document.getElementById('filesList');
        
        if (files.length === 0) {
            filesList.innerHTML = '<p class="no-files">No files generated yet</p>';
            return;
        }
        
        const backendUrl = this.getBackendUrl();
        filesList.innerHTML = files.map(file => `
            <div class="file-item">
                <span class="file-name" title="${file.filename}">${file.filename}</span>
                <a href="${backendUrl}/files/${file.filename}" 
                   class="download-btn" 
                   download="${file.filename}"
                   target="_blank">
                   [DOWNLOAD] Download
                </a>
            </div>
        `).join('');
    }
}

// Global functions
function loadFiles() {
    if (window.agentChat) {
        window.agentChat.loadFiles();
    }
}

function connectToBackend() {
    if (window.agentChat) {
        const input = document.getElementById('backendUrl');
        if (input && input.value.trim()) {
            window.agentChat.backendUrl = input.value.trim();
            // Call the async method properly
            window.agentChat.checkBackendStatus().catch(error => {
                console.error('Connection failed:', error);
            });
        } else {
            console.error('No backend URL provided');
        }
    } else {
        console.error('AgentChat not initialized');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.agentChat = new AgentChat();
});