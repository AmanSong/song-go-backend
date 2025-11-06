import sys, json
from yt_dlp import YoutubeDL

def main():
    try:
        data = json.loads(sys.stdin.read())
        url = data.get("url")
        if not url:
            print(json.dumps({"error": "No URL provided"}))
            return

        ydl_opts = {"quiet": True, "skip_download": True, "format": "bestaudio/best"}

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            print(json.dumps({"audio_url": info["url"]}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
