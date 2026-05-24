# Phase 169 Investigation Notes

## Bug 1: Download Links "not convenient as it used to be"

**Root Cause Analysis:**

The download route (`/api/download/:songId`) at line 173 of `downloadRoute.ts` does:
```
res.redirect(302, taggedUrl);
```

This redirects the browser to an S3 URL. The problem is:
- The anchor element created in `triggerTaggedDownload()` does NOT have a `download` attribute set
- When the browser follows the redirect to S3, it opens the file in a new tab or plays it inline instead of triggering a download
- The S3 URL doesn't have `Content-Disposition: attachment` header, so browsers may just play the audio

**The fix:** The download route already uploads to S3 and redirects. The issue is that S3 serves the file with `Content-Type: audio/mpeg` but without `Content-Disposition: attachment`. We need to either:
1. Set `Content-Disposition: attachment` when uploading to S3 (via storagePut metadata)
2. OR add `download` attribute to the anchor tag (won't work cross-origin)
3. OR change the redirect approach to stream the file directly (already exists as fallback)

Best fix: Use `storagePut` with proper Content-Disposition metadata, OR switch back to direct streaming.

Actually looking more carefully - the redirect to S3 IS the issue. Cross-origin redirects with `download` attribute don't work. The browser navigates to the S3 URL and either plays it inline or shows a raw download prompt without the nice filename.

**Solution:** Change the download route to stream the tagged file directly instead of redirecting to S3. The S3 upload was added to "avoid CDN response-body size limits" but it breaks the download UX. We should stream directly and set proper headers.

## Bug 2: Can't upload music to existing lyrics file

Need to investigate the upload flow for adding audio to an existing lyrics-only work.
