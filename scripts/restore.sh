#!/bin/bash
# Database restore script for production environments

set -e

# Configuration
BACKUP_DIR="/backup"
DB_NAME="${PGDATABASE:-surna_db}"
DB_USER="${PGUSER:-surna_user}"
DB_HOST="${PGHOST:-db}"

# Function to show usage
usage() {
  echo "Usage: $0 [BACKUP_FILE]"
  echo "  BACKUP_FILE: Path to the backup file (optional)"
  echo "  If no backup file specified, will use the latest backup"
  exit 1
}

# Get backup file
if [ $# -eq 1 ]; then
  BACKUP_FILE="$1"
  if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found"
    exit 1
  fi
else
  # Find the latest backup
  BACKUP_FILE=$(find "${BACKUP_DIR}" -name "surna_backup_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
  if [ -z "${BACKUP_FILE}" ]; then
    echo "Error: No backup files found in ${BACKUP_DIR}"
    exit 1
  fi
fi

echo "Using backup file: ${BACKUP_FILE}"

# Confirm restoration
read -p "Are you sure you want to restore the database? This will overwrite existing data. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

# Stop application services
echo "Stopping application services..."
docker-compose -f docker-compose.production.yml stop app

# Create a backup of current database before restore
echo "Creating backup of current database..."
CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --file="${CURRENT_BACKUP}"
gzip "${CURRENT_BACKUP}"
echo "Current database backed up to: ${CURRENT_BACKUP}.gz"

# Restore database
echo "Restoring database from: ${BACKUP_FILE}"

if [[ "${BACKUP_FILE}" == *.custom.gz ]]; then
  # Custom format backup
  gunzip -c "${BACKUP_FILE}" | pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --clean \
    --if-exists \
    --create
elif [[ "${BACKUP_FILE}" == *.sql.gz ]]; then
  # Plain SQL backup
  gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres
else
  echo "Error: Unsupported backup file format"
  exit 1
fi

# Run database migrations to ensure schema is up to date
echo "Running database migrations..."
npm run db:push

# Restart application services
echo "Restarting application services..."
docker-compose -f docker-compose.production.yml start app

# Run health checks
echo "Running health checks..."
sleep 10
curl -f http://localhost/health || {
  echo "Health check failed after restore!"
  exit 1
}

echo "Database restore completed successfully!"
echo "Don't forget to verify application functionality."