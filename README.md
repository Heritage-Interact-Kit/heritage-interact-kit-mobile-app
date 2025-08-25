# Environment Setup Guide

This guide covers setting up your environment variables and Supabase storage configuration.

## 1. Environment Variables

### For Development (Local Testing)

Create a `.env` file in your project root with:

```env
# Supabase Configuration - Development
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key_here
```

### For EAS Builds (Production/TestFlight)

Environment variables for EAS builds are configured in `eas.json`. Update the placeholder values in:

- `.env.development` - for development builds
- `.env.production` - for production builds (TestFlight/App Store)