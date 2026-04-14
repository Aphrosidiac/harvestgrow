#!/bin/bash
# HarvestGrow Database Backup
# Add to crontab: 0 2 * * * /home/digitalscape/HarvestGrow/deploy/backup-db.sh

BACKUP_DIR="/home/digitalscape/backups/harvestgrow"
DB_NAME="harvestgrow"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U harvestgrow $DB_NAME | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup complete: $BACKUP_DIR/db_$DATE.sql.gz"
