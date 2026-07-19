# Hosted-mode API+dashboard container. Local mode doesn't need Docker at
# all — see README.md.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt requirements-hosted.txt ./
RUN pip install --no-cache-dir -r requirements-hosted.txt

COPY src/ src/
COPY webapp/ webapp/
COPY hosted.py ./

EXPOSE 8000
CMD ["python", "hosted.py"]
