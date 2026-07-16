#!/usr/bin/env python3
"""
Extract YouTube video transcript
Usage: ./extract-transcript.py VIDEO_ID [LANGUAGE_CODE]
"""

import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def extract_transcript(video_id, language='en'):
    """Extract transcript from YouTube video"""
    try:
        # Try to get transcript in specified language with fallback to English
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=[language, 'en']
        )
        
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
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
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
        print("Usage: ./extract-transcript.py VIDEO_ID [LANGUAGE_CODE]")
        print("       ./extract-transcript.py VIDEO_ID --list  (list available transcripts)")
        sys.exit(1)
    
    video_id = sys.argv[1]
    
    # Check if user wants to list available transcripts
    if len(sys.argv) > 2 and sys.argv[2] == "--list":
        success = list_available_transcripts(video_id)
        sys.exit(0 if success else 1)
    
    # Extract transcript
    language = sys.argv[2] if len(sys.argv) > 2 else 'en'
    transcript = extract_transcript(video_id, language)
    print(transcript)
