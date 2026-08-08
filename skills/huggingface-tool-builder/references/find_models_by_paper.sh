#!/bin/bash

# Find models associated with papers on Hugging Face
# Usage: ./find_models_by_paper.sh [arXiv_id|search_term]
# Optional: Set HF_TOKEN environment variable for private/gated models

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
    echo -e "${BLUE}Find models associated with papers on Hugging Face${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 [OPTIONS] [search_term|arXiv_id]"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --help    Show this help message"
    echo "  --token   Use HF_TOKEN environment variable (if set)"
    echo ""
    echo -e "${YELLOW}Environment:${NC}"
    echo "  HF_TOKEN  Optional: Hugging Face token for private/gated models"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 1910.01108                    # Search by arXiv ID"
    echo "  $0 distilbert                     # Search by model name"
    echo "  $0 transformer                    # Search by keyword"
    echo "  HF_TOKEN=your_token $0 1910.01108  # Use authentication"
    echo ""
    echo -e "${YELLOW}Description:${NC}"
    echo "This script finds Hugging Face models that are associated with research papers."
    echo "It searches for models that have arXiv IDs in their tags or mentions papers in their metadata."
    echo ""
    echo -e "${YELLOW}Notes:${NC}"
    echo "• HF_TOKEN is optional for public models"
    echo "• Use HF_TOKEN for private repositories or gated models"
    echo "• HF_TOKEN enables higher rate limits for heavy usage"
}

# Parse arguments
USE_TOKEN=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --token)
            USE_TOKEN=true
            shift
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

set -- "${POSITIONAL_ARGS[@]}"

if [[ $# -eq 0 ]]; then
    echo -e "${RED}Error: Please provide a search term or arXiv ID${NC}"
    echo -e "Use ${YELLOW}$0 --help${NC} for usage information"
    exit 1
fi

SEARCH_TERM="$1"

# Set up authentication header if HF_TOKEN is available
if [[ -n "$HF_TOKEN" ]] && [[ "$USE_TOKEN" == true || -n "$HF_TOKEN" ]]; then
    AUTH_HEADER="-H \"Authorization: Bearer $HF_TOKEN\""
    echo -e "${BLUE}Using HF_TOKEN for authentication${NC}"
else
    AUTH_HEADER=""
    if [[ -n "$HF_TOKEN" ]]; then
        echo -e "${YELLOW}HF_TOKEN found but not using it (add --token flag to use)${NC}"
    fi
fi

# Check if the input looks like an arXiv ID (format: YYYY.NNNNN or YYYY.NNNNNNN)
if [[ "$SEARCH_TERM" =~ ^[0-9]{4}\.[0-9]{4,7}$ ]]; then
    echo -e "${BLUE}Searching for models associated with arXiv paper: $SEARCH_TERM${NC}"
    SEARCH_QUERY="arxiv%3A$SEARCH_TERM"
    IS_ARXIV_SEARCH=true
else
    echo -e "${BLUE}Searching for models related to: $SEARCH_TERM${NC}"
    SEARCH_QUERY="$SEARCH_TERM"
    IS_ARXIV_SEARCH=false
fi

# Function to extract arXiv IDs from tags
extract_arxiv_ids() {
    local tags="$1"
    echo "$tags" | jq -r '.[] | select(. | startswith("arxiv:")) | split(":")[1]' 2>/dev/null || true
}

# Function to get paper title from arXiv ID
get_paper_title() {
    local arxiv_id="$1"
    # Try to get paper title from Hugging Face tags if available
    # This is a simplified approach - in practice, you might want to call arXiv API
    echo "Paper Title (arXiv:$arxiv_id)"
}

# Search for models
API_URL="https://huggingface.co/api/models"
echo -e "${YELLOW}Searching Hugging Face API...${NC}"

# Build curl command with authentication if available
CURL_CMD="curl -s $AUTH_HEADER \"$API_URL?search=$SEARCH_QUERY&limit=50\""
echo -e "${BLUE}API Query: $API_URL?search=$SEARCH_QUERY&limit=50${NC}"

# Execute the API call
if [[ -n "$HF_TOKEN" ]]; then
    RESPONSE=$(curl -s -H "Authorization: Bearer $HF_TOKEN" "$API_URL?search=$SEARCH_QUERY&limit=50" || true)
else
    RESPONSE=$(curl -s "$API_URL?search=$SEARCH_QUERY&limit=50" || true)
fi

# Check if we got a valid response
if [[ -z "$RESPONSE" ]] || [[ "$RESPONSE" == "[]" ]]; then
    echo -e "${RED}No models found for search term: $SEARCH_TERM${NC}"

    # If arXiv search failed, try without arxiv: prefix
    if [[ "$IS_ARXIV_SEARCH" == true ]]; then
        echo -e "${YELLOW}Trying broader search without arxiv: prefix...${NC}"
        SEARCH_QUERY="$SEARCH_TERM"
        IS_ARXIV_SEARCH=false

        if [[ -n "$HF_TOKEN" ]]; then
            RESPONSE=$(curl -s -H "Authorization: Bearer $HF_TOKEN" "$API_URL?search=$SEARCH_QUERY&limit=50" || true)
        else
            RESPONSE=$(curl -s "$API_URL?search=$SEARCH_QUERY&limit=50" || true)
        fi

        if [[ -z "$RESPONSE" ]] || [[ "$RESPONSE" == "[]" ]]; then
            echo -e "${RED}Still no results found. Try a different search term.${NC}"
            exit 1
        fi
    else
        exit 1
    fi
fi

# Process the results
echo -e "${GREEN}Found models! Processing results...${NC}"

# Use jq to process the JSON response and find models with paper associations
MODELS_WITH_PAPERS=$(echo "$RESPONSE" | jq -r '
  .[] |
  select(.id != null) |
  {
    id: .id,
    arxiv_tags: [.tags[] | select(. | startswith("arxiv:"))] | join("; "),
    downloads: (.downloads // 0),
    likes: (.likes // 0),
    task: (.pipeline_tag // "unknown"),
    library: (.library_name // "unknown")
  }
  | @base64' 2>/dev/null || true)

# Count total results
TOTAL_MODELS=$(echo "$RESPONSE" | jq 'length' 2>/dev/null || echo "0")
MODELS_WITH_PAPERS_COUNT=$(echo "$MODELS_WITH_PAPERS" | wc -l)

echo -e "${BLUE}Results Summary:${NC}"
echo -e "  Total models found: $TOTAL_MODELS"
echo -e "  Models with paper associations: $MODELS_WITH_PAPERS_COUNT"
echo ""

if [[ -z "$MODELS_WITH_PAPERS" ]]; then
    # Show all models even if no paper associations found
    echo -e "${YELLOW}No explicit paper associations found. Showing all matching models:${NC}"
    echo "$RESPONSE" | jq -r '
      .[] |
      select(.id != null) |
      "📦 \(.id)
   Task: \(.pipeline_tag // "unknown")
   Downloads: \(.downloads // 0)
   Likes: \(.likes // 0)
   Library: \(.library_name // "unknown")
   ---"
    ' 2>/dev/null || echo "Failed to parse response"
else
    # Show models with paper associations
    echo -e "${GREEN}Models with paper associations:${NC}"
    echo "$MODELS_WITH_PAPERS" | while read -r model_data; do
        if [[ -n "$model_data" ]]; then
            # Decode base64 and show formatted
            echo "$model_data" | base64 -d | jq -r ' # security-allowlist: local JSON decoding for display
                "📄 \(.id)
   arXiv: \(.arxiv_tags)
   Task: \(.task)
   Downloads: \(.downloads)
   Likes: \(.likes)
   Library: \(.library)
   ---"
            ' 2>/dev/null || echo "Failed to parse model data"
        fi
    done
fi

# Additional search tips
echo ""
echo -e "${BLUE}Search Tips:${NC}"
echo "• Try searching with the full arXiv ID (e.g., 1910.01108)"
echo "• Try searching with the paper title keywords"
echo "• Try searching with the model name"
echo "• Use HF_TOKEN for private models or higher rate limits"
echo ""
echo -e "${BLUE}Examples to try:${NC}"
echo "  $0 1910.01108                    # DistilBERT paper"
echo "  $0 1810.04805                    # BERT paper"
echo "  $0 1706.03762                    # Attention is All You Need paper"
echo "  $0 roberta                       # RoBERTa models"
echo "  $0 transformer                   # Transformer models"
echo "  HF_TOKEN=your_token $0 1910.01108  # Use authentication"
