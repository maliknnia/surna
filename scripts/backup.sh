#!/bin/bash
# Database backup script for production environments

set -e

# Configuration
BACKUP_DIR="/backup"
DB_NAME="${PGDATABASE:-surna_db}"
DB_USER="${PGUSER:-surna_user}"
DB_HOST="${PGHOST:-db}"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/surna_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup at $(date)"

# Create database dump
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=custom \
  --file="${BACKUP_FILE}.custom"

# Also create a plain SQL backup for easier restoration
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --file="${BACKUP_FILE}"

# Compress the backups
gzip "${BACKUP_FILE}"
gzip "${BACKUP_FILE}.custom"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Cleanup old backups
find "${BACKUP_DIR}" -name "surna_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "surna_backup_*.sql.custom.gz" -mtime +${RETENTION_DAYS} -delete

echo "Old backups cleaned up (older than ${RETENTION_DAYS} days)"

# Upload to cloud storage (optional)
if [ -n "${AWS_S3_BUCKET}" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp "${BACKUP_FILE}.gz" "s3://${AWS_S3_BUCKET}/backups/"
  aws s3 cp "${BACKUP_FILE}.custom.gz" "s3://${AWS_S3_BUCKET}/backups/"
fi

if [ -n "${GCS_BUCKET}" ]; then
  echo "Uploading backup to Google Cloud Storage..."
  gsutil cp "${BACKUP_FILE}.gz" "gs://${GCS_BUCKET}/backups/"
  gsutil cp "${BACKUP_FILE}.custom.gz" "gs://${GCS_BUCKET}/backups/"
fi

echo "Database backup completed successfully at $(date)"