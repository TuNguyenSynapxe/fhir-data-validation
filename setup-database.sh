#!/bin/bash
# =============================================================================
# FHIR Processor V2 - Database Setup Script
# =============================================================================

set -e

PROJECT_ROOT="/Users/tunguyen/Library/CloudStorage/OneDrive-Personal/Synapxe/PSS_V2/fhir_processor_v2"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "FHIR Processor V2 - Database Setup"
echo "=========================================="
echo ""

# Step 1: Start PostgreSQL Container
echo "📦 Step 1: Starting PostgreSQL container..."
docker-compose up -d postgres
echo "✅ Container started"
echo ""

# Step 2: Wait for PostgreSQL to be ready
echo "⏳ Step 2: Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec fhir_processor_postgres pg_isready -U postgres -d fhir_validation > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done
echo ""

# Step 3: Verify Schema
echo "🔍 Step 3: Verifying database schema..."
TABLE_COUNT=$(docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects';" | xargs)

if [ "$TABLE_COUNT" -eq "1" ]; then
    echo "✅ Projects table exists"
else
    echo "❌ Projects table not found"
    exit 1
fi
echo ""

# Step 4: Check Seed Data
echo "📊 Step 4: Checking seed data..."
PROJECT_COUNT=$(docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -t -c "SELECT COUNT(*) FROM projects;" | xargs)
PUBLISHED_COUNT=$(docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -t -c "SELECT COUNT(*) FROM projects WHERE status = 'published';" | xargs)

echo "   Total projects: $PROJECT_COUNT"
echo "   Published projects: $PUBLISHED_COUNT"
echo "✅ Seed data loaded"
echo ""

# Step 5: Show Projects
echo "📋 Step 5: Current projects in database:"
docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -c "SELECT slug, name, status FROM projects ORDER BY status, name;"
echo ""

# Step 6: Connection Info
echo "=========================================="
echo "✅ Database Setup Complete!"
echo "=========================================="
echo ""
echo "Connection Details:"
echo "  Host:     localhost"
echo "  Port:     5433"
echo "  Database: fhir_validation"
echo "  User:     postgres"
echo "  Password: postgres"
echo ""
echo "Connection String (updated in appsettings.json):"
echo "  Host=localhost;Database=fhir_validation;Username=postgres;Password=postgres;Port=5433"
echo ""
echo "Next Steps:"
echo "  1. Restart the backend API to use the new connection string"
echo "  2. Test the API: curl http://localhost:5000/api/public/projects"
echo "  3. Open the frontend: http://localhost:5173/projects"
echo ""
echo "Useful Commands:"
echo "  Check status:    docker-compose ps"
echo "  View logs:       docker-compose logs -f postgres"
echo "  Stop database:   docker-compose stop postgres"
echo "  Remove all:      docker-compose down -v"
echo ""
