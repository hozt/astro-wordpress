import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime?.env;
        const editorKey = env?.EDITOR_KEY || import.meta.env.EDITOR_KEY;
        const apiUrl = env?.API_URL || import.meta.env.API_URL; // Add this

        if (!editorKey) {
            console.error('EDITOR_KEY not found');
            return new Response('Server configuration error: EDITOR_KEY missing', { status: 500 });
        }

        if (!apiUrl) {
            console.error('API_URL not found');
            return new Response('Server configuration error: API_URL missing', { status: 500 });
        }

        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = Object.fromEntries(
            cookieHeader.split('; ')
                .filter(c => c.includes('='))
                .map(c => {
                    const [key, ...valueParts] = c.split('=');
                    return [key, valueParts.join('=')];
                })
        );

        if (cookies.adminAuth !== editorKey) {
            return new Response('Unauthorized', { status: 403 });
        }

        const url = new URL(request.url);
        const postId = url.searchParams.get('postId');
        const pageId = url.searchParams.get('pageId');
        const templateId = url.searchParams.get('templateId');
        const galleryId = url.searchParams.get('galleryId');
        const tagId = url.searchParams.get('tagId');
        const categoryId = url.searchParams.get('categoryId');

        const editorUrl = apiUrl + '/wp-admin/'; // Use apiUrl variable
        const editPostUrl = postId ? `${editorUrl}post.php?post=${postId}&action=edit` : null;
        const editPageUrl = pageId ? `${editorUrl}post.php?post=${pageId}&action=edit` : null;
        const editorGallery = galleryId ? `${editorUrl}post.php?post=${galleryId}&action=edit` : null;
        const editTemplateUrl = templateId ? `${editorUrl}post.php?post=${templateId}&action=edit` : null;
        const editTagUrl = tagId ? `${editorUrl}term.php?taxonomy=post_tag&tag_ID=${tagId}&action=edit` : null;
        const editCategoryUrl = categoryId ? `${editorUrl}edit-tags.php?taxonomy=category&tag_ID=${categoryId}&action=edit` : null;
        const editMenuUrl = `${editorUrl}nav-menus.php`;
        const regenerateUrl = `${editorUrl}admin.php?page=custom_webhook`;

        const menuHTML = `
            <li>
                <a href="${editorUrl}" target="_blank" rel="noreferrer">
                <i class="icon-[mdi--view-dashboard] text-lg mr-1" title="Dashboard"></i>
                <span>Dashboard</span>
                </a>
            </li>
            ${editPostUrl ? `<li><a href="${editPostUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Post"></i><span>Edit Post</span></a></li>` : ''}
            ${editPageUrl ? `<li><a href="${editPageUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Page"></i><span>Edit Page</span></a></li>` : ''}
            ${editTagUrl ? `<li><a href="${editTagUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Tags"></i><span>Edit Tags</span></a></li>` : ''}
            ${editCategoryUrl ? `<li><a href="${editCategoryUrl}" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Category"></i><span>Edit Category</span></a></li>` : ''}
            ${editorGallery ? `<li><a href="${editorGallery}" target="_blank" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Gallery"></i><span>Edit Gallery</span></a></li>` : ''}
            ${editTemplateUrl ? `<li><a href="${editTemplateUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--post-it-note-edit] text-lg mr-1" title="Edit Template"></i><span>Edit Template</span></a></li>` : ''}
            <li><a href="${editMenuUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--menu-open] text-lg mr-1" title="Edit Menu"></i><span>Edit Menus</span></a></li>
            <li><a href="${regenerateUrl}" target="_blank" rel="noreferrer"><i class="icon-[mdi--publish] text-lg mr-1" title="Regenerate Site"></i><span>Regenerate Site</span></a></li>
            <li><a href="/logout" rel="noreferrer"><i class="icon-[mdi--logout] text-lg mr-1" title="Logout"></i><span>Logout</span></a></li>
        `;

        return new Response(menuHTML, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error) {
        console.error('Error in admin-menu endpoint:', error);
        return new Response(`Server error: ${error.message}`, { status: 500 });
    }
};
