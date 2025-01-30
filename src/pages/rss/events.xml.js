// src/pages/rss/events.xml.js
import rss from '@astrojs/rss';
import { getAllEvents } from "../../lib/fetchAllResults";
import { formatDateFull } from "../../lib/formatDate";

export async function GET(context) {
  const site = import.meta.env.SITE_URL;
  const events = await getAllEvents(100);
  if (events && events.length > 0) {
    return rss({
      title: 'Upcoming Events',
      description: 'RSS feed for upcoming events',
      site: site,
      items: events.map((event) => ({
        title: event.title,
        pubDate: formatDateFull(event.startDatetime),
        description: event.excerpt,
        link: `${site}/events/${event.slug}/`,
        content: `
          <p>${event.excerpt}</p>
          <p>Start: ${formatDateFull(event.startDatetime)}</p>
          <p>End: ${formatDateFull(event.endDatetime)}</p>
          <p>Location: ${event.location}</p>
          ${event.featuredImage ? `<img src="${event.featuredImage.node.sourceUrl}" alt="${event.featuredImage.node.altText}" width="${event.featuredImage.node.mediaDetails.width}" height="${event.featuredImage.node.mediaDetails.height}">` : ''}
        `,
        customData: `
          <location>${event.location}</location>
          <startDate>${formatDateFull(event.startDatetime)}</startDate>
          <endDate>${formatDateFull(event.endDatetime)}</endDate>
        `
      }))
    });
  }

  // Return an empty RSS feed instead of a 404 if there are no events
  return rss({
    title: 'Upcoming Events',
    description: 'RSS feed for upcoming events',
    site: site,
    items: []
  });
}
