import {
  GET_POSTS_EXCERPTS_BY_IDS,
  GET_POSTS_EXCERPTS_STICKY,
  GET_POSTS_BY_TAG_COUNT,
  GET_TESTIMONIALS_LIMIT,
  GET_GALLERY,
  GET_ALL_PORTFOLIOS,
  GET_EMBED_PAGE,
  GET_PODCAST_EPISODES,
  GET_POSTS_EXCERPTS_RECENT,
  GET_EVENTS
} from './queries';
import client from './apolloClient';
import { getCurrentDate } from './utils';

export async function getPostsByIds(ids) {
    const idArray = Array.isArray(ids) ? ids : [ids];

    const { data } = await client.query({
      query: GET_POSTS_EXCERPTS_BY_IDS,
      variables: { ids: idArray },
    });

    if (data?.posts?.nodes) {
      return data.posts.nodes;
    } else {
      console.error('No posts found for IDs:', ids);
      return [];
    }
}

export async function getStickyPosts(count) {
    const { data } = await client.query({
      query: GET_POSTS_EXCERPTS_STICKY,
    });

    if (data?.posts?.nodes) {
      const posts = data.posts.nodes.map(post => ({ ...post }));

      posts.forEach(post => {
        post.date = new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      });

      if (count) {
        return posts.slice(0, count);
      }

      return posts;
    } else {
      console.error('No sticky posts found');
      return [];
    }
}

export async function getRecentPosts(count) {
  const { data } = await client.query({
    query: GET_POSTS_EXCERPTS_RECENT,
    variables: { first: parseInt(count) },
  });

  if (data?.posts?.nodes) {
    return data.posts.nodes;
  }
}

export async function fetchTestimonials(count) {
  const { data } = await client.query({
    query: GET_TESTIMONIALS_LIMIT,
    variables: { count: parseInt(count) }, // Ensure count is an integer
  });

  if (data?.testimonials?.nodes) {
    return data.testimonials.nodes;
  } else {
    console.error('No testimonials found');
    return [];
  }
}

// get posts by tag with count
export async function getPostsByTag(tag, count) {
    const { data } = await client.query({
      query: GET_POSTS_BY_TAG_COUNT,
      variables: { tag, count: parseInt(count) },
    });

    if (data?.posts?.nodes) {
      return data.posts.nodes;
    } else {
      console.error('No posts found for tag:', tag);
      return [];
    }
}

export async function fetchGalleryImages(slug) {
  const { data } = await client.query({
    query: GET_GALLERY,
    variables: { slug },
  });

  if (data?.galleryBy?.galleryImages) {
    return data.galleryBy.galleryImages;
  } else {
    console.error('No gallery images found');
    return [];
  }
}

export async function fetchAllPortfolios(count, sticky=false) {
  const { data } = await client.query({
    query: GET_ALL_PORTFOLIOS,
    variables: { first: 100 },
  });

  if (data?.portfolios?.nodes) {
    // if sticky then filter out all nodes that do not have isSticky set to true return only count records
    return sticky ? data.portfolios.nodes.filter(portfolio => portfolio.isSticky).slice(0, count) : data.portfolios.nodes.slice(0, count);
  } else {
    console.error('No portfolios found');
    return [];
  }
}

// get page by path
export async function fetchPageByPath(uri) {
    const { data } = await client.query({
      query: GET_EMBED_PAGE,
      variables: { id: uri },
    });

    if (data?.page) {
      return data.page;
    } else {
      console.error('No page found for path:', path);
      return {};
    }
}

export async function fetchLatestPodcast() {
  const { data } = await client.query({
    query: GET_PODCAST_EPISODES,
    variables: { first: 1, after: null },
  });
  // return the first episode
  return data?.allNodes?.nodes[0] || {};
}

export async function fetchEvents(count) {
  const { data } = await client.query({
    query: GET_EVENTS,
  });

  function stripTime(dateString) {
    return dateString.split(' ')[0]; // Extract just the date part
  }

  const currentDate = getCurrentDate();  //new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
  if (data?.events?.nodes) {
    // Create a copy of the array before sorting
      const sortedEvents = [...data.events.nodes].sort((a, b) =>
      new Date(stripTime(a.startDatetime)) - new Date(stripTime(b.startDatetime))
    );

    return sortedEvents.filter(event =>
      stripTime(event.startDatetime) >= currentDate
    ).slice(0, count);
  } else {
    console.error('No events found');
    return [];
  }

}
