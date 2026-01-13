namespace Pss.FhirProcessor.Playground.Api.Dtos;

public record SampleBundleDto(
    Guid Id,
    string Name,
    string? StructureDefinitionCanonicalUrl,
    string? AutoTaggedSdCanonicalUrl,
    string? ManuallyTaggedSdCanonicalUrl,
    string TaggingMode,
    string BundleSource,
    DateTimeOffset CreatedAt
);

public record SampleBundleDetailDto(
    Guid Id,
    string Name,
    string? StructureDefinitionCanonicalUrl,
    string? AutoTaggedSdCanonicalUrl,
    string? ManuallyTaggedSdCanonicalUrl,
    string TaggingMode,
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

public record ManualTagRequest(
    string SdCanonicalUrl
);
