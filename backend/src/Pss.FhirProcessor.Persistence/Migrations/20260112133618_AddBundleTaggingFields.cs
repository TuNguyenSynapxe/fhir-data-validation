using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pss.FhirProcessor.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBundleTaggingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AutoTaggedSdCanonicalUrl",
                table: "project_bundles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManuallyTaggedSdCanonicalUrl",
                table: "project_bundles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TaggingMode",
                table: "project_bundles",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoTaggedSdCanonicalUrl",
                table: "project_bundles");

            migrationBuilder.DropColumn(
                name: "ManuallyTaggedSdCanonicalUrl",
                table: "project_bundles");

            migrationBuilder.DropColumn(
                name: "TaggingMode",
                table: "project_bundles");
        }
    }
}
