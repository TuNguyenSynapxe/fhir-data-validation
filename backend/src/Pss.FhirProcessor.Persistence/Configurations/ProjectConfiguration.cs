using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// EF Core configuration for Project entity.
/// </summary>
public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects");

        // Primary key
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        // Properties
        builder.Property(p => p.Slug)
            .HasColumnName("slug")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(p => p.Name)
            .HasColumnName("name")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(p => p.Description)
            .HasColumnName("description");

        builder.Property(p => p.PolicyMode)
            .HasColumnName("policy_mode")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(p => p.Status)
            .HasColumnName("status")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.Property(p => p.PublishedAt)
            .HasColumnName("published_at");

        // Indexes
        builder.HasIndex(p => p.Slug)
            .IsUnique()
            .HasDatabaseName("ix_projects_slug");

        builder.HasIndex(p => p.Status)
            .HasDatabaseName("ix_projects_status");

        builder.HasIndex(p => p.PublishedAt)
            .HasDatabaseName("ix_projects_published_at");

        // Relationships
        builder.HasMany(p => p.Artifacts)
            .WithOne(a => a.Project)
            .HasForeignKey(a => a.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Bundles)
            .WithOne(b => b.Project)
            .HasForeignKey(b => b.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Rules)
            .WithOne(r => r.Project)
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.PublicLinks)
            .WithOne(l => l.Project)
            .HasForeignKey(l => l.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
