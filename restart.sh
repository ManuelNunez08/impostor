#!/bin/bash

# Kill any processes on ports 3000 and 3001
echo "Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "Ports cleaned!"
echo "Starting servers..."

# Start the servers
npm run dev:all

