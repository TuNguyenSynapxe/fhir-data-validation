using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// EF Core configuration for ProjectBundle entity.
/// </summary>
public class ProjectBundleConfiguration : IEntityTypeConfiguration<ProjectBundle>
{
    public void Configure(EntityTypeBuilder<ProjectBundle> builder)
    {
        builder.ToTable("project_bundles");

        // Primary key
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        // Properties
        builder.Property(b => b.ProjectId)
            .HasColumnName("project_id")
            .IsRequired();

        builder.Property(b => b.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(b => b.Name)
            .HasColumnName("name")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(b => b.BundleJson)
            .HasColumnName("bundle_json")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(b => b.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Indexes
        builder.HasIndex(b => b.ProjectId)
            .HasDatabaseName("ix_project_bundles_project_id");

        // Relationships configured in ProjectConfiguration
    }
}
