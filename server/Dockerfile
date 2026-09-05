# =============================================================================
# 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
# Dockerfile - API 백엔드 컨테이너
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# 패키지 매니페스트 복사 및 설치
COPY server/package*.json ./
RUN npm ci --only=production

# 소스코드 복사
COPY server/ ./server/
COPY client/ ./client/

WORKDIR /app/server

EXPOSE 3300

ENV NODE_ENV=production
ENV PORT=3300

CMD ["node", "src/app.js"]
