import client from '../lib/apolloClient';
import { GET_POSTS_BY_CATEGORY, GET_SITEMAP_SLUGS, GET_SITEMAP_PAGES, GET_SITEMAP_POSTS, GET_SITEMAP_PODCASTS, GET_PODCAST_EPISODES, GET_ALL_EVENTS } from '../lib/queries';
import { getCurrentDate } from './formatDate';

async function fetchAllResults(query, variables, extractNodes) {
    let allNodes = [];
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const { data } = await client.query({
        query,
        variables: { ...variables, after },
      });

      const nodes = extractNodes(data);
      allNodes = [...allNodes, ...nodes];

      hasNextPage = data.allNodes.pageInfo.hasNextPage;
      after = data.allNodes.pageInfo.endCursor;
    }
    return allNodes;
}

export async function getAllResults(query, params) {
    const allParams = { ...params, first: 20 };
    const allNodes = await fetchAllResults(
      query,
      allParams,
      (data) => data.allNodes.nodes
    );
    return allNodes;
}

export async function getPostsByCategory(categoryId) {
  const params = { categoryIn: [categoryId], first: 20 };
  const allNodes = await fetchAllResults(
    GET_POSTS_BY_CATEGORY,
    params,
    (data) => data.allNodes.nodes
  );

  const adaptedNodes = allNodes.map(node => ({
    title: node.title,
    slug: node.slug,
    excerpt: node.excerpt,
    databaseId: node.databaseId,
    date: node.date,
    featuredImage: node?.featuredImage
  }));

  return adaptedNodes;
}


export async function getTotalCount(query) {
    const allNodes = await fetchAllResults(
      query,
      { first: 200 },
      (data) => data.allNodes.nodes
    );
    return allNodes.length;
}

export async function getSiteMapData() {
  const params = { first: 200 };

  // Fetch initial sitemap slugs
  const initialData = await client.query({
    query: GET_SITEMAP_SLUGS,
    variables: params
  });

  // Fetch pages and posts
  const pages = await fetchAllResults(GET_SITEMAP_PAGES, params, (data) => data.allNodes.nodes);
  const posts = await fetchAllResults(GET_SITEMAP_POSTS, params, (data) => data.allNodes.nodes);
  const podcasts = await fetchAllResults(GET_SITEMAP_PODCASTS, params, (data) => data.allNodes.nodes);

  // Combine all results into sitemapData
  const sitemapData = {
    data: {
      ...initialData.data,
      pages: { nodes: pages },
      posts: { nodes: posts },
      podcasts: { nodes: podcasts }
    },
  };

  return sitemapData;
}

export async function getPodcastEpisodes() {
  const podcasts = await fetchAllResults(
    GET_PODCAST_EPISODES,
    { first: 20 },
    (data) => data.allNodes.nodes
  );
  return podcasts;
}

export async function getAllEvents(count) {
  const events = await getAllResults(GET_ALL_EVENTS);
  const currentDate = getCurrentDate();
  const stripHtmlTags = (html) => html.replace(/<[^>]*>/g, '');

  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startDatetime) - new Date(b.startDatetime)
  );

  return sortedEvents
    .filter(event => event.startDatetime >= currentDate)
    .slice(0, count)
    .map(event => ({
      ...event,
      excerpt: stripHtmlTags(event.excerpt), // Strip HTML tags from excerpt
    }));
}
