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
  const navNameEl = document.getElementById('nav-name');
  if (navNameEl) navNameEl.textContent = data.name || '';
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

// ── POSTS (INFINITE SCROLL) ───────────────────────
let currentAlbumFilter = null;
let searchQuery = '';
let postPage = 0;
const POSTS_PER_PAGE = 7;
let hasMorePosts = true;
let fetchingPosts = false;

async function loadPosts(reset = false) {
  if (fetchingPosts || (!hasMorePosts && !reset)) return;
  fetchingPosts = true;

  const container = document.getElementById('posts-container');
  const loader = document.getElementById('infinite-loader');
  const emptySearch = document.getElementById('empty-search');
  
  if (reset) {
    postPage = 0;
    hasMorePosts = true;
    container.innerHTML = '';
    window.allPosts = [];
    if(emptySearch) emptySearch.style.display = 'none';
    if(loader) loader.style.display = 'block';
  }

  let query = db.from('posts').select('*').order('created_at', { ascending: false });
  if (currentAlbumFilter) {
      query = query.eq('album_id', currentAlbumFilter);
  }
  
  const { data: posts, error } = await query.range(postPage * POSTS_PER_PAGE, (postPage + 1) * POSTS_PER_PAGE - 1);
  fetchingPosts = false;
  
  if (error || !posts || posts.length === 0) {
    hasMorePosts = false;
    if(loader) loader.style.display = 'none';
    if (reset && emptySearch) {
         emptySearch.style.display = 'block';
    }
    return;
  }

  hasMorePosts = posts.length === POSTS_PER_PAGE;
  if(loader) loader.style.display = hasMorePosts ? 'block' : 'none';
  
  const publishedPosts = posts.filter(p => p.published !== false);
  
  // local text search filter if needed
  let finalPosts = publishedPosts;
  if (searchQuery) {
     finalPosts = publishedPosts.filter(post => {
        const inC = post.caption?.toLowerCase().includes(searchQuery);
        const inL = post.location?.toLowerCase().includes(searchQuery);
        const inT = post.tags?.some(t => t.toLowerCase().includes(searchQuery));
        return inC || inL || inT;
     });
  }

  if (finalPosts.length > 0) {
      window.allPosts = [...window.allPosts, ...finalPosts];
      appendPosts(finalPosts, postPage * POSTS_PER_PAGE);
  } else if (reset && emptySearch) {
      emptySearch.style.display = 'block';
  }
  postPage++;
}

function appendPosts(posts, offset) {
  const container = document.getElementById('posts-container');
  posts.forEach((post, i) => {
    const div = document.createElement('div');
    div.className = 'post';
    div.style.animationDelay = `${(i % POSTS_PER_PAGE) * 0.05}s`;
    div.onclick = () => openModal(post.id);

    const mediaHTML = buildCarousel(post.media_urls || [], post.media_types || [], post.id);
    const captionHTML = post.caption ? `<div class="post-caption">${post.caption}</div>` : '';
    const tagsHTML = (post.tags?.length > 0)
      ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`
      : '';
    const locationHTML = post.location ? `<span class="post-location">${post.location}</span>` : '';
    const likes = post.likes_count || 0;
    const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';

    div.innerHTML = `
      ${mediaHTML}
      <div class="post-body">
        ${captionHTML}
        ${tagsHTML}
        <div class="post-meta">
            <div class="post-meta-left">
                ${formatDate(post.created_at)}${locationHTML ? ' · ' + locationHTML : ''}
            </div>
            <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post.id}', event)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span class="like-count">${likes}</span>
            </button>
        </div>
      </div>`;
    container.appendChild(div);
  });
}

// Setup Infinite scroll intersection observer
if (typeof IntersectionObserver !== 'undefined') {
   const observer = new IntersectionObserver((entries) => {
       if (entries[0].isIntersecting) {
           loadPosts();
       }
   }, { rootMargin: '400px' });
   const loader = document.getElementById('infinite-loader');
   if (loader) observer.observe(loader);
}

// ── LIKE SYSTEM ───────────────────────────────────
window.likePost = async function(postId, event) {
    event.stopPropagation(); // prevent modal opening
    const btn = event.currentTarget;
    const isLiked = localStorage.getItem(`liked_${postId}`) === 'true';
    const countSpan = btn.querySelector('.like-count');
    const svgIcon = btn.querySelector('svg');
    const post = window.allPosts.find(p => p.id === postId);
    if (!post) return;
    
    if (isLiked) {
        // Unlike action
        localStorage.removeItem(`liked_${postId}`);
        btn.classList.remove('liked');
        svgIcon.style.fill = 'none';
        countSpan.innerText = Math.max(0, parseInt(countSpan.innerText) - 1);
        post.likes_count = Math.max(0, (post.likes_count || 1) - 1);
    } else {
        // Like action
        localStorage.setItem(`liked_${postId}`, 'true');
        btn.classList.add('liked');
        svgIcon.style.fill = 'currentColor';
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        post.likes_count = (post.likes_count || 0) + 1;
    }
    
    // Broadcast the update to the server
    await db.from('posts').update({ likes_count: post.likes_count }).eq('id', postId);
}

// ── SEARCH ────────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    loadPosts(true);
});

// ── PORTFOLIO ─────────────────────────────────────
async function loadPortfolio() {
  const { data: projects } = await db.from('portfolio').select('*').order('sort_order');
  const dCont = document.getElementById('portfolio-container-right');
  const mCont = document.getElementById('portfolio-container-mobile');
  if (!projects || projects.length === 0) return;
  
  if(dCont) dCont.innerHTML = '';
  if(mCont) mCont.innerHTML = '';
  
  projects.forEach(p => {
    const html = `
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.title || ''}" loading="lazy" />` : ''}
      <div class="portfolio-overlay">
        <div class="portfolio-title">${p.title || ''}</div>
        ${p.url ? `<span style="font-size:0.75rem;color:#a0a0a0;">View →</span>` : ''}
      </div>`;
      
    if (dCont) {
        const itemD = document.createElement('div');
        itemD.className = 'portfolio-item';
        itemD.innerHTML = html;
        if (p.url) itemD.onclick = () => window.open(p.url, '_blank');
        dCont.appendChild(itemD);
    }
    if (mCont) {
        const itemM = document.createElement('div');
        itemM.className = 'portfolio-item';
        itemM.innerHTML = html;
        if (p.url) itemM.onclick = () => window.open(p.url, '_blank');
        mCont.appendChild(itemM);
    }
  });
}

// ── ALBUMS (SERIES) ───────────────────────────────
window.openAlbumView = function(albumId, title, desc) {
   currentAlbumFilter = albumId;
   searchQuery = '';
   if(document.getElementById('search-input')) document.getElementById('search-input').value = '';
   
   document.querySelector('.profile-hero').style.display = 'none';
   document.getElementById('album-view-header').style.display = 'block';
   document.getElementById('album-view-title').innerText = title;
   document.getElementById('album-view-desc').innerText = desc || '';
   document.getElementById('feed-title').style.display = 'none';
   
   window.scrollTo({ top: 0, behavior: 'smooth' });
   loadPosts(true);
};

window.clearAlbumView = function() {
   currentAlbumFilter = null;
   document.querySelector('.profile-hero').style.display = 'flex';
   document.getElementById('album-view-header').style.display = 'none';
   document.getElementById('feed-title').style.display = 'block';
   loadPosts(true);
};

async function loadAlbums() {
  const { data: albums } = await db.from('albums').select('*').order('created_at', { ascending: false });
  const dCont = document.getElementById('albums-container-left');
  const mCont = document.getElementById('albums-container-mobile');
  if (!albums || albums.length === 0) return;
  
  if(dCont) dCont.innerHTML = '';
  if(mCont) mCont.innerHTML = '';
  
  albums.forEach(album => {
      const html = `
        <img src="${album.cover_url || ''}" class="album-cover" loading="lazy" />
        <div class="album-info">
            <div class="album-title">${album.title}</div>
            ${album.description ? `<div class="album-desc">${album.description}</div>` : ''}
        </div>
      `;
      if(dCont) {
          const a = document.createElement('a');
          a.className = 'album-card';
          a.href = 'javascript:void(0)';
          a.onclick = (e) => { e.preventDefault(); openAlbumView(album.id, album.title, album.description); };
          a.innerHTML = html;
          dCont.appendChild(a);
      }
      if(mCont) {
          const a = document.createElement('a');
          a.className = 'album-card';
          a.href = '#feed'; // jump to top on mobile
          a.onclick = () => { openAlbumView(album.id, album.title, album.description); };
          a.innerHTML = html;
          mCont.appendChild(a);
      }
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
    const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';
    
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
            
            <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post.id}', event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
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
