import sys, json
from yt_dlp import YoutubeDL

# We don't need a custom logger class if we just force everything to stderr
# yt-dlp sends binary data to stdout when outtmpl is set to '-'

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            return # End silently if no input
            
        data = json.loads(input_data)
        url = data.get("url")

        ydl_opts = {
            'format': 'bestaudio/best',
            # '-' directs the binary audio data to standard out (stdout)
            'outtmpl': '-', 
            'quiet': True,
            'no_warnings': True,
            'logtostderr': True, # CRITICAL: Ensure logs go to stderr so they don't corrupt the audio binary
        }

        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

    except Exception as e:
        # Write errors to stderr so Node can read them separately
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()