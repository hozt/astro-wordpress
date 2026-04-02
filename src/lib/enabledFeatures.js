/**
 * @file enabledFeatures.js
 * @description Feature flag checker; returns a 404 response for site sections that have been disabled via GraphQL site settings.
 */
import { GET_ENABLED_FEATURES } from './queries';
import client from './apolloClient';

let featuresCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

async function getEnabledFeatures() {
  const now = Date.now();
  if (featuresCache && (now - cacheTime) < CACHE_TTL_MS) {
    return featuresCache;
  }

  const { data } = await client.query({
    query: GET_ENABLED_FEATURES,
    fetchPolicy: 'network-only',
  });

  featuresCache = data?.customSiteSettings?.enabledFeatures || [];
  cacheTime = now;
  return featuresCache;
}

export async function isEnabled(feature) {
  const enabledFeatures = await getEnabledFeatures();
  return enabledFeatures.includes(feature);
}
