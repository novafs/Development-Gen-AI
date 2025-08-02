document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    // Theme-related DOM elements removed
    const micButton = document.getElementById('mic-button');
    const imageUploadButton = document.getElementById('image-upload-button');
    const fileUploadButton = document.getElementById('file-upload-button');
    const imageInput = document.getElementById('image-input');
    const fileInput = document.getElementById('file-input');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const personaSelect = document.getElementById('persona-select');
    
    // State
    let chatHistory = [];
    let currentPersona = 'default';
    let pendingImageFile = null;

    // --- System Instructions for Different Personas ---
    const personaInstructions = {
        'default': 'You are a helpful and friendly general-purpose assistant. Your name is Gemini.',
        'code': 'You are an expert programmer and code assistant. Provide clear, well-commented code examples. Explain complex concepts simply and concisely. Use markdown for all code blocks.',
        'design': 'You are a creative design assistant. Help brainstorm UI/UX ideas, color palettes, and layout concepts. Be visual and descriptive in your suggestions.',
        'research': 'You are a research assistant. Provide factual, well-sourced information. Summarize long texts, find data, and cite your sources when possible.',
        'creative': 'You are a creative writing partner. Help write stories, poems, and scripts. Be imaginative and inspiring.'
    };

    // --- API Calls to Backend ---
    async function getChatResponse(prompt) {
        // Add user's message to the main history
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const apiUrl = 'http://localhost:3000/chat';
        
        const payload = {
            messages: [
                { role: "user", content: `(Persona: ${personaInstructions[currentPersona]})` },
                ...chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.parts[0].text
                }))
            ]
        };
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            const botMessage = result.reply;
            
            chatHistory.push({ role: "model", parts: [{ text: botMessage }] });
            
            return botMessage;
        } catch (error) {
            console.error("Chat API Error:", error);
            return "There was an error connecting to the backend. Please ensure the server is running and configured to accept persona instructions.";
        }
    }
    
    async function getImageResponse(prompt, imageFile) {
        const apiUrl = 'http://localhost:3000/generate-text-from-image';
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image', imageFile);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Image API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            return result.result;

        } catch (error) {
            console.error("Image Generation Error:", error);
            return "Sorry, I couldn't process the image with the backend.";
        }
    }

    // --- UI Functions ---
    function addMessage(sender, content, type = 'text') {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('flex', 'message-animate', 'w-full');
        
        let messageElement;

        if (sender === 'user') {
            messageWrapper.classList.add('justify-end');
            messageElement = `<div class="bg-indigo-600 text-white p-3 rounded-lg max-w-lg">${renderContent(content, type)}</div>`;
        } else {
            messageWrapper.classList.add('justify-start');
            messageElement = `
                <div class="flex items-start space-x-3 max-w-lg">
                    <img src="https://placehold.co/32x32/7c3aed/ffffff?text=G" alt="Bot Avatar" class="w-8 h-8 rounded-full flex-shrink-0 mt-1">
                    <div class="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg">
                        ${renderContent(content, type)}
                    </div>
                </div>
            `;
        }
        
        messageWrapper.innerHTML = messageElement;
        chatWindow.appendChild(messageWrapper);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function renderContent(content, type) {
        switch (type) {
            case 'image':
                return `<img src="${content}" alt="User upload" class="rounded-lg max-w-xs cursor-pointer" onclick="window.open('${content}')">`;
            case 'file':
                return `<div class="flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>${content}</span></div>`;
            case 'text':
            default:
                let html = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-2 text-sm"><code>$1</code></pre>');
                return `<p>${html}</p>`;
        }
    }

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = '';
        userInput.focus();
        typingIndicator.classList.remove('hidden');

        let botMessage;

        if (pendingImageFile) {
            botMessage = await getImageResponse(message, pendingImageFile);
            pendingImageFile = null;
        } else {
            botMessage = await getChatResponse(message);
        }
        
        typingIndicator.classList.add('hidden');
        addMessage('bot', botMessage);
    }

    // --- Feature Initializers ---
    
    // Theme-related functions have been removed.

    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            micButton.disabled = true;
            micButton.title = "Speech recognition not supported in this browser.";
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        let isListening = false;
        micButton.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
                return;
            }
            recognition.start();
        });
        recognition.onstart = () => {
            isListening = true;
            micButton.classList.add('text-red-500', 'animate-pulse');
        };
        recognition.onend = () => {
            isListening = false;
            micButton.classList.remove('text-red-500', 'animate-pulse');
        };
        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            handleSendMessage();
        };
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            addMessage('bot', `Speech recognition error: ${event.error}`);
        };
    }

    function setupFileUploads() {
        imageUploadButton.addEventListener('click', () => imageInput.click());
        fileUploadButton.addEventListener('click', () => fileInput.click());
        
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                pendingImageFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    addMessage('user', e.target.result, 'image');
                    addMessage('bot', `I've received "${file.name}". Now, type your question about the image and press send.`);
                };
                reader.readAsDataURL(file);
                imageInput.value = '';
            }
        });

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                addMessage('user', file.name, 'file');
                addMessage('bot', `I've received the file "${file.name}". This feature is not yet connected to the backend.`);
            }
        });
    }

    function setupSettingsModal() {
        settingsButton.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
        closeModalButton.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
        saveSettingsButton.addEventListener('click', () => {
            const selectedPersona = personaSelect.value;
            currentPersona = selectedPersona;
            localStorage.setItem('persona', selectedPersona);
            settingsModal.classList.add('hidden');
            addMessage('bot', `Understood. My persona is now set to: **${personaSelect.options[personaSelect.selectedIndex].text}**.`);
            chatHistory = []; // Clear history to start a fresh conversation with the new persona
            chatWindow.innerHTML = '';
        });
    }

    function loadPreferences() {
        const savedPersona = localStorage.getItem('persona');
        if (savedPersona) {
            currentPersona = savedPersona;
            personaSelect.value = savedPersona;
        }
    }

    // --- Event Listeners & Initialization ---
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // Initial setup calls
    loadPreferences();
    setupSpeechRecognition();
    setupFileUploads();
    setupSettingsModal();

    // Initial greeting from the bot
    setTimeout(() => {
         addMessage('bot', "Hello! You can change my persona in the settings menu. How can I assist you today?");
    }, 500);
});
