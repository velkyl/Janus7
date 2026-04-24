import sys
import json

def main():
    # Receive arguments from Janus
    try:
        args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    except:
        args = {}

    # Logic
    response = {
        "status": "success",
        "message": "Hello from Python!",
        "receivedArgs": args,
        "pythonVersion": sys.version
    }

    # Print JSON result to stdout (Janus captures this)
    print(json.dumps(response))

if __name__ == "__main__":
    main()
