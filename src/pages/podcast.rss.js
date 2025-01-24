// src/pages/podcast.rss.js
import client from "../lib/apolloClient";
import { getPodcastEpisodes } from '../lib/fetchAllResults';
import { GET_PODCAST_SETTINGS } from "../lib/queries";
import { getImages } from '../lib/utils';


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
    const siteUrl = import.meta.env.SITE_URL;
    const podcastEpisodes = await getPodcastEpisodes();
    const { data: podcastSettings } = await client.query({
        query: GET_PODCAST_SETTINGS
    });

    const settings = podcastSettings.podcastSettings;
    const defaultImage = settings.image;

    const episodeImagesPromises = podcastEpisodes.map(episode =>
        getEpisodeImageUrl(episode, defaultImage)
    );
    const episodeImages = await Promise.all(episodeImagesPromises);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
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
      <itunes:name>${settings.owner}</itunes:name>
    </itunes:owner>
    <itunes:category text="News">
      <itunes:category text="Daily News"/>
    </itunes:category>
    <itunes:category text="Society &amp; Culture">
      <itunes:category text="Places &amp; Travel"/>
    </itunes:category>
    <itunes:keywords>${settings.keywords}</itunes:keywords>

    <itunes:type>${settings.series ? 'serial' : 'episodic'}</itunes:type>

    ${settings.updateFrequency ? `<sy:updatePeriod>${settings.updateFrequency}</sy:updatePeriod>` : ''}

    <atom:link href="${siteUrl}/podcast.xml" rel="self" type="application/rss+xml" />

    <webMaster>${settings.owner}</webMaster>
    <managingEditor>${settings.owner}</managingEditor>
    <generator>HoZt.com</generator>

    <itunes:new-feed-url>${siteUrl}/podcast.xml</itunes:new-feed-url>

    ${settings.donationLink ? `<podcast:funding url="${settings.donationLink}">Support the show</podcast:funding>` : ''}
    ${settings.location ? `<podcast:location>${settings.location}</podcast:location>` : ''}
    ${settings.license ? `<podcast:license>${settings.license}</podcast:license>` : ''}
    ${settings.trailer ? `
    <podcast:trailer>
      <podcast:guid>${siteUrl}/trailer</podcast:guid>
      <podcast:pubdate>${new Date().toUTCString()}</podcast:pubdate>
      <podcast:length>${settings.trailer.length}</podcast:length>
      <podcast:type>audio/mpeg</podcast:type>
      <podcast:url>${settings.trailer.url}</podcast:url>
    </podcast:trailer>
    ` : ''}
    ${podcastEpisodes.map((episode, index) => `<item>
      <title>${episode.title}</title>
      <description><![CDATA[${stripHtmlTags(episode.excerpt)}]]></description>
      <pubDate>${new Date(episode.episodeDate).toUTCString()}</pubDate>
      <enclosure
        url="${episode.mp3File}"
        length="${episode.episodeLength}"
        type="audio/mpeg"
      />
      <guid isPermaLink="false">${siteUrl}/podcast/${episode.slug}</guid>
      <link>${siteUrl}/podcast/${episode.slug}</link>

      <itunes:title>${episode.title}</itunes:title>
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
      <itunes:duration>${Math.floor(episode.episodeLength / 60)}:${String(episode.episodeLength % 60).padStart(2, '0')}</itunes:duration>
      <itunes:image href="${episodeImages[index]}" />
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
