# P3-03 — Private Inspection Photo & Document Evidence

**Status:** Implemented as a stacked feature branch, subject to exact-head CI, review and authenticated staging tests. No live database migration or storage operation has been performed.

## Capability

- Private VehicleInspectionEvidence relation, keyed to one inspection and a known checklist code; unique SHA-256 checksum within each inspection.
- 8 MB per file and at most 60 files per inspection.
- Allowed: JPEG, PNG, WebP and PDF only, with extension/MIME/signature checks. Images are reprocessed into WebP, with orientation normalized and EXIF/GPS removed. Uploaded PDF files are stored privately and served with forced download, not inline.
- Strict random private object keys under inspection-evidence/<inspection-id>/<UUID>.webp|pdf. No public URL is generated. Uses S3_PRIVATE_BUCKET in hosted environments or isolated local filesystem in development.
- Staff-upload endpoint: POST /api/admin/inspections/[id]/evidence, with inspection ownership/manager check and current optimistic version.
- GET /api/admin/inspections/[id]/evidence lists only allowed metadata. GET /api/admin/inspections/[id]/evidence/[evidenceId] requires authorization and uses no-store forced attachment download.
- Evidence uploads become locked after the inspection is submitted for review. Database writes are transactional with version CAS and audit evidence. Failed DB writes attempt to remove the newly uploaded object.
- Inspector UI allows selecting a checklist item and uploading a file; approved/rejected report shows a manifest without exposing object keys.
- Unit tests cover image normalization and EXIF omission, PDF signatures, spoofed MIME types and path-traversal denial.

## Security and operational limitations

- Files may themselves contain personal data. They must remain in a private restricted bucket with environment-specific IAM, encryption and retention; do not copy them into public vehicle images or email them.
- Automatic object-store backup/restore and retention/erasure scheduling are not yet accepted. There is no general UI deletion in this slice, to avoid silently weakening the append-only evidence trail. A future formally approved removal process must address privacy requests and incident remediation.
- Direct browser PDF attachment does not execute on the server; uploads are not a substitute for malware scanning. Antivirus/sandbox scanning for PDFs is a further release requirement before real customer uploads.
- No external notifications, commercial activation, staging migrations or client-demo deployment.
