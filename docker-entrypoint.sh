#!/bin/sh
set -e

echo "Running TypeORM migrations..."
npm run migration:run

echo "Starting backend application..."
exec node dist/main

