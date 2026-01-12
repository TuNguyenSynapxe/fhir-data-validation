namespace Pss.FhirProcessor.Playground.Api.Dtos;

public record SampleBundleDto(
    Guid Id,
    string Name,
    string? StructureDefinitionCanonicalUrl,
    string BundleSource,
    DateTimeOffset CreatedAt
);

public record SampleBundleDetailDto(
    Guid Id,
    string Name,
    string? StructureDefinitionCanonicalUrl,
    string BundleSource,
    string BundleJson,
    DateTimeOffset CreatedAt
);

public record CreateSampleBundleRequest(
    string Name,
    string? StructureDefinitionCanonicalUrl,
    string BundleJson
);

public record UpdateSampleBundleRequest(
    string Name,
    string BundleJson
);
