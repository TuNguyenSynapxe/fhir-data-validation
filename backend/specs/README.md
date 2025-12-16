# FHIR StructureDefinitions Setup

## Problem
The `backend/specs/fhir/r4/StructureDefinitions/` directory contains 657 FHIR spec files (20MB total) which exceeds GitHub's HTTP push limit.

## Solution Options

### Option 1: Git LFS (Large File Storage) ⭐ RECOMMENDED

**Setup:**
```bash
# Install Git LFS (one-time)
brew install git-lfs  # macOS
# or: sudo apt-get install git-lfs  # Linux
# or: choco install git-lfs  # Windows

# Initialize Git LFS in repo
cd /path/to/fhir_processor_v2
git lfs install

# Track FHIR spec files
git lfs track "backend/specs/fhir/**/*.json"

# Migrate existing files to LFS
git lfs migrate import --include="backend/specs/fhir/**/*.json"

# Commit and push
git add .gitattributes
git commit -m "Configure Git LFS for FHIR specs"
git push
```

**Benefits:**
- ✅ Files stored in GitHub (automatic in CI/CD)
- ✅ Git clones work normally
- ✅ No manual download step
- ✅ Version controlled
- ✅ Free for public repos (1GB storage, 1GB bandwidth/month for private repos)

**CI/CD Impact:**
```yaml
# GitHub Actions automatically supports Git LFS
- name: Checkout code
  uses: actions/checkout@v4
  with:
    lfs: true  # This downloads LFS files
```

---

### Option 2: Download Specs On-Demand

**Setup:**
```bash
# Add to .gitignore
backend/specs/fhir/r4/StructureDefinitions/

# Create download script
touch backend/scripts/download-fhir-specs.sh
chmod +x backend/scripts/download-fhir-specs.sh
```

**Script content (backend/scripts/download-fhir-specs.sh):**
```bash
#!/bin/bash
set -e

SPECS_DIR="backend/specs/fhir/r4/StructureDefinitions"
FHIR_VERSION="4.0.1"

if [ -d "$SPECS_DIR" ]; then
  echo "FHIR specs already exist"
  exit 0
fi

echo "Downloading FHIR R4 StructureDefinitions..."
mkdir -p "$SPECS_DIR"

# Download from official FHIR registry
curl -L "https://hl7.org/fhir/R4/definitions.json.zip" -o /tmp/fhir-specs.zip
unzip -j /tmp/fhir-specs.zip "StructureDefinition-*.json" -d "$SPECS_DIR"
rm /tmp/fhir-specs.zip

echo "Downloaded $(ls -1 $SPECS_DIR | wc -l) StructureDefinition files"
```

**CI/CD Integration:**
```yaml
# .github/workflows/ci.yml
- name: Download FHIR Specs
  run: ./backend/scripts/download-fhir-specs.sh

- name: Build Backend
  run: dotnet build
```

**Benefits:**
- ✅ Small repo size
- ✅ Always get latest specs
- ❌ Extra download step (slower CI/CD)
- ❌ Network dependency
- ❌ Specs not version controlled

---

### Option 3: Split Commits (Quick Fix)

Unstage specs and commit separately:

```bash
# Unstage current commit
git reset --soft HEAD~1

# Stage everything except specs
git add .
git restore --staged backend/specs/

# Commit without specs
git commit -m "refactor the panels"
git push

# Then commit specs separately in smaller batches
cd backend/specs/fhir/r4/StructureDefinitions
git add StructureDefinition-[A-D]*.json
git commit -m "Add FHIR specs (A-D)"
git push

git add StructureDefinition-[E-M]*.json
git commit -m "Add FHIR specs (E-M)"
git push

# etc...
```

**Benefits:**
- ✅ Works around push limit
- ❌ Tedious manual process
- ❌ Still stores 20MB in repo

---

## Recommendation

**Use Option 1 (Git LFS)** because:
1. CI/CD works automatically
2. No manual download steps
3. Files are version controlled
4. GitHub Actions supports it natively
5. One-time setup

**Current Status:**
- `.gitattributes` created with LFS configuration
- Ready to migrate files to LFS

**Next Steps:**
```bash
git lfs install
git lfs migrate import --include="backend/specs/fhir/**/*.json" --include-ref=refs/heads/main
git push --force origin main
```
