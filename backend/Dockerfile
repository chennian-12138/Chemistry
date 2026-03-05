FROM python:3.11-slim as python-deps

RUN apt-get update && apt-get install -y \
    libboost-all-dev \
    cmake \
    libxrender1 \
    libxext6 \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir rdkit

FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libxrender1 \
    libxext6 \
    libfontconfig1 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=python-deps /usr/local /usr/local
COPY --from=python-deps /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV PYTHON_PATH=/usr/local/bin/python3
ENV NODE_ENV=production

RUN npx prisma generate

EXPOSE 8000

CMD ["sh", "-c", "npx prisma db push && npm run start"]
