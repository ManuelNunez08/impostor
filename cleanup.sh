#!/bin/bash

echo "🧹 Cleaning up zombie processes..."

# Kill processes on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "   Killing process on port 3000..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  echo "   ✓ Port 3000 freed"
else
  echo "   ✓ Port 3000 is free"
fi

# Kill processes on port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
  echo "   Killing process on port 3001..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  echo "   ✓ Port 3001 freed"
else
  echo "   ✓ Port 3001 is free"
fi

echo "✨ Cleanup complete!"
echo ""
echo "You can now run: npm run dev:all"









