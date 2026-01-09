using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// EF Core configuration for ProjectPublicLink entity.
/// </summary>
public class ProjectPublicLinkConfiguration : IEntityTypeConfiguration<ProjectPublicLink>
{
    public void Configure(EntityTypeBuilder<ProjectPublicLink> builder)
    {
        builder.ToTable("project_public_links");

        // Primary key
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        // Properties
        builder.Property(l => l.ProjectId)
            .HasColumnName("project_id")
            .IsRequired();

        builder.Property(l => l.PublicId)
            .HasColumnName("public_id")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(l => l.Enabled)
            .HasColumnName("enabled")
            .IsRequired();

        builder.Property(l => l.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Indexes
        builder.HasIndex(l => l.PublicId)
            .IsUnique()
            .HasDatabaseName("ix_project_public_links_public_id");

        // Relationships configured in ProjectConfiguration
    }
}
