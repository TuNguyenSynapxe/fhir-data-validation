import { useEffect, useState } from 'react';
import styles from './ValidationCapabilitiesView.module.css';

export function ValidationCapabilitiesView() {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch the markdown file
    // For now, we provide the content inline as per the specification
    const markdownContent = `# What We Validate

This document explains the validation capabilities and boundaries of the FHIR Processor V2 validation engine.

## What We CAN Validate

### 1. Structure Definition Validation
- Cardinality constraints (min/max occurrences)
- Data type conformance
- Required fields presence
- Profile conformance

### 2. FHIRPath Business Rules
- Custom validation rules defined in rules.json
- Conditional logic
- Cross-field validation
- Reference integrity

### 3. Reference Validation
- Internal bundle references
- Reference resolution
- Resource type matching

### 4. Syntax Validation
- JSON structure
- FHIR resource format
- Encoding validation

## What We CANNOT Validate (Ambiguity Sources)

### Terminology Validation Limitations

**⚠️ CRITICAL: Terminology validation has known ambiguity sources**

We CANNOT deterministically validate:
- ValueSet expansion requiring external terminology servers
- Filter-based ValueSet expansion
- CodeSystem not available offline
- Version-specific terminology bindings

When we encounter these limitations:
- **Strict mode:** We report ERROR (fail-safe)
- **Permissive mode:** We report WARNING (fail-open)
- **We ALWAYS disclose the ambiguity**

### External References
We cannot validate references to resources outside the bundle.

### Runtime Data
We cannot validate data that depends on external systems or time-sensitive conditions.

## Policy Modes

### Strict Mode (Default)
- Ambiguity = ERROR
- Fail-safe approach
- Recommended for production

### Permissive Mode
- Ambiguity = WARNING
- Fail-open approach
- Use only when ambiguity is acceptable

## Transparency Guarantee

**We NEVER hide ambiguity.**

If we cannot validate something deterministically:
1. We tell you explicitly
2. We explain why
3. We show the violation reason
4. We apply the policy mode consistently

## Important Notes

- Validation passing ≠ Data is correct
- No issues detected ≠ Data is valid
- Warnings are not "safe to ignore"
- Ambiguity must be reviewed by humans

---

**Questions?** Review the validation results carefully and consult your FHIR implementation guide.
`;

    setContent(markdownContent);
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Unable to Load Documentation</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Validation Capabilities</h1>
        <p className={styles.subtitle}>
          Understanding what we validate and the boundaries of validation
        </p>
      </div>

      <div className={styles.content}>
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}

// Simple markdown renderer (inline to avoid external dependencies)
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`}>
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`}>
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={index}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index}>{line.slice(4)}</h3>);
    } else if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else if (line.startsWith('**') || line.startsWith('⚠️')) {
      flushList();
      elements.push(
        <p key={index} className={styles.warning} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      );
    } else if (line.startsWith('---')) {
      flushList();
      elements.push(<hr key={index} />);
    } else {
      flushList();
      elements.push(<p key={index} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
    }
  });

  flushList();

  return <>{elements}</>;
}
