# Chess Tutor - AI-Powered Chess Learning Application

An intelligent chess tutor application built with Electron, featuring a powerful AI coach powered by LangChain and Ollama, integrated with the Stockfish chess engine for position analysis and gameplay.

## Features

- 🤖 **AI Chess Coach**: Local LLM-powered conversational chess tutor
- ♟️ **Interactive Chess Board**: Visual chess board with move highlighting and annotations  
- 🎯 **Stockfish Integration**: Powerful chess engine for position analysis and computer opponent
- 📚 **Opening Knowledge**: Comprehensive database of chess openings with ECO codes
- 💬 **Real-time Chat**: Chat with AI coach about positions, strategies, and learning
- 🔧 **Chess Tools**: Specialized AI tools for position analysis, opening details, and board manipulation
- 📊 **Game Analysis**: Position evaluation and move suggestions
- 🎮 **Play vs Computer**: Challenge the Stockfish engine at various difficulty levels

## Prerequisites

Before setting up the Chess Tutor, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Ollama** - [Download here](https://ollama.ai/)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd chess-tutor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Stockfish Engine

The Stockfish chess engine binary is excluded from the repository. You need to download and set it up:

#### Option A: Download Pre-compiled Stockfish

1. **Visit the Stockfish Downloads**: Go to [https://stockfishchess.org/download/](https://stockfishchess.org/download/)

2. **Download for your OS**:
   - **macOS**: Download the macOS binary
   - **Windows**: Download the Windows executable  
   - **Linux**: Download the Linux binary

3. **Create the stockfish directory**:
   ```bash
   mkdir stockfish
   ```

4. **Place the binary**:
   - Extract the downloaded file
   - Copy the Stockfish binary to `stockfish/stockfish` (no file extension on macOS/Linux)
   - On Windows, ensure it's named `stockfish/stockfish.exe`

5. **Make executable** (macOS/Linux only):
   ```bash
   chmod +x stockfish/stockfish
   ```

#### Option B: Compile from Source (Advanced)

```bash
# Clone Stockfish repository
git clone https://github.com/official-stockfish/Stockfish.git temp-stockfish
cd temp-stockfish/src

# Compile (adjust for your system)
make -j build ARCH=x86-64-modern

# Copy binary to project
mkdir -p ../../stockfish
cp stockfish ../../stockfish/stockfish

# Clean up
cd ../../
rm -rf temp-stockfish
```

### 4. Set Up Ollama and AI Model

1. **Install Ollama**: Download and install from [https://ollama.ai/](https://ollama.ai/)

2. **Pull the required model**:
   ```bash
   ollama pull llama3.2:3b
   ```

3. **Start Ollama service**:
   ```bash
   ollama serve
   ```
   
   Keep this running in a separate terminal window.

### 5. Verify Your Setup

Your project structure should look like this:

```
chess-tutor/
├── stockfish/
│   └── stockfish              # ← Stockfish binary (you added this)
├── node_modules/              # ← npm dependencies (auto-generated)
├── package.json
├── main.js
├── index.html
├── ai/
│   ├── interfaces/
│   ├── tools/
│   └── prompts/
├── assets/
│   ├── js/
│   ├── css/
│   └── libs/
└── data/
```

## Running the Application

### 1. Start Ollama (if not already running)

```bash
ollama serve
```

### 2. Launch the Chess Tutor

```bash
npm start
```

Or for development mode:

```bash
npm run dev
```

The application will open in an Electron window with the chess board and AI chat interface.

## Usage Guide

### Basic Chess Play

1. **Make moves**: Click and drag pieces on the board
2. **Get analysis**: The AI coach can analyze any position
3. **Play vs Engine**: Use the engine controls to start a game against Stockfish

### AI Coach Interaction

The AI coach understands the current board position and can help with:

- **Opening advice**: "What's the best opening for beginners?"
- **Position analysis**: "Analyze this position"
- **Strategic guidance**: "What should I focus on in the middlegame?"
- **Tactical training**: "Show me a tactical pattern"

### Available Commands

The AI coach has access to specialized chess tools:

- **Position Loading**: Load specific positions by FEN notation
- **Opening Database**: Access comprehensive opening information
- **Move Analysis**: Get detailed analysis of the current position
- **Strategic Guidance**: Receive personalized coaching advice

### Example Interactions

```
You: "Teach me the French Defense"
AI: [Loads the French Defense position and explains key concepts]

You: "What's the best move here?"
AI: [Analyzes current position and suggests optimal moves]

You: "I want to improve my endgame"
AI: [Provides endgame training positions and guidance]
```

## Configuration

### Stockfish Settings

You can adjust Stockfish settings in the engine controls:

- **Depth**: Analysis depth (1-20)
- **Time**: Think time per move (milliseconds)
- **Skill Level**: Engine strength (0-20)

### AI Model Settings

The application uses Llama 3.2 3B by default. To use a different model:

1. Pull the desired model: `ollama pull <model-name>`
2. Update the model name in `ai/interfaces/chat/chat-interface.js`

## Troubleshooting

### Common Issues

**Stockfish not working:**
- Ensure the binary is in `stockfish/stockfish`
- Check file permissions (must be executable)
- Verify the binary is compatible with your OS

**AI chat not responding:**
- Ensure Ollama is running (`ollama serve`)
- Check that the model is downloaded (`ollama list`)
- Verify network connectivity to localhost

**Application won't start:**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (must be v18+)
- Look for error messages in the terminal

### Debug Commands

Open the developer console (F12) and try:

```javascript
// Test AI system
window.debugAI()

// Test chess tools
window.testChessToolsDirectly()

// Test game state integration
window.debugGameStateSystem()
```

### Log Files

Check the Electron console for detailed error messages and debugging information.

## Development

### Project Structure

```
chess-tutor/
├── main.js                    # Electron main process
├── index.html                 # Application UI
├── package.json              # Dependencies and scripts
├── ai/                       # AI system components
│   ├── interfaces/chat/      # Chat interface implementations
│   ├── tools/chess-tools/    # Chess-specific AI tools
│   └── prompts/              # System prompts and templates
├── assets/
│   ├── js/                   # Core application modules
│   ├── css/                  # Styling
│   └── libs/                 # External libraries
└── data/
    └── chess-knowledge/      # Opening database and chess data
```

### Key Components

- **GameEngine**: Chess game logic and move validation
- **BoardManager**: Visual chess board interaction
- **StockfishInterface**: Engine communication and analysis
- **ChatInterface**: AI coach conversation handling
- **ChessTools**: Specialized AI tools for chess operations

### Adding New Features

1. Create new modules in `assets/js/`
2. Add AI tools in `ai/tools/`
3. Update system prompts in `ai/prompts/`
4. Integrate with existing components via `app-orchestrator.js`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review console logs for error messages
3. Open an issue with detailed reproduction steps

## Acknowledgments

- **Stockfish**: Powerful chess engine - [https://stockfishchess.org/](https://stockfishchess.org/)
- **Ollama**: Local LLM inference - [https://ollama.ai/](https://ollama.ai/)
- **LangChain**: AI application framework - [https://langchain.com/](https://langchain.com/)
- **Chessboard.js**: Interactive chess board - [https://chessboardjs.com/](https://chessboardjs.com/)
- **Chess.js**: Chess move validation - [https://github.com/jhlywa/chess.js](https://github.com/jhlywa/chess.js)
