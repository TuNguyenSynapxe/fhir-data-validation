# Frontend Proxy Configuration - Summary

## Changes Made

### Problem
The frontend was making direct API calls to the backend server (e.g., `http://localhost:5000`), which could cause CORS (Cross-Origin Resource Sharing) issues when running in development or production environments.

### Solution
Configured the frontend to use Vite's built-in proxy to route API requests through the same origin, eliminating CORS issues.

---

## Configuration

### Vite Proxy Setup
**File:** `frontend/vite.config.ts`

The proxy was already configured:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

**How it works:**
- Any request to `/api/*` is automatically proxied to `http://localhost:5000/api/*`
- The `changeOrigin: true` option ensures proper headers are sent
- No CORS issues because requests appear to come from the same origin

---

## Updated Files

### 1. ValidationPanel.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/projects/${projectId}/validate`, {
```

**After:**
```typescript
const response = await fetch(`/api/projects/${projectId}/validate`, {
```

---

### 2. PlaygroundPage.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/fhir/samples?version=R4`);
```

**After:**
```typescript
const response = await fetch(`/api/fhir/samples?version=R4`);
```

---

### 3. FhirSampleTreeView.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const sampleResponse = await fetch(`${apiUrl}/api/fhir/samples/R4/${sample.resourceType}/${sample.id}`);
```

**After:**
```typescript
const sampleResponse = await fetch(`/api/fhir/samples/R4/${sample.resourceType}/${sample.id}`);
```

---

### 4. FhirSchemaTreeViewWithCoverage.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/fhir/schema/${resourceType}`);
```

**After:**
```typescript
const response = await fetch(`/api/fhir/schema/${resourceType}`);
```

---

### 5. FhirSchemaTreeView.deprecated.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/fhir/schema/${resourceType}`);
```

**After:**
```typescript
const response = await fetch(`/api/fhir/schema/${resourceType}`);
```

---

### 6. RuleBuilder.tsx
**Before:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/fhir/schema/${resourceType}`);
```

**After:**
```typescript
const response = await fetch(`/api/fhir/schema/${resourceType}`);
```

---

## Benefits

### ✅ CORS Prevention
- All API requests now go through the same origin (proxy)
- No cross-origin issues in development or production

### ✅ Simplified Configuration
- No need for `VITE_API_URL` environment variable
- All API paths are relative (e.g., `/api/...`)

### ✅ Environment Agnostic
- Development: Proxy routes to `localhost:5000`
- Production: Can be configured to route to actual backend server

### ✅ Security
- Backend URL not exposed in frontend code
- Can be changed in one place (vite.config.ts)

---

## Development Workflow

### Running the Application

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend/src/Pss.FhirProcessor.Playground.Api
   dotnet run
   ```
   Backend runs on `http://localhost:5000`

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173` (or similar)

3. **How Requests Flow:**
   ```
   Browser → http://localhost:5173/api/projects
             ↓ (Vite proxy)
   Backend ← http://localhost:5000/api/projects
   ```

---

## Production Deployment

For production, you have two options:

### Option 1: Serve Frontend and Backend from Same Domain
Configure your web server (nginx, Apache, etc.) to proxy `/api/*` requests to the backend server.

**Example nginx config:**
```nginx
location /api/ {
    proxy_pass http://backend-server:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Option 2: Configure CORS on Backend
If serving from different domains, configure CORS in the .NET backend:

**Program.cs:**
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://your-frontend-domain.com")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

app.UseCors("AllowFrontend");
```

---

## Verification

### ✅ Build Status
```bash
cd frontend
npm run build
```
**Result:** ✅ Build successful (no errors)

### ✅ All API Endpoints Updated
- `/api/projects` ✅
- `/api/projects/{id}/validate` ✅
- `/api/fhir/samples` ✅
- `/api/fhir/samples/R4/{resourceType}/{id}` ✅
- `/api/fhir/schema/{resourceType}` ✅
- `/api/fhir/parse-bundle` ✅

### ✅ No Direct Backend URLs
All instances of `import.meta.env.VITE_API_URL` removed from API calls.

---

## Environment Variables (No Longer Needed)

### Before
Required `.env` file:
```env
VITE_API_URL=http://localhost:5000
```

### After
No `VITE_API_URL` needed! Proxy handles everything automatically.

---

## Troubleshooting

### Issue: API requests return 404
**Solution:** Ensure backend is running on `http://localhost:5000`

### Issue: API requests timeout
**Solution:** Check that the proxy target in `vite.config.ts` matches your backend URL

### Issue: CORS errors still appear
**Solution:** Verify all API calls use relative paths (starting with `/api/`)

---

## Summary

✅ **Proxy configured** in `vite.config.ts`  
✅ **All API calls updated** to use relative paths  
✅ **CORS issues eliminated** via proxy  
✅ **Build successful** with no errors  
✅ **Environment variables simplified**  

The frontend now uses the proxy for all API calls, preventing CORS issues in development and simplifying production deployment.
