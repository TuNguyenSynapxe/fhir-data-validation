using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// EF Core configuration for ProjectArtifact entity.
/// </summary>
public class ProjectArtifactConfiguration : IEntityTypeConfiguration<ProjectArtifact>
{
    public void Configure(EntityTypeBuilder<ProjectArtifact> builder)
    {
        builder.ToTable("project_artifacts");

        // Primary key
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        // Properties
        builder.Property(a => a.ProjectId)
            .HasColumnName("project_id")
            .IsRequired();

        builder.Property(a => a.ArtifactType)
            .HasColumnName("artifact_type")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(a => a.FilePath)
            .HasColumnName("file_path")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(a => a.FileName)
            .HasColumnName("file_name")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(a => a.ResourceType)
            .HasColumnName("resource_type")
            .HasMaxLength(100);

        builder.Property(a => a.CanonicalUrl)
            .HasColumnName("canonical_url")
            .HasMaxLength(500);

        builder.Property(a => a.ResourceJson)
            .HasColumnName("resource_json")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(a => a.Hash)
            .HasColumnName("hash")
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(a => a.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Indexes
        builder.HasIndex(a => a.ProjectId)
            .HasDatabaseName("ix_project_artifacts_project_id");

        builder.HasIndex(a => new { a.ProjectId, a.CanonicalUrl })
            .IsUnique()
            .HasDatabaseName("ix_project_artifacts_project_id_canonical_url")
            .HasFilter("canonical_url IS NOT NULL");

        // Relationships configured in ProjectConfiguration
    }
}
