#!/usr/bin/env bash

# Audio Transcriber - Requirements Installation Script
# Automatically installs and validates dependencies

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Audio Transcriber - Dependency Installation${NC}"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Python ${PYTHON_VERSION} detected${NC}"

# Check pip
if ! python3 -m pip --version &>/dev/null; then
    echo -e "${RED}❌ pip not found. Please install pip${NC}"
    exit 1
fi

echo -e "${GREEN}✅ pip available${NC}"
echo ""

# Install system dependencies (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}📦 Checking system dependencies (macOS)...${NC}"
    
    # Check for Homebrew
    if command -v brew &>/dev/null; then
        # Install pkg-config and ffmpeg if not present
        NEED_INSTALL=""
        
        if ! brew list pkg-config &>/dev/null 2>&1; then
            NEED_INSTALL="$NEED_INSTALL pkg-config"
        fi
        
        if ! brew list ffmpeg &>/dev/null 2>&1; then
            NEED_INSTALL="$NEED_INSTALL ffmpeg"
        fi
        
        if [[ -n "$NEED_INSTALL" ]]; then
            echo -e "${BLUE}Installing:$NEED_INSTALL${NC}"
            brew install $NEED_INSTALL --quiet
            echo -e "${GREEN}✅ System dependencies installed${NC}"
        else
            echo -e "${GREEN}✅ System dependencies already installed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Homebrew not found. Install manually if needed:${NC}"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    fi
fi

echo ""

# Install faster-whisper (recommended)
echo -e "${BLUE}📦 Installing Faster-Whisper...${NC}"

# Try different installation methods based on Python environment
if python3 -m pip install faster-whisper --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ Faster-Whisper installed successfully${NC}"
elif python3 -m pip install --user --break-system-packages faster-whisper --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ Faster-Whisper installed successfully (user mode)${NC}"
else
    echo -e "${YELLOW}⚠️  Faster-Whisper installation failed, trying Whisper...${NC}"
    
    if python3 -m pip install openai-whisper --quiet 2>/dev/null; then
        echo -e "${GREEN}✅ Whisper installed successfully${NC}"
    elif python3 -m pip install --user --break-system-packages openai-whisper --quiet 2>/dev/null; then
        echo -e "${GREEN}✅ Whisper installed successfully (user mode)${NC}"
    else
        echo -e "${RED}❌ Failed to install transcription engine${NC}"
        echo ""
        echo -e "${YELLOW}Manual installation options:${NC}"
        echo "  1. Use --break-system-packages (macOS/Homebrew Python):"
        echo "     python3 -m pip install --user --break-system-packages openai-whisper"
        echo ""
        echo "  2. Use virtual environment (recommended):"
        echo "     python3 -m venv ~/whisper-env"
        echo "     source ~/whisper-env/bin/activate"
        echo "     pip install faster-whisper"
        echo ""
        echo "  3. Use pipx (isolated):"
        echo "     brew install pipx"
        echo "     pipx install openai-whisper"
        exit 1
    fi
fi

# Install UI/progress libraries (tqdm, rich)
echo ""
echo -e "${BLUE}📦 Installing UI libraries (tqdm, rich)...${NC}"

if python3 -m pip install tqdm rich --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ tqdm and rich installed successfully${NC}"
elif python3 -m pip install --user --break-system-packages tqdm rich --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ tqdm and rich installed successfully (user mode)${NC}"
else
    echo -e "${YELLOW}⚠️  Optional UI libraries not installed (skill will still work)${NC}"
fi

# Check ffmpeg (optional but recommended)
echo ""
if command -v ffmpeg &>/dev/null; then
    echo -e "${GREEN}✅ ffmpeg already installed${NC}"
else
    echo -e "${YELLOW}⚠️  ffmpeg not found (should have been installed earlier)${NC}"
    if [[ "$OSTYPE" == "darwin"* ]] && command -v brew &>/dev/null; then
        echo -e "${BLUE}Installing ffmpeg via Homebrew...${NC}"
        brew install ffmpeg --quiet && echo -e "${GREEN}✅ ffmpeg installed${NC}"
    else
        echo -e "${BLUE}ℹ️  ffmpeg is optional but recommended for format conversion${NC}"
        echo ""
        echo "Install ffmpeg:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  brew install ffmpeg"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  sudo apt install ffmpeg  # Debian/Ubuntu"
            echo "  sudo yum install ffmpeg  # CentOS/RHEL"
        fi
    fi
fi

# Verify installation
echo ""
echo -e "${BLUE}🔍 Verifying installation...${NC}"

if python3 -c "import faster_whisper" 2>/dev/null; then
    echo -e "${GREEN}✅ Faster-Whisper verified${NC}"
    TRANSCRIBER="Faster-Whisper"
elif python3 -c "import whisper" 2>/dev/null; then
    echo -e "${GREEN}✅ Whisper verified${NC}"
    TRANSCRIBER="Whisper"
else
    echo -e "${RED}❌ No transcription engine found after installation${NC}"
    exit 1
fi

# Download initial model (optional)
read -p "Download Whisper 'base' model now? (recommended, ~74MB) [Y/n]: " DOWNLOAD_MODEL

if [[ ! "$DOWNLOAD_MODEL" =~ ^[Nn] ]]; then
    echo ""
    echo -e "${BLUE}📥 Downloading 'base' model...${NC}"
    
    python3 << 'EOF'
try:
    import faster_whisper
    model = faster_whisper.WhisperModel("base", device="cpu", compute_type="int8")
    print("✅ Model downloaded successfully")
except:
    try:
        import whisper
        model = whisper.load_model("base")
        print("✅ Model downloaded successfully")
    except Exception as e:
        print(f"❌ Model download failed: {e}")
EOF
fi

# Success summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Installed components:"
echo "  • Transcription engine: $TRANSCRIBER"
if command -v ffmpeg &>/dev/null; then
    echo "  • Format conversion: ffmpeg (available)"
else
    echo "  • Format conversion: ffmpeg (not installed)"
fi
echo ""
echo "🚀 Ready to use! Try:"
echo "  copilot> transcribe audio to markdown: myfile.mp3"
echo "  claude> transcreva este áudio: myfile.mp3"
echo ""
