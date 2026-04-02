/**
 * @file fetchAndSaveImages.js
 * @description Build-time image downloader that fetches images from WordPress GraphQL, processes them with Sharp, and saves optimized WebP files to public/images/.
 */

// src/utils/imageProcessor.js
import sharp from 'sharp';
import { request, gql } from 'graphql-request';
import { parse } from 'node-html-parser';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let endpoint = process.env.API_URL;

if (!endpoint) {
  throw new Error('API_URL environment variable is not set');
}

endpoint = `${endpoint}/graphql`;

const recordsToFetch = 500;
const query = gql`
  query GetImages($first: Int!) {
    redirects {
      new_url
      old_url
      status_code
    }
    forms(first: $first) {
      nodes {
        bannerImage {
          sourceUrl
        }
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
    }
    videos(first: $first) {
      nodes {
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
    }
    templates(first: $first) {
      nodes {
        bannerImage {
          sourceUrl
        }
      }
    }
    customSiteSettings {
      logo {
        sourceUrl
      }
      mobileLogo {
        sourceUrl
      }
      faviconLogo {
        sourceUrl
      }
      defaultHeaderImage {
        sourceUrl
      }
      defaultFeaturedImage {
        sourceUrl
      }
      editorKey
    }
    galleries {
      nodes {
        galleryImages {
          sourceUrl
          mediaDetails {
            width
            height
          }
        }
      }
    }
    mediaItems(where: {mimeType: APPLICATION_PDF}) {
      nodes {
        mediaItemUrl
      }
    }
    stylesheetMediaItems:mediaItems(where: {isStylesheet: true}) {
      nodes {
        mediaItemUrl
      }
    }
    portfolios(first: $first) {
      nodes {
        featuredImage {
          node {
            sourceUrl
          }
        }
        additionalImage {
          sourceUrl
        }
      }
    }
  }
`;

const queryPosts = gql`
  query GetPosts($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      nodes {
        bannerImage {
          sourceUrl
        }
        featuredImage {
          node {
            sourceUrl
          }
        }
        content
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const queryPages = gql`
  query GetPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      nodes {
        content
        bannerImage {
          sourceUrl
        }
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const queryOthers = gql`
  query GetOthers($first: Int!, $after: String) {
    others(first: $first, after: $after) {
      nodes {
        featuredImage {
          node {
            sourceUrl
          }
        }
        galleryImages {
          sourceUrl
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const queryPodcasts = gql`
  query GetPodcasts($first: Int!, $after: String) {
    podcasts(first: $first, after: $after) {
      nodes {
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const queryMenuIcons = gql`
  query NewQuery {
    menuItems {
      nodes {
        cssClasses
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

function extractImageUrlsFromContent(htmlContent) {
  const imageUrl = process.env.API_URL;

  if (!htmlContent) {
    return [];
  }

  const root = parse(htmlContent);
  const imageUrls = new Set();

  root.querySelectorAll('img').forEach(img => {
    // Extract src attribute
    const src = img.getAttribute('src');
    // only download images if they are on the domain imageUrl
    if (src && src.startsWith(imageUrl)) {
      imageUrls.add(src);
    }

    // Extract srcset attribute
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      srcset.split(',').forEach(srcsetItem => {
        const [url] = srcsetItem.trim().split(' ');
        if (url) {
          imageUrls.add(url);
        }
      });
    }
  });

  return Array.from(imageUrls);
}

async function fetchImageUrls() {
  try {
    const data = await request(endpoint, query, { first: recordsToFetch });
    const posts = await fetchAllPosts();
    const pages = await fetchAllPages();

    if (!data) {
      throw new Error('No data returned from the GraphQL API');
    }

    const imageUrls = {
      banners: [],
      featured: [],
      content: [],
      logos: [],
      gallery: [],
      additional: [],
    };

    ['forms', 'templates'].forEach(type => {
      data[type]?.nodes?.forEach(node => {
        if (node?.bannerImage?.sourceUrl) {
          imageUrls.banners.push(node.bannerImage.sourceUrl);
        }
      });
    });

    // posts
    posts.forEach(node => {
      if (node?.bannerImage?.sourceUrl) {
        imageUrls.banners.push(node.bannerImage.sourceUrl);
      }
      if (node?.featuredImage?.node?.sourceUrl) {
        imageUrls.featured.push(node.featuredImage.node.sourceUrl);
      }
    });

    // pages
    pages.forEach(node => {
      if (node?.bannerImage?.sourceUrl) {
        imageUrls.banners.push(node.bannerImage.sourceUrl);
      }
      if (node?.featuredImage?.node?.sourceUrl) {
        imageUrls.featured.push(node.featuredImage.node.sourceUrl);
      }
    });

    // Collect featured images
    ['forms', 'templates', 'portfolios', 'videos'].forEach(type => {
      data[type]?.nodes?.forEach(node => {
        if (node?.featuredImage?.node?.sourceUrl) {
          imageUrls.featured.push(node.featuredImage.node.sourceUrl);
        }
      });
    });

    // get featured from others
    const othersFeatured = await fetchAllOthers();
    othersFeatured.forEach(node => {
      if (node?.featuredImage?.node?.sourceUrl) {
        imageUrls.featured.push(node.featuredImage.node.sourceUrl);
      }
    });

    // get featured from podcasts
    try {
      const podcasts = await fetchAllPodcasts();
      podcasts.forEach(node => {
        if (node?.featuredImage?.node?.sourceUrl) {
          console.log('Podcast:', node.featuredImage.node.sourceUrl);
          imageUrls.featured.push(node.featuredImage.node.sourceUrl);
        }
      });
    } catch (error) {
      console.error('Podcasts are not enabled');
    }

    // get all additional images from portfolios
    data.portfolios.nodes.forEach(node => {
      if (node?.additionalImage?.sourceUrl) {
        imageUrls.additional.push(node.additionalImage.sourceUrl);
      }
    });

    pages.forEach(node => {
      imageUrls.content.push(...extractImageUrlsFromContent(node?.content));
    });

    posts.forEach(node => {
      imageUrls.content.push(...extractImageUrlsFromContent(node?.content));
    });

    if (data.customSiteSettings?.logo?.sourceUrl) {
      imageUrls.logos.push(data.customSiteSettings.logo.sourceUrl);
    }
    if (data.customSiteSettings?.mobileLogo?.sourceUrl) {
      imageUrls.logos.push(data.customSiteSettings.mobileLogo.sourceUrl);
    }
    if (data.customSiteSettings?.defaultHeaderImage?.sourceUrl) {
      imageUrls.banners.push(data.customSiteSettings.defaultHeaderImage.sourceUrl);
    }
    if (data.customSiteSettings?.defaultFeaturedImage?.sourceUrl) {
      imageUrls.featured.push(data.customSiteSettings.defaultFeaturedImage.sourceUrl);
    }
    if (data.customSiteSettings?.faviconLogo?.sourceUrl) {
      imageUrls.logos.push(data.customSiteSettings.faviconLogo.sourceUrl);
    }
    // Collect gallery images
    data.galleries?.nodes?.forEach(gallery => {
      gallery.galleryImages?.forEach(image => {
        if (image.sourceUrl) {
          imageUrls.gallery.push(image.sourceUrl);
        }
      });
    });
    // Collect other gallery images
    const others = await fetchAllOthers();
    console.log('Others:', others);
    others.forEach(node => {
      node.galleryImages.forEach(image => {
        if (image?.sourceUrl) {
          imageUrls.gallery.push(image?.sourceUrl);
          console.log('Image URL:', image?.sourceUrl);
        }
      });
    });

    // Return both imageUrls and editorKey
    return {
      imageUrls,
      editorKey: data.customSiteSettings?.editorKey
    };
  } catch (error) {
    console.log('Error in fetchImageUrls:', error.message);
    return null;
  }
}

async function fetchAllPosts() {
  let allPosts = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const data = await request(endpoint, queryPosts, { first: 50, after });

    const nodes = data.posts.nodes;
    allPosts = [...allPosts, ...nodes];

    const pageInfo = data.posts.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }
  return allPosts;
}

async function fetchAllPages() {
  let allPages = [];
  let hasNextPage = true;
  let after = null;
  while (hasNextPage) {
    const data = await request(endpoint, queryPages, { first: 25, after });
    const nodes = data.pages.nodes;
    allPages = [...allPages, ...nodes];
    const pageInfo = data.pages.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }
  return allPages;
}

async function fetchAllOthers() {
  let allOthers = [];
  let hasNextPage = true;
  let after = null;
  while (hasNextPage) {
    const data = await request(endpoint, queryOthers, { first: 25, after });
    const nodes = data.others.nodes;
    allOthers = [...allOthers, ...nodes];
    const pageInfo = data.others.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }
  return allOthers;
}

async function fetchAllPodcasts() {
  let allPodcasts = [];
  let hasNextPage = true;
  let after = null;
  while (hasNextPage) {
    const data = await request(endpoint, queryPodcasts, { first: 25, after });
    const nodes = data.podcasts.nodes;
    allPodcasts = [...allPodcasts, ...nodes];
    const pageInfo = data.podcasts.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }
  return allPodcasts;
}

async function fetchMenuIcons() {
  let allIcons = [];
  let hasNextPage = true;
  let after = null;
  while (hasNextPage) {
    const data = await request(endpoint, queryMenuIcons, { first: 100, after });
    const nodes = data.menuItems.nodes;
    allIcons = [...allIcons, ...nodes];
    const pageInfo = data.menuItems.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }
  return allIcons;
}

async function downloadImageThumbnail(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert image to webP that is 300px wide thumbnail
    const outputPathWebp = outputPath.replace(/\.(gif|jpg|jpeg|png)$/, '.webp');
    await sharp(buffer).resize({ width: 300 }).webp().toFile(outputPathWebp);

    console.log(`Downloaded thumbnail: ${outputPathWebp}`);
  } catch (error) {
    console.error(`Error downloading thumbnail ${url}: ${error.message}`);
  }
}

async function downloadImage(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(outputPath, buffer);
    console.log(`Downloaded: ${url}`);

    // Convert to WebP
    const webpOutputPath = outputPath.replace(/\.(gif|jpg|jpeg|png)$/, '.webp');
    await sharp(buffer).webp().toFile(webpOutputPath);
    console.log(`Converted to WebP: ${webpOutputPath}`);
  } catch (error) {
    console.error(`Error downloading ${url}: ${error.message}`);
  }
}

async function downloadPdf(pdfUrl, outputPath) {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfUrl}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(outputPath, buffer);
    console.log(`Downloaded PDF: ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading PDF ${pdfUrl}: ${error.message}`);
  }
}

async function fetchAndSavePDFs() {
  try {
    const data = await request(endpoint, query, { first: recordsToFetch });

    const localPdfDir = 'public/pdfs';
    await fs.mkdir(path.join(__dirname, localPdfDir), { recursive: true });

    for (const node of data.mediaItems.nodes) {
      try {
        const pdfUrl = node.mediaItemUrl;
        const pdfFilename = pdfUrl.split('/').pop();
        const pdfPath = path.join(__dirname, localPdfDir, pdfFilename);
        await downloadPdf(pdfUrl, pdfPath);
      } catch (error) {
        console.log(`Error fetching PDF: ${error.message}`);
      }
    }

    console.log('PDFs fetched and saved successfully');
  } catch (error) {
    console.error('Error in fetchAndSavePDFs:', error.message);
  }
}

// fetch and save mediaItemsStylesheet
async function fetchAndSaveStyleSheets() {
  try {
    const data = await request(endpoint, query, { first: recordsToFetch });
    const localImageDir = 'public/images/stylesheet';
    await fs.mkdir(path.join(__dirname, localImageDir), { recursive: true });
    for (const node of data.stylesheetMediaItems.nodes) {
      try {
        const imageUrl = node.mediaItemUrl;
        const imageFilename = imageUrl.split('/').pop();
        const imagePath = path.join(__dirname, localImageDir, imageFilename);
        await downloadImage(imageUrl, imagePath);
      } catch (error) {
        console.log(`Error fetching StyleSheet Images: ${error.message}`);
      }
    }

    console.log('StyleSheet images fetched and saved successfully');
  } catch (error) {
    console.error('Error in fetchAndSaveStyleSheets:', error.message);
  }
}

async function downloadAllImages(imageUrls) {
  const downloadPromises = [];
  for (const [category, urls] of Object.entries(imageUrls)) {
    for (const url of urls) {
      const fileName = path.basename(new URL(url).pathname);
      const basePath = (category === 'content') ? 'public' : 'assets';
      const outputPath = path.join(__dirname, basePath, 'images', category, fileName);
      await fs.mkdir(path.join(__dirname, basePath, 'images'), { recursive: true });
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      downloadPromises.push(downloadImage(url, outputPath));
      if (category === 'gallery') {
        const outputPathThumbnail = path.join(__dirname, basePath, 'images', 'gallery-thumbnails', fileName);
        await fs.mkdir(path.join(__dirname, basePath, 'images', 'gallery-thumbnails'), { recursive: true });
        downloadPromises.push(downloadImageThumbnail(url, outputPathThumbnail));
      }
    }
  }
  await Promise.all(downloadPromises);
}

async function copyIconsToPublic() {
  const iconsPath = path.join(__dirname, 'assets', 'icons');
  const publicIconsPath = path.join(__dirname, 'public', 'images', 'icons');

  try {
    await fs.mkdir(publicIconsPath, { recursive: true });

    const files = await fs.readdir(iconsPath);

    for (const file of files) {
      const source = path.join(iconsPath, file);
      const dest = path.join(publicIconsPath, file);
      try {
        await fs.copyFile(source, dest);
        console.log(`Copied ${file} to public folder`);
      } catch (err) {
        console.error(`Error copying ${file} to public folder:`, err);
      }
    }
  } catch (err) {
    console.log('No icons processed');
  }
}

function replaceIconClass(htmlString) {
  // Regular expression to match any Font Awesome solid icon class
  const regex = /<i class="fas fa-([^"]+)"><\/i>/g;

  // Replacement function
  const replacement = (match, iconName) => `<i class="icon-[fa-solid--${iconName}]"></i>`;

  // Use the replace method with a callback function
  const updatedHtml = htmlString.replace(regex, replacement);

  return updatedHtml;
}

async function saveRedirectsToFile() {
  const data = await request(endpoint, query, { first: recordsToFetch });
  const redirects = data.redirects;
  const redirectsPath = path.join(__dirname, 'public', '_redirects');
  const lines = redirects.map(({ old_url, new_url, status_code }) => `${old_url} ${new_url} ${status_code}`).join('\n');
  await fs.writeFile(redirectsPath, lines);
  console.log('Saved redirects to _redirects file');
}

// All posts and content to a single file for tailwind styles
async function saveAllContentToFile() {
  //const data = await request(endpoint, query, { first: recordsToFetch });
  const allContentPath = path.join(__dirname, 'assets', 'all-content.html');
  const pages = await fetchAllPages();

  console.log('Replacing icon shortcodes pages...');
  let lines = pages.map(({ content }) => content).join('\n');
  lines = replaceIconClass(lines);
  await fs
    .writeFile(allContentPath, lines)
    .then(() => console.log('Saved all posts to all-content.html file'));

  let pageLines = pages.map(({ content }) => content).join('\n');
  console.log('Replacing icon shortcodes pages...');
  pageLines = replaceIconClass(pageLines);
  await fs
    .writeFile(allContentPath, pageLines)
    .then(() => console.log('Saved all pages to all-content.html file'));

  const posts = await fetchAllPosts();
  const allPostsPath = path.join(__dirname, 'assets', 'all-posts.html');
  let postLines = posts.map(({ content }) => content).join('\n');
  console.log('Replacing icon shortcodes posts...');
  postLines = replaceIconClass(postLines);
  await fs
    .writeFile(allPostsPath, postLines)
    .then(() => console.log('Saved all posts to all-posts.html file'));
  // now save menu icons to a file
  console.log('Menu icons...');
  const menuIcons = await fetchMenuIcons();
  // filter the empty classes
  const menuItemsFormatted = menuIcons.filter(({ cssClasses }) => cssClasses);
  // create an string of all the classes in all the menu items with one class on each line
  const menuClasses = menuItemsFormatted
  .filter(({ cssClasses }) => cssClasses.length > 0) // Skip empty classes
  .map(({ cssClasses }) => {
    let classList = cssClasses.join(' ');
    classList = classList.replace('icon-', 'icon-[') + ']';
    return `<i class="icon ${classList}"></i>`;
  });

  const menuClassesPath = path.join(__dirname, 'assets', 'menu-classes.html');
  await fs
    .writeFile(menuClassesPath, menuClasses)
    .then(() => console.log('Saved menu classes to menu-classes.html file'));
}

async function saveEditorKeyToEnv(editorKey) {
  try {
    if (!editorKey) {
      console.warn('⚠ No editor key found in GraphQL response');
      return;
    }

    const envPath = path.join(process.cwd(), '.env');

    let existingEnv = '';
    try {
      existingEnv = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      console.log('Creating new .env file');
    }

    let lines = existingEnv.split('\n');
    lines = lines.filter(line => !line.trim().startsWith('EDITOR_KEY='));

    lines.push(`EDITOR_KEY=${editorKey}`);

    const content = lines.filter(line => line.trim() !== '' || lines.indexOf(line) < lines.length - 1).join('\n');

    await fs.writeFile(envPath, content + '\n');

    console.log('✓ EDITOR_KEY written to .env file');
  } catch (error) {
    console.error('Failed to write EDITOR_KEY to .env:', error.message);
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    const result = await fetchImageUrls();
    if (result) {
      const { imageUrls, editorKey } = result;

      console.log('Banner Images:', imageUrls.banners.length);
      console.log('Featured Images:', imageUrls.featured.length);
      console.log('Additional Images:', imageUrls.additional.length);
      console.log('Content Images:', imageUrls.content.length);
      console.log('Logos:', imageUrls.logos.length);
      console.log('Gallery Images:', imageUrls.gallery.length);

      // Save editor key to .env
      await saveEditorKeyToEnv(editorKey);

      console.log('Starting image downloads...');
      await downloadAllImages(imageUrls);
      await copyIconsToPublic();
      await fetchAndSavePDFs();
      await fetchAndSaveStyleSheets();
      await saveRedirectsToFile();
      await saveAllContentToFile();
      console.log('All images downloaded successfully');
    }
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
})();
