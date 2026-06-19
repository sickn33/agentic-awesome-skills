---
name: expo-deployment
description: "Deploy Expo apps to production"
risk: safe
source: "https://github.com/expo/skills/tree/main/plugins/expo-deployment"
date_added: "2026-02-27"
---

# Expo Deployment

## Overview

Deploy Expo applications to production environments, including app stores and over-the-air updates.

## When to Use This Skill

Use this skill when you need to deploy Expo apps to production.

Use this skill when:
- Deploying Expo apps to production
- Publishing to app stores (iOS App Store, Google Play)
- Setting up over-the-air (OTA) updates
- Configuring production build settings
- Managing release channels and versions

## Instructions

This skill provides guidance for deploying Expo apps:

1. **Build Configuration**: Set up production build settings
2. **App Store Submission**: Prepare and submit to app stores
3. **OTA Updates**: Configure over-the-air update channels
4. **Release Management**: Manage versions and release channels
5. **Production Optimization**: Optimize apps for production

## Deployment Workflow

### Pre-Deployment

1. Ensure all tests pass
2. Update version numbers
3. Configure production environment variables
4. Review and optimize app bundle size
5. Test production builds locally

### App Store Deployment

1. Build production binaries (iOS/Android)
2. Configure app store metadata
3. Submit to App Store Connect / Google Play Console
4. Manage app store listings and screenshots
5. Handle app review process

### OTA Updates

1. Configure update channels (production, staging, etc.)
2. Build and publish updates
3. Manage rollout strategies
4. Monitor update adoption
5. Handle rollbacks if needed

## Best Practices

- Use EAS Build for reliable production builds
- Test production builds before submission
- Implement proper error tracking and analytics
- Use release channels for staged rollouts
- Keep app store metadata up to date
- Monitor app performance in production

## Resources

For more information, see the [source repository](https://github.com/expo/skills/tree/main/plugins/expo-deployment).

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
