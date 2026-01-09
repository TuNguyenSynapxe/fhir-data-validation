using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pss.FhirProcessor.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase7_1_ProjectImportDataModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    policy_mode = table.Column<string>(type: "text", nullable: false),
                    is_public_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    public_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "project_artifacts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    artifact_type = table.Column<string>(type: "text", nullable: false),
                    file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    resource_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    canonical_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    resource_json = table.Column<string>(type: "jsonb", nullable: false),
                    hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_artifacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_artifacts_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_bundles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    bundle_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_bundles", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_bundles_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_public_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    public_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_public_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_public_links_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_rules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope = table.Column<string>(type: "text", nullable: false),
                    bundle_id = table.Column<Guid>(type: "uuid", nullable: true),
                    rule_type = table.Column<string>(type: "text", nullable: false),
                    provenance = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    definition_json = table.Column<string>(type: "jsonb", nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_rules_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_project_artifacts_project_id",
                table: "project_artifacts",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_artifacts_project_id_canonical_url",
                table: "project_artifacts",
                columns: new[] { "project_id", "canonical_url" },
                unique: true,
                filter: "canonical_url IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_project_bundles_project_id",
                table: "project_bundles",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_public_links_project_id",
                table: "project_public_links",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_public_links_public_id",
                table: "project_public_links",
                column: "public_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_project_rules_bundle_id",
                table: "project_rules",
                column: "bundle_id",
                filter: "bundle_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_project_rules_project_id",
                table: "project_rules",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_projects_public_id",
                table: "projects",
                column: "public_id",
                unique: true,
                filter: "public_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_artifacts");

            migrationBuilder.DropTable(
                name: "project_bundles");

            migrationBuilder.DropTable(
                name: "project_public_links");

            migrationBuilder.DropTable(
                name: "project_rules");

            migrationBuilder.DropTable(
                name: "projects");
        }
    }
}
