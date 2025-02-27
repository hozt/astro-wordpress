// src/pages/podcast.rss.js
import client from "../lib/apolloClient";
import { getPodcastEpisodes } from '../lib/fetchAllResults';
import { GET_PODCAST_SETTINGS } from "../lib/queries";
import { getImages } from '../lib/utils';
import { isEnabled } from '../lib/enabledFeatures';
import { feedDatePST } from '../lib/formatDate';

function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function getEpisodeImageUrl(episode, defaultImage) {
  const siteUrl = import.meta.env.SITE_URL;
  if (episode.featuredImage?.node?.sourceUrl) {
    const imageData = await getImages('featured', episode.featuredImage.node.sourceUrl);
    // Extract just the path starting from /assets/
    const imagePath = imageData.default.src.substring(imageData.default.src.indexOf('/assets/'));
    // Remove query string from the image path
    const cleanImagePath = imagePath.split('?')[0];
    return `${siteUrl}${cleanImagePath}`;
  }
  return defaultImage;
}

export async function GET() {
    if (!await isEnabled('podcasts')) {
        return new Response('Not Found', { status: 404 });
    }
    const siteUrl = import.meta.env.SITE_URL;
    const podcasts = await getPodcastEpisodes();
    const { data: podcastSettings } = await client.query({
        query: GET_PODCAST_SETTINGS
    });

    const settings = podcastSettings.podcastSettings;
    const defaultImage = settings.image;

    const episodeImagesPromises = podcasts.map(episode =>
        getEpisodeImageUrl(episode, defaultImage)
    );
    const episodeImages = await Promise.all(episodeImagesPromises);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${settings.name}</title>
    <description>${stripHtmlTags(settings.description)}</description>
    <link>${siteUrl}</link>
    <language>en-us</language>
    <copyright>Copyright ${new Date().getFullYear()}</copyright>

    <itunes:author>${settings.hosts}</itunes:author>
    <itunes:summary>${stripHtmlTags(settings.description)}</itunes:summary>
    <itunes:explicit>${settings.explicitRating === 'explicit' ? 'yes' : 'no'}</itunes:explicit>
    <itunes:image href="${settings.image}" />
    <itunes:owner>
      <itunes:name>Rogue Valley Pulse</itunes:name>
      <itunes:email>${settings.owner}</itunes:email>
    </itunes:owner>
    <itunes:category text="News" />
    <itunes:category text="Society &amp; Culture" />
    ${settings.series ? `<itunes:type>${settings.series}</itunes:type>` : ''}
    ${settings.updateFrequency ? `<sy:updatePeriod>${settings.updateFrequency}</sy:updatePeriod>` : ''}

    <atom:link href="${siteUrl}/podcast.rss" rel="self" type="application/rss+xml" />

    <webMaster>${settings.owner}</webMaster>
    <managingEditor>${settings.owner}</managingEditor>
    <generator>HoZt.com</generator>

    <itunes:new-feed-url>${siteUrl}/podcast.rss</itunes:new-feed-url>

    ${settings.donationLink ? `<podcast:funding url="${settings.donationLink}">Support the show</podcast:funding>` : ''}
    <podcast:location geo="geo:42.3134,-122.9703" osm="R9836921">Jacksonville, OR</podcast:location>
    ${settings.license ? `<podcast:license url="https://creativecommons.org/licenses/by-nc-nd/4.0/">cc-by-nc-nd-4.0</podcast:license>` : ''}
    ${settings.trailer ? `
    <podcast:trailer>
      <podcast:guid>${siteUrl}/trailer</podcast:guid>
      <podcast:pubdate>${new Date().toUTCString()}</podcast:pubdate>
      <podcast:length>${settings.trailer.length}</podcast:length>
      <podcast:type>audio/mpeg</podcast:type>
      <podcast:url>${settings.trailer.url}</podcast:url>
    </podcast:trailer>
    ` : ''}
    ${podcasts.map((episode, index) => `<item>
      <title>${episode.title}</title>
      <description><![CDATA[${stripHtmlTags(episode.excerpt)}]]></description>
      <pubDate>${feedDatePST(episode.episodeDate)}</pubDate>
      <enclosure
        url="${episode.mp3File}"
        length="${episode.fileSize}"
        type="audio/mpeg"
      />
      <guid isPermaLink="true">${siteUrl}/podcast/${episode.slug}</guid>
      <link>${siteUrl}/podcast/${episode.slug}</link>

      <itunes:title>${episode.title}</itunes:title>
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
      <itunes:duration>${episode.episodeLength}</itunes:duration>
      <itunes:image href="${settings.image}" />
      <itunes:explicit>${settings.explicitRating === 'explicit' ? 'yes' : 'no'}</itunes:explicit>
      <itunes:summary><![CDATA[${stripHtmlTags(episode.excerpt)}]]></itunes:summary>
    </item>
    `).join('')}
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
