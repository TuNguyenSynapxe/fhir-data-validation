#!/bin/bash

# Fix FhirPathRuleEngineTests.cs - add logger after modelResolver
sed -i '' 's/var engine = new FhirPathRuleEngine(modelResolver);/var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;\n        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);/g' tests/Pss.FhirProcessor.Tests/FhirPathRuleEngineTests.cs

echo "Test logging fixes complete!"
