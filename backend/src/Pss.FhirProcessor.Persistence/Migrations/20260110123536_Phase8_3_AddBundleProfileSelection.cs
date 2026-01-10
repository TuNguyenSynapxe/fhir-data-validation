using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pss.FhirProcessor.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase8_3_AddBundleProfileSelection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_bundle_profile_selections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_bundle_id = table.Column<Guid>(type: "uuid", nullable: false),
                    structure_definition_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_bundle_profile_selections", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_bundle_profile_selections_project_artifacts_structu~",
                        column: x => x.structure_definition_id,
                        principalTable: "project_artifacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_project_bundle_profile_selections_project_bundles_project_b~",
                        column: x => x.project_bundle_id,
                        principalTable: "project_bundles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_project_bundle_profile_selections_project_bundle_id",
                table: "project_bundle_profile_selections",
                column: "project_bundle_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_bundle_profile_selections_structure_definition_id",
                table: "project_bundle_profile_selections",
                column: "structure_definition_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_bundle_profile_selections");
        }
    }
}
