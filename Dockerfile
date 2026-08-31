FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set environment
ENV PYTHONUNBUFFERED=1
ENV TZ=Asia/Jakarta

# Run the Hermes Telegram Agent
CMD ["python", "main_bot.py"]
