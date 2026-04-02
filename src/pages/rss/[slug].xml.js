/**
 * @file rss/[slug].xml.js
 * @description Per-category RSS feed endpoint.
 */
import rss from '@astrojs/rss';
import client from '../../lib/apolloClient';
import { isEnabled } from '../../lib/enabledFeatures';
import { GET_CATEGORIES, GET_POSTS_BY_CATEGORY_SLUG } from '../../lib/queries';

const siteUrl = import.meta.env.SITE_URL;
const postAlias = import.meta.env.POST_ALIAS;

export async function getStaticPaths() {
  try {
    const { data } = await client.query({
      query: GET_CATEGORIES,
      variables: { first: 200 },
    });

    // Check if categories are empty
    if (!data?.categories?.nodes || data.categories.nodes.length === 0) {
      console.warn('No categories found, skipping RSS feed path generation');
      return [];
    }

    return data.categories.nodes.map((category) => ({
      params: { slug: category.slug },
      props: { category },
    }));
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    if (error.graphQLErrors) {
      console.error('GraphQL Errors:', error.graphQLErrors);
    }
    if (error.networkError) {
      console.error('Network Error:', error.networkError);
    }
    return [];
  }
}

export const GET = async ({ params }) => {
  try {
    // Check if posts are enabled
    if (!await isEnabled('posts')) {
      console.log('Posts feature is disabled, skipping RSS feed generation');
      return new Response('Posts feature is disabled', { status: 404 });
    }

    const slug = params?.slug;

    if (!slug) {
      console.error('No slug provided in params');
      return new Response('Invalid category', { status: 400 });
    }

    const { data } = await client.query({
      query: GET_POSTS_BY_CATEGORY_SLUG,
      variables: { slug },
    });

    // Check if category exists
    if (!data?.category) {
      console.warn(`Category with slug "${slug}" not found`);
      return new Response(`Category "${slug}" not found`, { status: 404 });
    }

    const posts = data.category.posts?.nodes || [];

    const rssFeed = await rss({
      title: `HoZt News Feed - ${data.category.name || slug}`,
      description: `Latest HoZt News for ${data.category.name || slug}`,
      site: siteUrl,
      items: posts.map(post => ({
        title: post.title,
        description: post.excerpt,
        link: `${siteUrl}/${postAlias}/${post.slug}`,
        pubDate: new Date(post.date),
      })),
    });

    const rssContent = await rssFeed.text();

    return new Response(rssContent, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error(`Error generating RSS feed for slug "${params?.slug}":`, error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
};