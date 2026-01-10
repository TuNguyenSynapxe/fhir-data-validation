using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// Phase 8.3: EF Core configuration for ProjectBundleProfileSelection.
/// </summary>
public sealed class ProjectBundleProfileSelectionConfiguration : IEntityTypeConfiguration<ProjectBundleProfileSelection>
{
    public void Configure(EntityTypeBuilder<ProjectBundleProfileSelection> builder)
    {
        builder.ToTable("project_bundle_profile_selections");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .IsRequired();

        builder.Property(x => x.ProjectBundleId)
            .HasColumnName("project_bundle_id")
            .IsRequired();

        builder.Property(x => x.StructureDefinitionId)
            .HasColumnName("structure_definition_id");

        builder.Property(x => x.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Foreign key to ProjectBundle
        builder.HasOne(x => x.Bundle)
            .WithMany()
            .HasForeignKey(x => x.ProjectBundleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Foreign key to ProjectArtifact (StructureDefinition)
        builder.HasOne(x => x.StructureDefinition)
            .WithMany()
            .HasForeignKey(x => x.StructureDefinitionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Index for fast lookups by bundle
        builder.HasIndex(x => x.ProjectBundleId)
            .IsUnique(); // One selection per bundle

        // Index for querying by SD
        builder.HasIndex(x => x.StructureDefinitionId);
    }
}
