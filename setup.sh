#!/bin/bash

echo "========================================="
echo "Collaborative Editor Setup"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and set JWT_SECRET to a secure value"
fi

# Create frontend .env.local if it doesn't exist
if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend/.env.local..."
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
EOF
fi

echo ""
echo "========================================="
echo "Building and starting services..."
echo "========================================="
echo ""

# Build and start with docker-compose
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service health
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Backend API: http://localhost:3001"
echo "WebSocket:   ws://localhost:3001/ws"
echo "Health Check: http://localhost:3001/health"
echo ""
echo "To run the frontend:"
echo "  cd frontend"
echo "  npm install"
echo "  npm run dev"
echo "  # Open http://localhost:3000"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
