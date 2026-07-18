# Synapse

Synapse is an AI-powered chat application built with Vite and React. It provides a modern, user-friendly interface for interacting with multiple AI models through the Pollinations API. With support for real-time streaming responses, image attachments, and customizable system instructions, Synapse offers a flexible platform for AI-assisted conversations.

## Features

*   **Multi-Model Support:** Switch between different AI models (OpenAI, Mistral, Llama, and more) from the settings panel.
*   **Real-time Streaming:** Get instant, streamed responses from AI models as they're generated.
*   **Image Support:** Attach and send images with your messages for multimodal AI interactions.
*   **Chat Sessions:** Create and manage multiple independent chat sessions with persistent storage.
*   **System Instructions:** Define custom system prompts to guide AI behavior for each session.
*   **Theme Support:** Toggle between light and dark themes for comfortable viewing.
*   **Responsive Design:** Fully responsive interface that works seamlessly on desktop and mobile devices.
*   **Markdown Rendering:** Display formatted responses with markdown support and syntax highlighting for code blocks.

## Setup and Installation

To get started with Synapse locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Aegis-plus/Synapse.git
    cd synapse
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the development server, typically on `http://localhost:3000`.

## Usage

Once the development server is running, you can access the application in your browser:

1. **Add a Pollinations Key:** In Configuration, enter a browser-safe publishable key beginning with `pk_`. Create one at [enter.pollinations.ai](https://enter.pollinations.ai). Never put an `sk_` secret key in a browser application.
2. **Select a Model:** Use the settings panel on the right to choose a model loaded from the current Pollinations catalog.
3. **Start Chatting:** Type your message and press Enter or click the send button.
4. **Add Images:** Click the attachment button to add images to your messages for multimodal conversations.
5. **Manage Sessions:** Create and switch between independent chat sessions from the sidebar.
6. **Customize Behavior:** Set system instructions in the settings panel to guide how the AI responds.
7. **Switch Themes:** Use the theme toggle in the sidebar to switch between light and dark modes.

Synapse sends chat requests to `https://gen.pollinations.ai/v1/chat/completions` using Bearer authentication. The publishable key is stored only in the current browser.

## Build for Production

To create an optimized production build:

```bash
npm run build
# or
yarn build
```

The build output will be in the `dist` directory, ready for deployment.

## Preview Production Build

To preview the production build locally:

```bash
npm run preview
# or
yarn preview
```

## Deployment to Vercel

Deploying Synapse to Vercel is straightforward:

1.  **Connect to Vercel:**
    *   Sign up or log in to your Vercel account.
    *   Create a new project by importing your Git repository. Vercel will automatically detect the Vite framework.

2.  **Build and Deploy:**
    *   Vercel will automatically build and deploy your project using the `npm run build` command.

Your project should now be deployed and accessible via a Vercel URL.

## Technologies Used

*   **React 19:** Modern React with hooks and functional components.
*   **TypeScript:** Type-safe development with full type support.
*   **Vite:** Lightning-fast build tool and development server.
*   **Tailwind CSS:** Utility-first CSS framework for styling (via Catppuccin theme).
*   **Lucide React:** Beautiful, consistent icon library.
*   **React Markdown:** Markdown rendering in React components.
*   **React Syntax Highlighter:** Syntax highlighting for code blocks.
*   **Pollinations API:** AI model access and chat completion streaming.

## Project Structure

```
synapse/
├── components/          # React components
│   ├── MessageBubble.tsx    # Message display component
│   ├── Sidebar.tsx          # Chat sessions sidebar
│   └── RightPanel.tsx       # Settings and model selection panel
├── services/            # API services
│   └── api.ts           # Pollinations API integration
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── index.tsx            # Application entry point
├── vite.config.ts       # Vite configuration
└── README.md            # This file
```

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or suggestions, please visit the [GitHub repository](https://github.com/Aegis-plus/Synapse).
