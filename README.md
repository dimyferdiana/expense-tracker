# Expense Tracker with Supabase Authentication

A comprehensive financial management application that helps you track expenses, manage wallets, and create budgets. Now with cloud storage and user authentication powered by Supabase.

## Features

- **User Authentication**: Secure login, signup, and password reset
- **Expense Tracking**: Add, edit, and delete expenses
- **Multiple Wallets**: Manage different payment methods and accounts
- **Wallet Transfers**: Transfer funds between wallets
- **Categories & Tags**: Organize your transactions
- **Budget Management**: Set and track budgets by category
- **Recurring Transactions**: Schedule regular expenses
- **Data Visualization**: Charts and summaries
- **Cloud Sync**: Data stored securely in the cloud
- **Data Migration**: Import from local storage to cloud
- **Local-first architecture**: All data is stored locally in IndexedDB for instant access and offline capability
- **Comprehensive sync system**: Sync between local and cloud storage
- **Export/Import backup functionality**: Export and import data as JSON files
- **User authentication and multi-user support**: Multiple users can access the application
- **Responsive design for mobile and desktop**: Application is designed to work on both mobile and desktop devices

## Sync Functionality

### Overview
The app implements a **local-first architecture** where:
- All data is stored locally in IndexedDB for instant access and offline capability
- Supabase serves as cloud backup and sync between devices
- Users can work offline and sync when connected

### Sync Features

#### 1. **Full Sync (Bidirectional)**
```javascript
// Syncs both ways - uploads new local data, downloads new cloud data
// Automatically resolves conflicts (server wins by default)
await syncManager.fullSync('bidirectional');
```

#### 2. **Upload to Cloud**
```javascript
// Pushes all local data to Supabase
await syncManager.fullSync('upload');
```

#### 3. **Download from Cloud**
```javascript
// Replaces local data with cloud data
await syncManager.fullSync('download');
```

#### 4. **Export Backup**
```javascript
// Exports all local data as JSON file
const data = await syncManager.exportLocalData();
```

#### 5. **Import Backup**
```javascript
// Imports JSON backup and replaces all local data
await syncManager.importLocalData(jsonData);
```

### Using Sync in Components

#### Automatic Change Tracking
```javascript
import { markLocalChange } from '../utils/syncManager';

// After any local database operation:
await localExpenseDB.add(expense);
markLocalChange(); // Marks that local data has changed
```

#### Using the Sync Hook
```javascript
import { useSyncManager } from '../utils/syncManager';

function MyComponent() {
  const { syncManager, syncStatus, markLocalChange, isInitialized } = useSyncManager();
  
  const handleAddExpense = async (expense) => {
    await localExpenseDB.add(expense);
    markLocalChange(); // Track the change
  };
  
  return (
    <div>
      <p>Sync Status: {syncStatus?.hasLocalChanges ? 'Pending' : 'Up to date'}</p>
    </div>
  );
}
```

### Accessing Sync Features

The sync functionality is available through the user dropdown in the top navigation:

1. **Click the user avatar** in the top-right corner
2. **Look for the sync icon** (🔄, ⏳, ✅, 📴, or ⚠️) 
3. **Click the sync status** to open the sync menu
4. **Choose your sync option:**
   - **Full Sync**: Bidirectional sync with conflict resolution
   - **Upload to Cloud**: Push local changes to cloud
   - **Download from Cloud**: Pull cloud data to local
   - **Export Backup**: Download JSON backup file
   - **Import Backup**: Upload and restore from JSON backup

### Sync Status Indicators

| Icon | Status | Description |
|------|--------|-------------|
| ✅ | Ready | Everything is synced |
| ⏳ | Pending sync | Local changes need to be synced |
| 🔄 | Syncing... | Sync operation in progress |
| 📴 | Offline | No internet connection |
| ⚠️ | Error | Sync errors occurred |

### Architecture Details

#### Data Flow
```
User Interaction
    ↓
Local Database (IndexedDB) ← markLocalChange()
    ↓
Sync Manager
    ↓
Cloud Database (Supabase)
```

#### Field Mapping
The sync system handles field mapping between local and cloud schemas:

**Local → Cloud:**
- `walletId` → `wallet_id`
- `isIncome` → `is_income`
- `photoUrl` → `photo_url`
- `fromWallet` → `from_wallet_id`
- `toWallet` → `to_wallet_id`

#### Conflict Resolution
- **Strategy**: Server wins (remote data takes precedence)
- **Detection**: Content-based comparison (excluding timestamps)
- **Logging**: All conflicts are logged for review

#### Error Handling
- Automatic retry with exponential backoff
- Graceful degradation to offline mode
- Detailed error logging and user feedback

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure Supabase:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Set up the database:
   - Go to your Supabase SQL Editor
   - Run the SQL script in `MIGRATION-GUIDE.md`
   - This will create all necessary tables and security policies

5. Start the application:
   ```
   npm start
   ```

## Database Structure

The application uses the following tables in Supabase:

- `expenses`: Stores all transaction records
- `categories`: Predefined and user-created categories
- `tags`: Transaction tags for filtering
- `wallets`: Different payment methods and accounts
- `transfers`: Records of funds moving between wallets
- `budgets`: Budget settings by category

All tables are secured with Row Level Security (RLS) to ensure users can only access their own data.

## Authentication Flow

1. User registers or logs in via the authentication pages
2. Upon successful authentication, users can optionally migrate existing local data
3. All database operations include the user's ID to maintain data isolation
4. Protected routes ensure only authenticated users can access the application

## Development

### Folder Structure

- `/src/components`: UI components
- `/src/contexts`: React context providers
- `/src/utils`: Utility functions and database operations
- `/src/pages`: Page components

### Key Technologies

- React
- React Router
- Supabase (Authentication & Database)
- TailwindCSS
- Chart.js

## Migration from IndexedDB

This version supports migrating data from the local IndexedDB to Supabase. The migration process:

1. Checks for existing data in IndexedDB
2. Offers to import data to Supabase when a user logs in
3. Associates all data with the authenticated user
4. Provides the option to clear local storage after successful migration

See `MIGRATION-GUIDE.md` for detailed instructions.

## License

MIT

## Acknowledgments

- Supabase for providing authentication and database services
- The React community for excellent libraries and tools