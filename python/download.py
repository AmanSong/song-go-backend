import sys, json, tempfile, os
from yt_dlp import YoutubeDL

class MyLogger:
    def debug(self, msg):
        # Send debug messages to stderr, not stdout
        print(msg, file=sys.stderr, flush=True)

    def warning(self, msg):
        print(msg, file=sys.stderr, flush=True)

    def error(self, msg):
        print(msg, file=sys.stderr, flush=True)

def main():
    try:
        data = json.loads(sys.stdin.read())
        url = data.get("url")
        if not url:
            print(json.dumps({"error": "No URL provided"}), flush=True)
            return

        tmp_dir = tempfile.gettempdir()
        tmp_file = os.path.join(tmp_dir, "audio.mp3")

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": tmp_file,
            "quiet": True,               # suppress default messages
            "no_warnings": True,
            "logger": MyLogger(),        # redirect all yt-dlp logs to stderr
        }

        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Only output JSON to stdout
        print(json.dumps({"file_path": tmp_file}), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
