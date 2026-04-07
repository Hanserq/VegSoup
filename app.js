// ── CONFIG ────────────────────────────────────────
const SUPABASE_URL  = 'https://jvjtlslmzudczakxqkeu.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2anRsc2xtenVkY3pha3hxa2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE1NTQsImV4cCI6MjA5MTA3NzU1NH0.YWqq2QmRLMD60CDR2xxqitiUpIdb-qxl7A0O4xi7WVA';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

window.allPosts = [];

// ── UTILS ─────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildCarousel(mediaUrls, mediaTypes, postId) {
  if (!mediaUrls || mediaUrls.length === 0) return '';
  let html = `<div class="post-media-wrapper">`;
  html += `<div class="post-media" id="media-${postId}" onscroll="updateSlider('${postId}', ${mediaUrls.length})">`;
  mediaUrls.forEach((url, i) => {
    html += `<div class="media-slide">`;
    if (mediaTypes[i] === 'video') {
      html += `<video src="${url}" controls playsinline muted></video>`;
    } else {
      html += `<img src="${url}" alt="" loading="lazy" />`;
    }
    html += `</div>`;
  });
  html += `</div>`;
  
  if (mediaUrls.length > 1) {
    html += `<span class="media-count" id="count-${postId}">1 / ${mediaUrls.length}</span>`;
    html += `<div class="carousel-controls">`;
    mediaUrls.forEach((_, i) => {
      html += `<button class="carousel-dot${i === 0 ? ' active' : ''}" id="dot-${postId}-${i}" onclick="scrollToSlide('${postId}', ${i}, event)"></button>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

window.updateSlider = function(postId, total) {
  const slider = document.getElementById(`media-${postId}`);
  if (!slider) return;
  const slideIndex = Math.round(slider.scrollLeft / slider.clientWidth);
  const countEl = document.getElementById(`count-${postId}`);
  if (countEl) countEl.innerText = `${slideIndex + 1} / ${total}`;
  for (let i = 0; i < total; i++) {
      const dot = document.getElementById(`dot-${postId}-${i}`);
      if(dot) dot.classList.toggle('active', i === slideIndex);
  }
};

window.scrollToSlide = function(postId, index, event) {
    if(event) event.stopPropagation();
    const slider = document.getElementById(`media-${postId}`);
    if (!slider) return;
    slider.scrollTo({ left: index * slider.clientWidth, behavior: 'smooth' });
};

// ── PROFILE ───────────────────────────────────────
async function loadProfile() {
  const { data } = await db.from('profile').select('*').eq('id', 1).single();
  if (!data) return;

  document.title = data.name || 'My Site';
  document.getElementById('nav-name').textContent   = data.name || '';
  document.getElementById('profile-name').textContent  = data.name || '';
  document.getElementById('profile-tagline').textContent = data.tagline || '';
  document.getElementById('profile-about').textContent  = data.about || '';
  document.getElementById('footer-name').textContent   = `© ${new Date().getFullYear()} ${data.name || ''}`;

  const avatarEl = document.getElementById('avatar-el');
  if (data.avatar_url) {
    avatarEl.innerHTML = `<img src="${data.avatar_url}" alt="${data.name}" />`;
  } else {
    avatarEl.textContent = (data.name || 'C')[0].toUpperCase();
  }
}

// ── POSTS ─────────────────────────────────────────
async function loadPosts() {
  const container = document.getElementById('posts-container');
  const { data: posts, error } = await db.from('posts').select('*').order('created_at', { ascending: false });
  if (error || !posts || posts.length === 0) {
    container.innerHTML = '<div class="loading">No posts yet.</div>';
    return;
  }
  
  // Filter for published = true (falling back to true if null like before)
  window.allPosts = posts.filter(p => p.published !== false);
  renderPosts(window.allPosts);
}

function renderPosts(posts) {
  const container = document.getElementById('posts-container');
  const emptySearch = document.getElementById('empty-search');
  
  if(posts.length === 0) {
      container.innerHTML = '';
      emptySearch.style.display = 'block';
      return;
  }
  
  emptySearch.style.display = 'none';
  container.innerHTML = '';
  
  posts.forEach((post, i) => {
    const div = document.createElement('div');
    div.className = 'post';
    div.style.animationDelay = `${i * 0.05}s`;
    div.onclick = () => openModal(post.id);

    const mediaHTML = buildCarousel(post.media_urls || [], post.media_types || [], post.id);
    const captionHTML = post.caption ? `<div class="post-caption">${post.caption}</div>` : '';
    const tagsHTML = (post.tags?.length > 0)
      ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`
      : '';
    const locationHTML = post.location ? `<span class="post-location">${post.location}</span>` : '';
    const likes = post.likes_count || 0;

    div.innerHTML = `
      ${mediaHTML}
      <div class="post-body">
        ${captionHTML}
        ${tagsHTML}
        <div class="post-meta">
            <div class="post-meta-left">
                ${formatDate(post.created_at)}${locationHTML ? ' · ' + locationHTML : ''}
            </div>
            <button class="like-btn" onclick="likePost('${post.id}', event)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span class="like-count">${likes}</span>
            </button>
        </div>
      </div>`;
    container.appendChild(div);
  });
}

// ── LIKE SYSTEM ───────────────────────────────────
window.likePost = async function(postId, event) {
    event.stopPropagation(); // prevent modal opening
    const btn = event.currentTarget;
    if(btn.classList.contains('liked')) return;
    
    // Optimistic UI update
    btn.classList.add('liked');
    btn.querySelector('svg').style.fill = 'currentColor'; // solid fill
    const countSpan = btn.querySelector('.like-count');
    countSpan.innerText = parseInt(countSpan.innerText) + 1;
    
    const post = window.allPosts.find(p => p.id === postId);
    if(post) {
        post.likes_count = (post.likes_count || 0) + 1;
        // Supabase basic update
        await db.from('posts').update({ likes_count: post.likes_count }).eq('id', postId);
    }
}

// ── SEARCH ────────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if(!q) return renderPosts(window.allPosts); // reset
    
    const filtered = window.allPosts.filter(post => {
        const inCaption = post.caption?.toLowerCase().includes(q);
        const inLoc = post.location?.toLowerCase().includes(q);
        const inTags = post.tags?.some(t => t.toLowerCase().includes(q));
        return inCaption || inLoc || inTags;
    });
    renderPosts(filtered);
});

// ── PORTFOLIO ─────────────────────────────────────
async function loadPortfolio() {
  const { data: projects } = await db.from('portfolio').select('*').order('sort_order');
  const container = document.getElementById('portfolio-container');
  if (!projects || projects.length === 0) return;
  container.innerHTML = '';
  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'portfolio-item';
    item.innerHTML = `
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.title || ''}" loading="lazy" />` : ''}
      <div class="portfolio-overlay">
        <div class="portfolio-title">${p.title || ''}</div>
        ${p.url ? `<a href="${p.url}" target="_blank" style="font-size:0.75rem;color:#a0a0a0;">View →</a>` : ''}
      </div>`;
    if (p.url) item.onclick = () => window.open(p.url, '_blank');
    container.appendChild(item);
  });
}

// ── ALBUMS (SERIES) ───────────────────────────────
async function loadAlbums() {
  const { data: albums } = await db.from('albums').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('albums-container');
  if (!albums || albums.length === 0) return;
  
  container.innerHTML = '';
  albums.forEach(album => {
      const a = document.createElement('a');
      a.className = 'album-card';
      a.href = '#feed'; // simple scroll tracking for now
      a.onclick = () => {
         // when clicked, filter search by album id!
         document.getElementById('search-input').value = ''; 
         const filtered = window.allPosts.filter(p => p.album_id === album.id);
         renderPosts(filtered);
      };
      a.innerHTML = `
        <img src="${album.cover_url || ''}" class="album-cover" loading="lazy" />
        <div class="album-info">
            <div class="album-title">${album.title}</div>
            ${album.description ? `<div class="album-desc">${album.description}</div>` : ''}
        </div>
      `;
      container.appendChild(a);
  });
}

// ── MODAL ─────────────────────────────────────────
window.openModal = function(postId) {
    const post = window.allPosts.find(p => p.id === postId);
    if(!post) return;
    
    const modal = document.getElementById('post-modal');
    const mediaPane = document.getElementById('modal-media');
    const infoPane = document.getElementById('modal-info');
    
    // Inject Media
    const hasMedia = post.media_urls && post.media_urls.length > 0;
    if(hasMedia) {
        mediaPane.style.display = 'flex';
        mediaPane.innerHTML = buildCarousel(post.media_urls, post.media_types, `modal-${postId}`);
    } else {
        mediaPane.style.display = 'none'; // Takes full width
    }
    
    // Inject Info
    const captionHTML = post.caption ? `<div class="post-caption" style="-webkit-line-clamp: unset; white-space: pre-wrap;">${post.caption}</div>` : '';
    const tagsHTML = (post.tags?.length > 0) ? `<div class="post-tags" style="margin-top: 1rem;">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : '';
    const locationHTML = post.location ? `<span class="post-location">${post.location}</span>` : '';
    const likes = post.likes_count || 0;
    
    infoPane.innerHTML = `
        <div style="display:flex; align-items:center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
            <div class="avatar" style="width: 40px; height: 40px; font-size: 1rem;">${document.getElementById('avatar-el').innerHTML}</div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${document.getElementById('profile-name').innerText}</div>
                <div style="font-size: 0.75rem; color: var(--text-2);">${formatDate(post.created_at)}</div>
            </div>
        </div>
        
        ${captionHTML}
        ${tagsHTML}
        
        <div style="margin-top: auto; padding-top: 2rem;">
            ${locationHTML ? `<div style="font-size: 0.8rem; color: var(--text-2); margin-bottom: 1rem;">📍 ${post.location}</div>` : ''}
            
            <button class="like-btn" onclick="likePost('${post.id}', event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span class="like-count" style="font-size: 0.9rem;">${likes}</span>
            </button>
        </div>
    `;
    
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

window.closeModal = function() {
    document.getElementById('post-modal').classList.remove('open');
    document.body.style.overflow = '';
}

// Esc key to close modal
document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeModal();
});

// ── INIT ──────────────────────────────────────────
Promise.all([
    loadProfile(), 
    loadPosts(), 
    loadPortfolio().catch(() => {}),
    loadAlbums().catch(() => {})
]);
