using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pss.FhirProcessor.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase10_0_SD_Promotion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPromoted",
                table: "project_artifacts",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StructureDefinitionRole",
                table: "project_artifacts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPromoted",
                table: "project_artifacts");

            migrationBuilder.DropColumn(
                name: "StructureDefinitionRole",
                table: "project_artifacts");
        }
    }
}
