import { parse } from 'node-html-parser';
import PostTemplate from '../template/postTemplate';
import { renderPage } from '../template/pageTemplate';
import { renderLatestPodcastEpisode } from '../template/podcastTemplate.js';
import { getPostsByIds, getStickyPosts, getPostsByTag, fetchTestimonials, fetchGalleryImages, fetchAllPortfolios, fetchPageByPath, fetchLatestPodcast, getRecentPosts, getPostsByCategory, getVideos } from '../lib/fetchPosts';
import { getAllEvents } from "../lib/fetchAllResults";
import { formatDateMDY, secondsToMinutes, secondsToHMS, formatTime, formatDateDayMonthDate } from './formatDate';
import { decode } from 'html-entities';

const siteUrl = import.meta.env.SITE_URL;
const apiUrl = import.meta.env.API_URL;
const postAlias = import.meta.env.POST_ALIAS;

export function stripTags(content) {
  const decoded = decode(content);
  const stripped = decoded.replace(/<\/?[^>]+(>|$)/g, '');
  return stripped;
}

export function replaceIconShortcode(content) {
  // Regular expression to match the <i class="fas fa-shopping-cart"> pattern
  const iconRegex = /<i\s+class="[^"]*\bfa-([^"]+)"[^>]*><\/i>/g;

  // Replace the matched <i> tag with the modified version
  return content.replace(iconRegex, (match, iconName) => {
    // Validate the extracted iconName
    if (!iconName || typeof iconName !== 'string' || !/^[a-zA-Z0-9-]+$/.test(iconName)) {
      console.log(`Invalid icon name: "${iconName}"`);
      return match; // Return the original match if the iconName is invalid
    }

    // Generate the replacement HTML using string concatenation
    const iconClass = 'icon-[fa-solid--' + iconName + ']';
    return '<i class="icon ' + iconClass + '"></i>';
  });
}

export async function replaceImageUrls(content, localImageDir = 'images/content', localPdfDir = 'pdfs') {
  if (!content) {
    return content;
  }
  const root = parse(content);

  // Helper function to replace image URLs and add .webp extension
  const replaceImageUrl = (url, domain, localImageDir) => {
    const imgUrl = new URL(url, siteUrl);
    if (imgUrl.hostname === domain) {
      const filename = imgUrl.pathname.split('/').pop();
      const filenameWithoutExt = filename.split('.').slice(0, -1).join('.');
      return `/${localImageDir}/${filenameWithoutExt}.webp`;
    }
    return url;
  };

  // Helper function to replace PDF URLs
  const replacePdfUrl = (url, localPdfDir) => {
    const pdfUrl = new URL(url, siteUrl);
    const filename = pdfUrl.pathname.split('/').pop();
    return `/${localPdfDir}/${filename}`;
  };

  const siteDomain = new URL(siteUrl).hostname;
  const apiDomain = new URL(apiUrl).hostname;

  // Replace remote links at siteUrl and apiUrl to local links
  root.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Determine if this link should be processed
    const isPdf = href.endsWith('.pdf');
    const isSiteUrl = href.startsWith(siteUrl);
    const isApiUrl = href.startsWith(apiUrl);
    const isRelative = !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//');

    // Only process internal links (relative paths, PDFs, or links to our domains)
    const shouldProcess = isRelative || isPdf || isSiteUrl || isApiUrl;

    if (!shouldProcess) {
      return; // Skip external links
    }

    let newHref = href;

    // Handle PDF links and URL replacements
    if (isPdf) {
      newHref = replacePdfUrl(href, localPdfDir);
    } else if (isSiteUrl) {
      newHref = href.replace(siteUrl, '');
    } else if (isApiUrl) {
      newHref = href.replace(apiUrl, '');
    }

    // Split URL into path and anchor parts
    const [pathPart, anchorPart] = newHref.split('#');

    // Add trailing slash to path part if needed (and not a PDF)
    let updatedPath = pathPart;
    if (!updatedPath.endsWith('.pdf') && !updatedPath.endsWith('/')) {
      updatedPath += '/';
    }

    // Recombine path and anchor
    newHref = anchorPart ? `${updatedPath}#${anchorPart}` : updatedPath;

    // Remove double slashes (except after protocol)
    newHref = newHref.replace(/([^:]\/)\/+/g, "$1");

    a.setAttribute('href', newHref);
  });

  // Replace PDF URLs in object tags
  root.querySelectorAll('object').forEach(obj => {
    const data = obj.getAttribute('data');
    if (data && data.endsWith('.pdf')) {
      const newData = replacePdfUrl(data, localPdfDir);
      obj.setAttribute('data', newData);
    }
  });

  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('http')) {
      const newSrc = replaceImageUrl(src, siteDomain, localImageDir);
      img.setAttribute('src', newSrc !== src ? newSrc : replaceImageUrl(src, apiDomain, localImageDir));
    }

    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const newSrcset = srcset.split(',').map(srcsetItem => {
        const [url, descriptor] = srcsetItem.trim().split(' ');
        const newUrl = replaceImageUrl(url, siteDomain, localImageDir);
        const finalUrl = newUrl !== url ? newUrl : replaceImageUrl(url, apiDomain, localImageDir);
        return descriptor ? `${finalUrl} ${descriptor}` : finalUrl;
      }).join(', ');
      img.setAttribute('srcset', newSrcset);
    }
  });

  return root.toString();
}

export function localImage(imageUrl, path) {
  if (imageUrl) {
    const filename = imageUrl.split('/').pop();
    const filenameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return `/images/${path}/${filenameWithoutExt}.webp`;
  }
  return '';
}

export function localFileName(imageUrl) {
  if (imageUrl) {
    return imageUrl.split('/').pop();
  }
  return '';
}

export async function getImageLogoUrl(imagePath) {
  // remove the file name from imagePath
  const images = import.meta.glob(`../../assets/images/logos/*.{gif,jpg,jpeg,png,webp,avif}`);
  if (images[imagePath]) {
    const imageModule = await images[imagePath]();
    return imageModule.default;
  }
  return null;
}

export async function getImages(directory, imagePath) {
  if (!imagePath) {
    return null;
  }
  let images = {};

  switch (directory) {
    case 'logos':
      images = import.meta.glob('../../assets/images/logos/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    case 'additional':
      images = import.meta.glob('../../assets/images/additional/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    case 'featured':
      images = import.meta.glob('../../assets/images/featured/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    case 'banners':
      images = import.meta.glob('../../assets/images/banners/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    case 'gallery':
      images = import.meta.glob('../../assets/images/gallery/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    case 'gallery-thumbnails':
      images = import.meta.glob('../../assets/images/gallery-thumbnails/*.{gif,jpg,jpeg,png,webp,avif}');
      break;
    default:
      console.log('Invalid directory:', directory);
      return null;
  }

  const relativePath = `../../assets/images/${directory}/${imagePath.split('/').pop()}`;
  if (images[relativePath]) {
    const imageModule = await images[relativePath]();
    return imageModule;
  }

  console.log('Additional image not found for path:', relativePath);
  return null;
}
// Helper function to decode HTML entities
export function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#8217;': "'", // Single right quotation mark
    '&#038;': '&', // Ampersand
    '&#8220;': '"', // Left double quotation mark
    '&#8221;': '"', // Right double quotation mark
    '&#8211;': '-', // En dash
    '&#8212;': '—', // Em dash
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&#8221;': '"',
    '&#8243;': '"'
  };
  return text.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
}

// Export async function to replace WordPress shortcodes with custom functionality
async function replaceAllShortCodes(content, pattern, replaceFn) {
  let newContent = content;
  let match;

  while ((match = pattern.exec(newContent)) !== null) {
    const fullMatch = match[0];
    const replacement = await replaceFn(...match);

    newContent = newContent.slice(0, match.index) + replacement + newContent.slice(match.index + fullMatch.length);
    pattern.lastIndex = match.index + replacement.length;
  }

  return newContent;
}

// Export async function to replace WordPress shortcodes with custom functionality
export async function replaceShortCodes(content) {
  content = decodeHTMLEntities(content);
  const shortCodes = [
    {
      pattern: /\[page\s+uri="([^"]+)"\]/g,
      replace: async (match, uri) => {
        const page = await fetchPageByPath(uri);
        if (page) {
          return renderPage({ page });
        }
        return '';
      }
    },
    {
      pattern: /<p>\[podcast\s+([^\]]+)\]<\/p>/g,
      replace: async (match, attributes) => {
        try {
          const decodedAttributes = decodeHTMLEntities(attributes);

          const feedMatch = decodedAttributes.match(/feed="([^"]+)"/);
          const feedUrl = feedMatch ? feedMatch[1] : '';

          const imageMatch = decodedAttributes.match(/image="([^"]+)"/);
          const image = imageMatch ? imageMatch[1] : '';

          const readMoreMatch = decodedAttributes.match(/read-more="([^"]+)"/);
          const readMore = readMoreMatch ? decodeHTMLEntities(readMoreMatch[1]) : '';

          const titleMatch = decodedAttributes.match(/title="([^"]+)"/);
          const title = titleMatch ? titleMatch[1] : '';

          if (!feedUrl) {
            console.error('Podcast shortcode is missing required "feed" attribute');
            return '<!-- Podcast shortcode is missing required "feed" attribute -->';
          }

          const podcastHtml = await renderLatestPodcastEpisode(feedUrl, image, readMore, title);
          return podcastHtml;
        } catch (error) {
          console.error('Error processing podcast shortcode:', error);
          return `<!-- Error processing podcast shortcode: ${error.message} -->`;
        }
      }
    },
    // [gallery-images slug="featured-clients" width="200"]
    {
      pattern: /<p>\[gallery-images([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        const decodedAttributes = decodeHTMLEntities(attributes);
        const slugMatch = decodedAttributes.match(/slug="([^"]+)"/);
        const slug = slugMatch ? slugMatch[1] : '';

        const widthMatch = decodedAttributes.match(/width="([^"]+)"/);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 400; // Ensure width is an integer

        // Fetch gallery images from the API
        const images = await fetchGalleryImages(slug);

        // Generate the HTML for the gallery images
        if (images.length === 0) {
          return `<p>No gallery images found</p>`;
        }

        const galleryHtml = await Promise.all(images.map(async image => {
          let imageLocal;
          if (image.sourceUrl) {
            imageLocal = await getImages('gallery', image.sourceUrl);
          }
          return `
            <figure>
              <Image
                src="${imageLocal?.default?.src || image.sourceUrl}"
                alt="${image?.altText}"
                width="${width}"
                inferSize
                loading="lazy"
              />
            </figure>
          `;
        }));

        return `<div class="gallery-short-code">${galleryHtml.join('')}</div>`;
      }
    },
    // [display-portfolio count="4" sticky="true" width="400"]
    {
      pattern: /<p>\[portfolios([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        // Decode HTML entities in the attributes
        const decodedAttributes = decodeHTMLEntities(attributes);
        const countMatch = decodedAttributes.match(/count="([^"]+)"/);
        const count = countMatch ? parseInt(countMatch[1], 10) : 4; // Ensure count is an integer
        const stickyMatch = decodedAttributes.match(/sticky="([^"]+)"/);
        const sticky = stickyMatch ? stickyMatch[1] === 'true' : false;
        const widthMatch = decodedAttributes.match(/width="([^"]+)"/);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 400; // Ensure width is an integer
        const portfolios = await fetchAllPortfolios(count, sticky);
        if (portfolios.length === 0) {
          return `<p>No portfolios found</p>`;
        }

        const portfolioHtml = await Promise.all(portfolios.map(async portfolio => {
          let imageLocal;
          if (portfolio.additionalImage.sourceUrl) {
            imageLocal = await getImages('additional', portfolio.additionalImage.sourceUrl);
          }
          return `
            <div class="portfolio">
              <a href="/portfolio/${portfolio.slug}/" aria-label="Project ${portfolio.title}">
                <Image
                  src="${imageLocal?.default?.src || portfolio.additionalImage.sourceUrl}"
                  alt="${portfolio.additionalImage.altText}"
                  width="${width}"
                  loading="lazy"
                  decoding="async"
                  class="portfolio-image"
                />
              </a>
              <div class="tags">
              ${portfolio.tags.nodes.map(tag => `<div class="tag">${tag.name}</div>`).join('')}
              </div>
            </div>
          `;
        }));

        return `<div class="portfolios-short-code">${portfolioHtml.join('')}</div>`;
      }
    },
    // [testimonials count="4" rating="true" tag="happy-clients" sticky="true"]
    {
      pattern: /<p>\[testimonials([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        // Decode HTML entities in the attributes
        const decodedAttributes = decodeHTMLEntities(attributes);

        // Parse attributes
        const countMatch = decodedAttributes.match(/count="([^"]+)"/);
        const count = countMatch ? countMatch[1] : 4;

        const ratingMatch = decodedAttributes.match(/rating="([^"]+)"/);
        const showRating = ratingMatch ? ratingMatch[1] === "true" : false;

        const stickyMatch = decodedAttributes.match(/sticky="([^"]+)"/);
        const sticky = stickyMatch ? stickyMatch[1] === 'true' : false;

        const tagMatch = decodedAttributes.match(/tag="([^"]+)"/);
        const tag = tagMatch ? tagMatch[1] : null;
        let testimonials = [];

        if (tag) {
          const tagResults = await getTestimonialsByTag(tag);
          // flatten testimonials from returned taxonomy structure
          testimonials = tagResults
            .map(tagNode => (tagNode.testimonials && tagNode.testimonials.nodes ? tagNode.testimonials.nodes : []))
            .flat();
          // Optionally, limit by count attribute
          testimonials = testimonials.slice(0, count);
        } else {
          testimonials = await fetchTestimonials(count, sticky);
        }

        // Generate the HTML for the testimonials
        const rating = 5;
        const testimonialHtml = testimonials.map(testimonial => `
          <div class="testimonial">
            <div class="content">${decode(testimonial.content)}</div>
            <div class="author">
              <div class="title">${decode(testimonial.title)}</div>
              ${testimonial.source ? `<div class="source">${testimonial.source}</div>` : ''}
            </div>
            ${showRating ? `
            <div class="rating">
              <div class="rating-stars">${'<i class="icon icon-[mdi--star]"></i>'.repeat(rating)}</div>
              <div class="rating-actual">${rating} / 5</div>
            </div>
          ` : ''}
          </div>
        `).join('');

        return `<div class="testimonials-short-code">${testimonialHtml}</div>`;
      }
    },

    // [podcast-latest imageWidth=300 count=3 excerpt="true"]
    {
      pattern: /<p>\[podcast-latest([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        const decodedAttributes = decodeHTMLEntities(attributes);
        const imageWidth = parseInt(decodedAttributes.match(/imageWidth\s*=\s*(?:"?(\d+)"?)/)?.[1] || '400', 10);
        const count = parseInt(decodedAttributes.match(/count\s*=\s*(?:"?(\d+)"?)/)?.[1] || '1', 10);

        const excerptMatch = decodedAttributes.match(/excerpt="([^"]+)"/);
        const excerpt = excerptMatch ? excerptMatch[1].toLowerCase() === 'true' : false;
        const podcasts = await fetchLatestPodcast(count);

        const generatePodcastElement = async (podcast) => {
          let imageLocal;
          if (podcast?.featuredImage?.node?.sourceUrl) {
            imageLocal = await getImages('featured', podcast.featuredImage.node.sourceUrl);
          }

          return `
            <div class="podcast">
              <div class="podcast-image">
                <a href="/podcast/${podcast.slug}">
                  <img
                    src="${imageLocal?.default?.src || ''}"
                    alt="${podcast.featuredImage?.node?.altText || ''}"
                    loading="lazy"
                    width="${imageWidth}"
                    height="${imageWidth}"
                  />
                </a>
              </div>
              <div class="podcast-details">
                <div class="length">
                  <span class="length-icon icon"></span>
                  <div class="label">${secondsToMinutes(podcast.episodeLength)}</div>
                </div>
                <div class="date">
                  <span class="date-icon icon"></span>
                  <div class="label">${formatDateMDY(podcast.episodeDate)}</div>
                </div>
              </div>
              <div class="title">${decode(podcast.title)}</div>
              ${ excerpt ? `<div class="summary">${decode(podcast.excerpt)}</div>` : '' }
              <div class="listen">
                <a href="/podcast/${podcast.slug}" class="listen-now">Listen Now</a>
              </div>
            </div>
          `;
        };

        if (!podcasts?.length) {
          return `<p>No podcasts found</p>`;
        }

        const podcastElements = await Promise.all(podcasts.map(generatePodcastElement));
        return `<div class="podcasts">${podcastElements.join('')}</div>`;
      }
    },
    // [videos count="3" sort="random"]
    {
      pattern: /<p>\[videos([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        const decodedAttributes = decodeHTMLEntities(attributes);
        const countMatch = decodedAttributes.match(/count="([^"]+)"/);
        const count = countMatch ? parseInt(countMatch[1], 10) : 3;
        const sortMatch = decodedAttributes.match(/sort="([^"]+)"/);
        const sort = sortMatch ? sortMatch[1] : 'random';
        const videos = await getVideos(count, sort);
        const videosWithImages = await Promise.all(videos.map(async (video) => {
          if (video?.featuredImage?.node?.sourceUrl) {
            const imageLocal = await getImages('featured', video.featuredImage.node.sourceUrl);
            return { ...video, thumbnail: imageLocal?.default?.src || '' };
          }
          return { ...video, thumbnail: '' };
        }));

        if (!videosWithImages?.length) {
          return `<p>No videos found</p>`;
        }

        return `<div class="videos">
          ${videosWithImages.map(video => `
            <div class="video">
              <div class="video-thumbnail">
                ${video.thumbnail ? `<a href="/videos/${video.slug}"><img src="${video.thumbnail}" alt="${video.title}" loading="lazy" /></a>` : ''}
              </div>
              <div class="video-details">
                <div class="title"><a href="/videos/${video.slug}">${decode(video.title)}</a></div>
                ${video?.excerpt ? `<div class="excerpt">${decode(video.excerpt)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>`;
      }
    },
    // [events-latest count="4" sticky="true" anchor="true"]
    {
      pattern: /<p>\[events-latest([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        // Parse attributes
        const decodedAttributes = decodeHTMLEntities(attributes);
        const countMatch = decodedAttributes.match(/count="([^"]+)"/);
        const count = countMatch ? countMatch[1] : 4;

        const stickyMatch = decodedAttributes.match(/sticky="([^"]+)"/);
        const sticky = stickyMatch ? stickyMatch[1].toLowerCase() === 'true' : false;

        // match anchor
        const anchorMatch = decodedAttributes.match(/anchor="([^"]+)"/);
        const anchor = anchorMatch ? anchorMatch[1].toLowerCase() === 'true' : false;
        const events = await getAllEvents(count, sticky);
        if (events.length === 0) {
          return `<p>No events found</p>`;
        }

        // return all the events future events
        return `<div class="events">
          ${events.map(event => `
              <div class="event">
                <div class="date-wrapper">
                  ${formatDateDayMonthDate(event.startDatetime)}
                </div>
                <div class="details">
                  <div class="title"><a href="/event/${anchor ? `#${event.slug}` : `${event.slug}/`}">${decode(event.title)}</a></div>
                  ${event?.excerpt ? `<div class="excerpt">${event.excerpt}</div>` : ''}
                  ${event?.location ? `<div class="location"><i class="icon"></i>${decode(event.location)}</div>` : ''}
                  <div class="times">
                    <i class="icon"></i>${formatTime(event.startDatetime)}${event.endDatetime ? ` - ${formatTime(event.endDatetime)}` : ''}
                  </div>
                </div>
              </div>
          `).join('')}
        </div>`;
      }
    },
    {
      pattern: /<p>\[display-posts([^\]]*)\]<\/p>/g,
      replace: async (match, attributes) => {
        // Decode HTML entities in the attributes
        const decodedAttributes = decodeHTMLEntities(attributes);

        // Parse attributes
        const idMatch = decodedAttributes.match(/id="([^"]+)"/);
        const titleMatch = decodedAttributes.match(/title="([^"]+)"/);

        const widthMatch = decodedAttributes.match(/imageWidth\s*=\s*(?:"?(\d+)"?)/);
        const imageWidth = widthMatch ? parseInt(widthMatch[1], 10) : 400;

        const stickyMatch = decodedAttributes.match(/sticky="([^"]+)"/);
        const sticky = stickyMatch ? stickyMatch[1].toLowerCase() === 'true' : false;

        const classMatch = decodedAttributes.match(/class="([^"]+)"/);
        const classes = classMatch ? classMatch[1] : '';

        const tagMatch = decodedAttributes.match(/tag="([^"]+)"/);
        const tag = tagMatch ? tagMatch[1] : '';

        // category match
        const categoryMatch = decodedAttributes.match(/category="([^"]+)"/);
        const category = categoryMatch ? categoryMatch[1] : '';

        const tagListMatch = decodedAttributes.match(/tag-list="([^"]+)"/);
        const tagList = tagListMatch ? tagListMatch[1].toLowerCase() === 'true' : false

        // tag-title="true"
        const tagTitleMatch = decodedAttributes.match(/tag-title="([^"]+)"/);
        const tagTitle = tagTitleMatch ? tagTitleMatch[1].toLowerCase() === 'true' : false;

        const countMatch = decodedAttributes.match(/count=(?:"?([^"]+)"?)/);
        const count = countMatch ? countMatch[1] : 1;

        const readMoreMatch = decodedAttributes.match(/read-more="([^"]+)"/);
        const readMore = readMoreMatch ? decodeHTMLEntities(readMoreMatch[1]) : '';

        const dateMatch = decodedAttributes.match(/date="([^"]+)"/);
        const dateInclude = dateMatch ? dateMatch[1].toLowerCase() === 'true' : false;

        const ids = idMatch ? idMatch[1].split(',').map(id => id.trim()) : [];

        let posts = [];

        if (tag) {
          posts = await getPostsByTag(tag, count);
        } else if (category) {
          posts = await getPostsByCategory(category, count);
        } else if (sticky) {
          posts = await getStickyPosts(count);
        } else if (ids.length > 0) {
          posts = await getPostsByIds(ids);
        } else {
          posts = await getRecentPosts(count);
        }
        if (posts && posts.length > 0) {
          const postPreviews = await Promise.all(posts.map(post =>
            PostTemplate({ post, classes: 'post-template', path: postAlias, readMore, dateInclude, tagList, tagTitle, imageWidth })
          ));
          const classList = ['posts'];
          if (classes) {
            classList.push(classes);
          }
          const classAttribute = classList.join(' ');
          return `
            <div class="${classAttribute}">
                ${postPreviews.join('')}
            </div>
          `;
        }

        return match;
      }
    }
  ];

  // Replace all matched shortcodes with the modified version
  for (const shortCode of shortCodes) {
    content = await replaceAllShortCodes(content, shortCode.pattern, shortCode.replace);
  }
  return content;
}


// function that takes a string with a url like https://google.com/somthing and returns the domain name
export function getDomainName(url) {
  const domain = new URL(url).hostname;
  return domain.replace('www.', '');
}
