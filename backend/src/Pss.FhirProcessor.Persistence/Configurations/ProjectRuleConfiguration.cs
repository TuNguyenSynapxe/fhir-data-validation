using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Configurations;

/// <summary>
/// EF Core configuration for ProjectRule entity.
/// </summary>
public class ProjectRuleConfiguration : IEntityTypeConfiguration<ProjectRule>
{
    public void Configure(EntityTypeBuilder<ProjectRule> builder)
    {
        builder.ToTable("project_rules");

        // Primary key
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        // Properties
        builder.Property(r => r.ProjectId)
            .HasColumnName("project_id")
            .IsRequired();

        builder.Property(r => r.Scope)
            .HasColumnName("scope")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.BundleId)
            .HasColumnName("bundle_id");

        builder.Property(r => r.RuleType)
            .HasColumnName("rule_type")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.Provenance)
            .HasColumnName("provenance")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.Title)
            .HasColumnName("title")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(r => r.Description)
            .HasColumnName("description");

        builder.Property(r => r.DefinitionJson)
            .HasColumnName("definition_json")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(r => r.IsEnabled)
            .HasColumnName("is_enabled")
            .IsRequired();

        builder.Property(r => r.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(r => r.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        // Indexes
        builder.HasIndex(r => r.ProjectId)
            .HasDatabaseName("ix_project_rules_project_id");

        builder.HasIndex(r => r.BundleId)
            .HasDatabaseName("ix_project_rules_bundle_id")
            .HasFilter("bundle_id IS NOT NULL");

        // Relationships configured in ProjectConfiguration
    }
}
