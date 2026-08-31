import sys
import uvicorn
import os

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print("================================================================")
    print(f"[*] Hermes Finance Server Starting on http://{host}:{port}")
    print(f"[*] Dashboard: http://localhost:{port}")
    print(f"[*] Automated BCA Email Expense Intelligence Platform")
    print("================================================================")
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
