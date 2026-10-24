# Railway deployment — AdPanda

## Create three services in one Railway project
1. Add an application service from `robinsonruth109/adpanda` and set GitHub branch to `feature/platform-foundation` until the PR is reviewed and merged.
2. Add a Railway **MySQL** service. Add the application `DATABASE_URL` as a reference to MySQL's `MYSQL_URL` (or a compatible constructed connection string).
3. Add a Railway **Bucket** service in your chosen region. Buckets are private and expose S3-compatible credentials.

## Application environment variables
```dotenv
DATABASE_URL=${{MySQL.MYSQL_URL}}
BUCKET_NAME=${{Bucket.BUCKET}}
BUCKET_ENDPOINT=${{Bucket.ENDPOINT}}
BUCKET_REGION=${{Bucket.REGION}}
BUCKET_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
BUCKET_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
BUCKET_FORCE_PATH_STYLE=false
SESSION_SECRET=<generate-a-long-random-value>
```
Use Railway UI variable references for your actual MySQL and Bucket service names; do not paste credentials into GitHub. Refer to Railway Bucket Credentials tab to see whether a legacy bucket requires path-style URLs; set `BUCKET_FORCE_PATH_STYLE=true` only if instructed there.

## Deploy
- `railway.json` defines Railpack build, start command and `/api/health` health check.
- Current foundation does not need live DB queries to serve its demo pages.
- Before activating real DB features: generate and review an initial Prisma migration on a **development** MySQL DB and commit it; then configure Railway **pre-deploy command** `npx prisma migrate deploy`.
- In Railway app service > Settings > Networking, generate a public domain. Verify `/api/health`.
- Railway Bucket is private: objects are not accessible as direct permanent public URLs. Read `src/lib/storage/README.md` for safe media delivery.
- Important: A successful foundation deployment does not mean customer ordering, merchant accounts, live maps or COD cash settlement are live.

## Deployment check
```bash
npm install
npm run db:generate
npm run build
```
Do not run `prisma migrate dev` against production.
