## Project Overview

Zot-ChatBot integrates a Node.js/Express backend with a static, dark-themed front-end to deliver AI-powered chat and content-generation in the browser. It leverages Google GenAI models to process text prompts, multi-turn conversations, and image inputs, simplifying the creation of interactive assistant experiences.

Problems It Solves

- Rapid AI integration: Exposes text-generation and chat endpoints over HTTP.
- Multimodal inputs: Accepts text, voice, image or file uploads in a single UI.
- Unified assistant interface: Combines prompt handling, chat history, and settings into one browser application.

High-Level Architecture

Backend (index.js)

- Uses Express to serve API routes and static assets.
- Key routes:
POST /generate-text – single-prompt text generation 
POST /chat – multi-message chat sessions 
POST /generate-text-from-image – OCR + generative response
- POST /generate-text – single-prompt text generation
- POST /chat – multi-message chat sessions
- POST /generate-text-from-image – OCR + generative response

Front-end (public/index.html + public/script.js)

- HTML/CSS: Dark-themed chat interface with header, message pane, input controls and settings modal.
- JavaScript: Handles user input (text, speech, files), persona selection, and invokes backend APIs via fetch. Renders AI responses in real time.

Workflow Example

1. User types or speaks a message.
2. script.js sends a POST request to /chat with the message history.
3. Express handler forwards prompts to Google GenAI, receives a response.
4. Server returns JSON; script.js updates the chat window.

Starting the Server

```js
// index.js
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Mount AI endpoints here...
app.post('/chat', async (req, res) => {
 // call Google GenAI with req.body.messages
 res.json({ reply: 'AI response here' });
});

app.listen(3000, () =>
 console.log('Zot-ChatBot listening on http://localhost:3000')
);

```

Front-end API Call

```js
// public/script.js
async function sendMessage(messages) {
 const response = await fetch('/chat', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ messages })
 });
 const { reply } = await response.json();
 appendMessage('assistant', reply);
}

```

This architecture lets developers extend personas, customize prompts, add new UI controls, or integrate alternative AI backends with minimal effort.
