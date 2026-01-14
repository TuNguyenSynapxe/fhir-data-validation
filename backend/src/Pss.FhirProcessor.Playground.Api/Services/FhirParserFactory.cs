using Hl7.Fhir.Model;
using System.Reflection;

namespace Pss.FhirProcessor.Playground.Api.Services;

/// <summary>
/// Factory to create FHIR parsers, resolving R4/R5 ambiguity.
/// MVP uses R5 (from Engine), R4 support is future.
/// </summary>
internal static class FhirParserFactory
{
    /// <summary>
    /// Parse JSON to Bundle (uses whichever FhirJsonParser is available).
    /// </summary>
    public static Bundle ParseBundle(string json)
    {
        // Use reflection to bypass compile-time ambiguity
        var assemblyName = typeof(Bundle).Assembly.GetName().Name;
        var parserTypeName = "Hl7.Fhir.Serialization.FhirJsonParser";
        var assembly = AppDomain.CurrentDomain.GetAssemblies()
            .FirstOrDefault(a => a.GetName().Name == assemblyName);
        var parserType = assembly?.GetType(parserTypeName);
        
        var parser = Activator.CreateInstance(parserType!);
        var parseMethod = parserType!.GetMethod("Parse", new[] { typeof(string) });
        return (Bundle)parseMethod!.Invoke(parser, new object[] { json })!;
    }
}
