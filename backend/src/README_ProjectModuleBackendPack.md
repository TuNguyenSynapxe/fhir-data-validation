# Project Module Backend Pack

This pack contains backend components to support project-based storage
using a local SQLite `data.db` file that also works on Azure App Service.

## Included

- Domain entity: `Project`
- EF Core DbContext: `ProjectDbContext`
- Repository: `IProjectRepository`, `ProjectRepository`
- Service: `IProjectService`, `ProjectService`
- Controller: `ProjectsController` with CRUD + `/validate` stub
- DI extension: `AddProjectModule`
- Sample connection string config for SQLite

## How to integrate into your repo

1. Copy folders into your backend solution:

- `Pss.FhirProcessor.Domain/Entities/Project.cs` → `backend/src/Pss.FhirProcessor.Domain/Entities/`
- `Pss.FhirProcessor.Infrastructure/...` → corresponding folders
- `Pss.FhirProcessor.Api/...` → corresponding folders
- `appsettings.Development.sample.json` → merge into your `appsettings.Development.json`

2. Register services in `Program.cs`:

```csharp
using Pss.FhirProcessor.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProjectModule(builder.Configuration, builder.Environment);
// TODO: add validation pipeline services here...

var app = builder.Build();
app.MapControllers();
app.Run();
```

3. Run EF Core migrations:

```bash
dotnet ef migrations add InitialProjectSchema -c ProjectDbContext -p src/Pss.FhirProcessor.Infrastructure -s src/Pss.FhirProcessor.Api
dotnet ef database update -c ProjectDbContext -p src/Pss.FhirProcessor.Infrastructure -s src/Pss.FhirProcessor.Api
```

4. Test API:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{id}`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `POST /api/projects/{id}/validate` (stub, wire to ValidationPipeline later)
