#!/usr/bin/env bash
set -o errexit

# Install backend dependencies
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Copy built frontend into backend/static so FastAPI can serve it
rm -rf backend/static
cp -r frontend/dist backend/static
