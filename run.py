import sys
import uvicorn
import os

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print("================================================================")
    print(f"[*] Hermes Finance Server Starting on http://{host}:{port}")
    print(f"[*] Local: http://localhost:{port}")
    print(f"[*] Wi-Fi (Android): http://192.168.110.152:{port}")
    print(f"[*] Automated BCA Email Expense Intelligence Platform")
    print("================================================================")
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
