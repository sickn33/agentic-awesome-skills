#!/usr/bin/env python3
"""
Extract YouTube video transcript
Usage: ./extract-transcript.py VIDEO_ID_OR_URL [LANGUAGE_CODE]
"""

import re
import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# Windows consoles default to a legacy codepage that cannot encode the emoji below,
# or non-Latin transcript text. Force UTF-8 so output never dies on encoding.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

# youtube-transcript-api 1.0 replaced the class methods get_transcript/list_transcripts
# with an instance API (fetch/list). Support both so the skill works on either version.
_IS_LEGACY_API = hasattr(YouTubeTranscriptApi, 'get_transcript')

def parse_video_id(value):
    """Accept a bare video ID or any common YouTube URL form"""
    if not re.search(r'[/.]', value):
        return value

    patterns = [
        r'(?:v=|/embed/|/shorts/|/live/|youtu\.be/)([A-Za-z0-9_-]{11})',
        r'/v/([A-Za-z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group(1)

    print(f"❌ Could not find a video ID in: {value}", file=sys.stderr)
    sys.exit(1)

def extract_transcript(video_id, language='en'):
    """Extract transcript from YouTube video"""
    try:
        # Try to get transcript in specified language with fallback to English
        languages = [language, 'en'] if language != 'en' else ['en']

        if _IS_LEGACY_API:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        else:
            transcript = YouTubeTranscriptApi().fetch(video_id, languages=languages).to_raw_data()

        # Combine all transcript segments
        full_text = " ".join([entry['text'] for entry in transcript])
        return full_text

    except TranscriptsDisabled:
        print(f"❌ Transcripts are disabled for video {video_id}", file=sys.stderr)
        sys.exit(1)
    except NoTranscriptFound:
        print(f"❌ No transcript found for video {video_id}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

def list_available_transcripts(video_id):
    """List all available transcripts for a video"""
    try:
        if _IS_LEGACY_API:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        else:
            transcript_list = YouTubeTranscriptApi().list(video_id)
        print(f"✅ Available transcripts for {video_id}:")
        
        for transcript in transcript_list:
            generated = "[Auto-generated]" if transcript.is_generated else "[Manual]"
            translatable = "(translatable)" if transcript.is_translatable else ""
            print(f"  - {transcript.language} ({transcript.language_code}) {generated} {translatable}")
        
        return True
    except Exception as e:
        print(f"❌ Error listing transcripts: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ./extract-transcript.py VIDEO_ID_OR_URL [LANGUAGE_CODE]")
        print("       ./extract-transcript.py VIDEO_ID_OR_URL --list  (list available transcripts)")
        sys.exit(1)

    video_id = parse_video_id(sys.argv[1])
    
    # Check if user wants to list available transcripts
    if len(sys.argv) > 2 and sys.argv[2] == "--list":
        success = list_available_transcripts(video_id)
        sys.exit(0 if success else 1)
    
    # Extract transcript
    language = sys.argv[2] if len(sys.argv) > 2 else 'en'
    transcript = extract_transcript(video_id, language)
    print(transcript)
