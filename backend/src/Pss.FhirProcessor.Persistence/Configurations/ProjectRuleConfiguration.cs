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

        builder.Property(r => r.RuleType)
            .HasColumnName("rule_type")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.Provenance)
            .HasColumnName("provenance")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.Name)
            .HasColumnName("name")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(r => r.Description)
            .HasColumnName("description");

        builder.Property(r => r.Expression)
            .HasColumnName("expression");

        builder.Property(r => r.Severity)
            .HasColumnName("severity")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(r => r.ErrorCode)
            .HasColumnName("error_code")
            .HasMaxLength(100);

        builder.Property(r => r.RuleDefinitionJson)
            .HasColumnName("rule_definition_json")
            .HasColumnType("jsonb")
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

        // Relationships configured in ProjectConfiguration
    }
}
