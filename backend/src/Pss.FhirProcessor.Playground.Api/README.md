# Pss.FhirProcessor.Playground.Api

Backend API for the FHIR Processor Playground - provides project management and validation endpoints.

## Architecture

This API follows a clean architecture pattern:

```
Pss.FhirProcessor.Playground.Api/
├── Controllers/          # API endpoints
│   ├── PlaygroundController.cs     # Ad-hoc validation
│   └── ProjectsController.cs       # Project CRUD & validation
├── Services/            # Business logic
│   ├── IProjectService.cs
│   └── ProjectService.cs
├── Storage/             # Data persistence
│   ├── IProjectRepository.cs
│   └── ProjectRepository.cs        # File-based storage
└── Models/              # DTOs
    ├── Project.cs
    ├── CreateProjectRequest.cs
    ├── SaveRuleRequest.cs
    └── ... (other request/response models)
```

## API Endpoints

### Project Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/{id}` | Get a specific project |
| DELETE | `/api/projects/{id}` | Delete a project |

### Project Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/{id}/rules` | Save rules JSON |
| POST | `/api/projects/{id}/codemaster` | Save CodeMaster JSON |
| POST | `/api/projects/{id}/bundle` | Save sample bundle JSON |
| GET | `/api/projects/{id}/export` | Export rule package |

### Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/{id}/validate` | Validate project bundle with rules |
| POST | `/api/playground/validate` | Ad-hoc validation without project |

## Usage Examples

### Create a Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maternal Health Validation",
    "description": "Rules for maternal health screening",
    "fhirVersion": "R4"
  }'
```

### Save Rules

```bash
curl -X POST http://localhost:5000/api/projects/{id}/rules \
  -H "Content-Type: application/json" \
  -d '{
    "rulesJson": "{\"version\":\"1.0\",\"rules\":[...]}"
  }'
```

### Validate Project

```bash
curl -X POST http://localhost:5000/api/projects/{id}/validate \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{...optional bundle override...}"
  }'
```

### Export Rule Package

```bash
curl http://localhost:5000/api/projects/{id}/export
```

Returns:
```json
{
  "projectId": "...",
  "projectName": "...",
  "fhirVersion": "R4",
  "exportedAt": "2025-12-11T...",
  "rules": "{...}",
  "codeMaster": "{...}"
}
```

## Storage

Projects are stored as JSON files in the `ProjectStorage/` directory:
- Lightweight file-based storage for POC/development
- Each project is a separate `.json` file named by its GUID
- Production deployments can swap `IProjectRepository` with SQL/NoSQL implementation

## Dependencies

- **Pss.FhirProcessor.Engine** - Pure validation engine (referenced)
- **ASP.NET Core 8.0** - Web framework
- **System.Text.Json** - JSON serialization

## Running the API

```bash
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet run
```

API will be available at `http://localhost:5000` (or configured port).

## Development

The API is designed to be:
- **Stateless** - No session dependencies
- **Lightweight** - File-based storage for simplicity
- **Extensible** - Repository pattern allows easy database integration
- **Engine-agnostic** - Uses Engine via interface, no tight coupling
