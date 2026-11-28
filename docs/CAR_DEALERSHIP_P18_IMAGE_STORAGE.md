# P18: image storage cleanup

S3-backed vehicle image deletion now removes the original object and all four generated WebP variants. The adapter validates that a storage key addresses one object in a single vehicle folder. If normalization or variant generation fails after an upload begins, it attempts to remove the partially written object set before returning the error.

Unit coverage checks the cleanup key set and rejects traversal or out-of-prefix keys. Actual provider uploads, IAM policy, CDN behavior, malware scanning, and backup/retention acceptance still require the configured isolated S3-compatible test account; no credentials or live bucket were used here.
