# Build all services
docker compose build

# Start in foreground
docker compose up

# Start in background
docker compose up -d

# View logs (all)
docker compose logs -f

# View logs (single service)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Stop (keep containers)
docker compose stop

# Stop & remove containers (keep volumes)
docker compose down

# Stop & remove containers + volumes (⚠ deletes DB data)
docker compose down -v

# Rebuild after code/dependency changes
docker compose build backend
docker compose build frontend

# Restart a single service
docker compose restart backend
docker compose restart frontend
