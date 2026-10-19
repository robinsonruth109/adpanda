# Private Railway Bucket abstraction

This library creates random, owner-scoped storage keys and short-lived S3-compatible presigned upload/read URLs. Railway Buckets are private, so do **not** store long-lived presigned read URLs as media addresses. Store the object key + metadata in MySQL. Issue fresh short-lived read URLs from a permission-checked server endpoint, or proxy/cache approved public food images.

**There is intentionally no public upload API yet.** Before adding the route, implement authentication, role-based permission checks, kitchen ownership, object quotas, post-upload HEAD/content verification and file-type validation. Presigned PUT alone does not prove that the file is a valid safe image. In particular, NID/document files must remain accessible only to authorized staff. Reject unsupported types; strip EXIF for public media during processing.

Note on browsers: direct browser PUT to presigned S3 URLs also requires compatible CORS configuration. For unsupported bucket CORS scenarios, upload through an authenticated server-side streaming endpoint instead, with appropriate file-size limits. Uploaded objects must not be considered published until verified.

Do not publish credentials or use NEXT_PUBLIC_ prefixes for secret storage variables.
