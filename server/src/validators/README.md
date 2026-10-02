# validators/

Request-*shape* validation (Zod), kept separate from business validation
— "is this a syntactically plausible URL" is a schema rule here;
"is this actually a YouTube URL we recognize" is `utils/youtubeUrl.ts`,
called from the service, because a malformed-but-technically-a-URL string
still needs the service's specific 400 message, not a generic one.
