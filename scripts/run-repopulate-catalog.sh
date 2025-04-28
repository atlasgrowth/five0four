
#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Run the repopulation script
node scripts/repopulateSquareCatalog.js

# When done, pull the catalog and seed the database
echo "Now pulling updated catalog from Square..."
node scripts/pullCatalog.js

echo "Now seeding menu items from catalog data..."
tsx scripts/seedMenuFromJson.ts

echo "Done! Verify your menu items:"
npx tsx -e "import { db } from './server/db'; db.query.menu_items.findMany().then(items => console.log(items.length, 'items found'));"
