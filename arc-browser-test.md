# Arc Browser Test Guide

## Quick Test Steps

### 1. Open Arc Browser Console
- Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
- Go to Console tab

### 2. Check Current Storage Status
```javascript
StorageDebugger.quickDebug()
```

### 3. Perform Arc Browser Cleanup
```javascript
StorageDebugger.arcBrowserCleanup()
```

### 4. Test Delete Functionality
- Try deleting an expense
- Should work without quota errors

### 5. Use UI Cleanup Button
- Go to Settings page
- Look for "🌐 Arc Cleanup" button
- Click it to perform cleanup

## Expected Results

✅ **Before Cleanup:**
- May see quota errors in console
- Delete operations may fail
- Storage usage high

✅ **After Cleanup:**
- No quota errors
- Delete operations work
- Storage usage reduced significantly
- May get prompt to reload page

## Troubleshooting

If issues persist:

1. **Manual Nuclear Cleanup:**
```javascript
StorageDebugger.nuclearCleanup()
```

2. **Force Reload:**
```javascript
window.location.reload()
```

3. **Clear All Site Data:**
- Arc → Settings → Privacy & Security → Site Settings
- Find your localhost site
- Clear all data

## Arc Browser Specific Features

- **Auto-Detection**: App automatically detects Arc browser
- **Aggressive Cleanup**: Removes more data than other browsers
- **Smart Reload**: Suggests page reload after significant cleanup
- **UI Integration**: Cleanup button appears in Settings

## Console Commands Reference

```javascript
// Quick status check
StorageDebugger.quickDebug()

// Arc-specific cleanup
StorageDebugger.arcBrowserCleanup()

// Nuclear option (clears almost everything)
StorageDebugger.nuclearCleanup()

// Check detailed status
StorageDebugger.checkStatus()

// Emergency cleanup
StorageDebugger.emergencyCleanup()
```

## Success Indicators

- ✅ No "QUOTA_BYTES quota exceeded" errors
- ✅ Delete button works on expenses
- ✅ Storage usage under 1MB
- ✅ App responsive and fast
- ✅ No console errors during operations 