import client from '../lib/apolloClient';
import { GET_POSTS_BY_CATEGORY, GET_SITEMAP_SLUGS, GET_SITEMAP_PAGES, GET_SITEMAP_POSTS } from '../lib/queries';

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
    const allParams = { ...params, first: 100 };
    const allNodes = await fetchAllResults(
      query,
      allParams,
      (data) => data.allNodes.nodes
    );
    return allNodes;
}

export async function getPostsByCategory(categoryId) {
  const params = { categoryIn: [categoryId], first: 100 };
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

  // Combine all results into sitemapData
  const sitemapData = {
    data: {
      ...initialData.data,
      pages: { nodes: pages },
      posts: { nodes: posts }
    },
  };

  return sitemapData;
}

