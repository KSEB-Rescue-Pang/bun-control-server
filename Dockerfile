# Bun 런타임을 사용하는 베이스 이미지
FROM oven/bun:1.0.35-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 bun.lock 파일 복사
COPY package.json bun.lock ./

# 의존성 설치
RUN bun install

# 소스 코드 복사
COPY . .

# TypeScript 컴파일 (필요한 경우)
RUN bun run build || true

# 포트 노출
EXPOSE 3000

# 애플리케이션 실행
CMD ["bun", "run", "start"] 