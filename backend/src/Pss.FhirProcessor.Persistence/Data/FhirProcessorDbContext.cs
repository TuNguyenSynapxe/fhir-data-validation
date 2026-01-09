using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Configurations;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Data;

/// <summary>
/// Entity Framework Core DbContext for FHIR Processor V2.
/// </summary>
public class FhirProcessorDbContext : DbContext
{
    public FhirProcessorDbContext(DbContextOptions<FhirProcessorDbContext> options)
        : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectArtifact> ProjectArtifacts => Set<ProjectArtifact>();
    public DbSet<ProjectBundle> ProjectBundles => Set<ProjectBundle>();
    public DbSet<ProjectRule> ProjectRules => Set<ProjectRule>();
    public DbSet<ProjectPublicLink> ProjectPublicLinks => Set<ProjectPublicLink>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply entity configurations
        modelBuilder.ApplyConfiguration(new ProjectConfiguration());
        modelBuilder.ApplyConfiguration(new ProjectArtifactConfiguration());
        modelBuilder.ApplyConfiguration(new ProjectBundleConfiguration());
        modelBuilder.ApplyConfiguration(new ProjectRuleConfiguration());
        modelBuilder.ApplyConfiguration(new ProjectPublicLinkConfiguration());
    }
}
