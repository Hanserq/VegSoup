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

function buildCarousel(mediaUrls, mediaTypes, postId, audioUrl, audioLoop) {
  if (!mediaUrls || mediaUrls.length === 0) return '';
  let html = `<div class="post-media-wrapper">`;
  html += `<div class="post-media" id="media-${postId}" onscroll="updateSlider('${postId}', ${mediaUrls.length})">`;
  mediaUrls.forEach((url, i) => {
    html += `<div class="media-slide">`;
    if (mediaTypes[i] === 'video') {
      html += `
        <div class="custom-video-wrapper" onclick="toggleVideoState(this, event)">
          <video src="${url}" playsinline loop class="feed-video" preload="metadata" onplay="window.onVideoPlay(this)" onpause="window.onVideoPause(this)"></video>
          <div class="video-play-icon" style="display: none;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <button class="video-mute-toggle" onclick="toggleVideoMute(this, event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-unmute"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
        </div>`;
    } else {
      html += `<img src="${url}" alt="" loading="lazy" />`;
    }
    html += `</div>`;
  });
  html += `</div>`;
  
  // Attach background audio and mute toggle if audio exists
  if (audioUrl && !mediaTypes.includes('video')) {
    html += `
      <audio src="${audioUrl}" class="feed-video feed-bg-audio" ${audioLoop !== false ? 'loop' : ''} preload="metadata"></audio>
      <button class="video-mute-toggle audio-bg-mute" onclick="toggleVideoMute(this, event)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-unmute"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
    `;
  }
  
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
  
  const controls = slider.parentElement.querySelector('.carousel-controls');
  if (controls) {
      // Show dots on slide, fade out after 2s of inactivity
      controls.classList.add('visible');
      clearTimeout(controls.hideTimeout);
      controls.hideTimeout = setTimeout(() => {
          controls.classList.remove('visible');
      }, 2000);
      
      const dots = controls.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => dot.classList.toggle('active', i === slideIndex));
  }
};

window.scrollToSlide = function(postId, index, event) {
    if(event) event.stopPropagation();
    const slider = document.getElementById(`media-${postId}`);
    if (!slider) return;
    slider.scrollTo({ left: index * slider.clientWidth, behavior: 'smooth' });
};

// ── PROFILE ───────────────────────────────────────
let _profileData = null;

async function loadProfile() {
  const { data } = await db.from('profile').select('*').eq('id', 1).single();
  if (!data) return;
  _profileData = data;

  document.title = data.name || 'My Site';

  // Nav logo
  const navLogoEl = document.getElementById('nav-logo-link');
  if (navLogoEl) navLogoEl.textContent = data.name || '';

  // Hero
  const nameEl = document.getElementById('profile-name');
  const taglineEl = document.getElementById('profile-tagline');
  const aboutShortEl = document.getElementById('profile-about-short');
  if (nameEl) nameEl.textContent = data.name || '';
  if (taglineEl) taglineEl.textContent = data.tagline || '';
  if (aboutShortEl) aboutShortEl.textContent = data.about ? data.about.slice(0, 100) + (data.about.length > 100 ? '…' : '') : '';

  // Footer
  const footerEl = document.getElementById('footer-name');
  if (footerEl) footerEl.textContent = `© ${new Date().getFullYear()} ${data.name || ''}`;

  // Avatar
  const avatarEl = document.getElementById('avatar-el');
  if (avatarEl) {
    if (data.avatar_url) {
      avatarEl.innerHTML = `<img src="${data.avatar_url}" alt="${data.name}" />`;
    } else {
      avatarEl.textContent = (data.name || 'C')[0].toUpperCase();
    }
  }

  // ── Apply appearance settings ────────────────────
  const root = document.documentElement;
  if (data.accent_color) {
    root.style.setProperty('--accent', data.accent_color);
    // Compute RGB components for glow effects
    const hex = data.accent_color.replace('#','');
    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);
    if (!isNaN(r)) {
      root.style.setProperty('--accent-rgb', `${r},${g},${b}`);
      root.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.10)`);
      root.style.setProperty('--accent-glow', `0 0 24px rgba(${r},${g},${b},0.22)`);
    }
  }

  // Apply theme options (card radius, bg preset, font pairing)
  const opts = data.theme_options || {};
  if (opts.card_radius) {
    root.style.setProperty('--radius', opts.card_radius + 'px');
    root.style.setProperty('--radius-lg', (parseInt(opts.card_radius) + 8) + 'px');
    root.style.setProperty('--radius-xl', (parseInt(opts.card_radius) + 14) + 'px');
  }
  const bgPresets = {
    dark: '#09090f', midnight: '#05050f', warm: '#0d0b07', black: '#000000'
  };
  if (opts.bg_preset && bgPresets[opts.bg_preset]) {
    root.style.setProperty('--bg', bgPresets[opts.bg_preset]);
  } else if (data.site_bg_color) {
    root.style.setProperty('--bg', data.site_bg_color);
  }

  // Inject Outfit font if not already present and font_pair requires it
  if (opts.font_pair === 'mono') {
    root.style.setProperty('--font-display', `'JetBrains Mono', 'Fira Code', monospace`);
  } else if (opts.font_pair === 'serif') {
    root.style.setProperty('--font-display', `'Georgia', 'Times New Roman', serif`);
  }

  // Show mobile search button on narrow viewports
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const desktopSearch = document.getElementById('search-input');
  function syncSearchVisibility() {
    const isMobile = window.innerWidth <= 768;
    if (mobileSearchBtn) mobileSearchBtn.style.display = isMobile ? 'flex' : 'none';
    if (desktopSearch) desktopSearch.style.display = isMobile ? 'none' : '';
  }
  syncSearchVisibility();
  window.addEventListener('resize', syncSearchVisibility);

  if (data.feed_bg_url) {
    document.body.style.backgroundImage    = `url(${data.feed_bg_url})`;
    document.body.style.backgroundSize     = 'cover';
    document.body.style.backgroundPosition = data.feed_bg_url_pos || 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat  = 'no-repeat';
  } else {
    document.body.style.backgroundImage = '';
  }

  const coverLayer = document.getElementById('profile-cover-layer');
  const heroEl     = document.getElementById('profile-hero');
  if (coverLayer) {
    if (data.cover_url) {
      coverLayer.style.backgroundImage    = `url(${data.cover_url})`;
      coverLayer.style.backgroundPosition = data.cover_url_pos || 'center';
      heroEl?.classList.add('has-cover');
    } else {
      coverLayer.style.backgroundImage = '';
      heroEl?.classList.remove('has-cover');
    }
  }

  // ── Render About page ────────────────────────────
  renderAboutPage(data);

  // ── Render Hobbies page ──────────────────────────
  renderHobbiesPage(data.hobbies || []);
}

function renderAboutPage(data) {
  const cont = document.getElementById('about-content');
  if (!cont) return;
  const avatarHTML = data.avatar_url
    ? `<img src="${data.avatar_url}" alt="${data.name || ''}" />`
    : `<span>${(data.name || 'H')[0].toUpperCase()}</span>`;
  cont.innerHTML = `
    <div class="about-hero">
      <div class="about-avatar-lg">${avatarHTML}</div>
      <div class="about-hero-text">
        <div class="about-name">${data.name || ''}</div>
        <div class="about-tagline">${data.tagline || ''}</div>
      </div>
    </div>
    ${data.about ? `
    <div class="about-bio-block">
      <div class="about-bio-label">About</div>
      <div class="about-bio-text">${data.about}</div>
    </div>` : ''}
  `;
}

function renderHobbiesPage(hobbies) {
  const cont = document.getElementById('hobbies-container');
  const empty = document.getElementById('hobbies-empty');
  if (!cont) return;
  if (!hobbies || hobbies.length === 0) {
    cont.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    return;
  }
  cont.innerHTML = hobbies.map(h => `
    <div class="hobby-card">
      <div class="hobby-emoji">${h.emoji || '✨'}</div>
      <div class="hobby-name">${h.name || ''}</div>
      ${h.description ? `<div class="hobby-desc">${h.description}</div>` : ''}
    </div>
  `).join('');
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
    if (emptySearch) emptySearch.style.display = 'none';
    if (loader) loader.style.display = 'block';
  }

  // Sort pinned first, then newest
  let query = db.from('posts').select('*')
    .eq('published', true)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (currentAlbumFilter) query = query.eq('album_id', currentAlbumFilter);

  const { data: posts, error } = await query.range(postPage * POSTS_PER_PAGE, (postPage + 1) * POSTS_PER_PAGE - 1);
  fetchingPosts = false;

  if (error || !posts || posts.length === 0) {
    hasMorePosts = false;
    if (loader) loader.style.display = 'none';
    if (reset && window.allPosts.length === 0 && emptySearch) emptySearch.style.display = 'block';
    return;
  }

  hasMorePosts = posts.length === POSTS_PER_PAGE;
  if (loader) loader.style.display = hasMorePosts ? 'block' : 'none';

  let finalPosts = posts;
  if (searchQuery) {
    finalPosts = posts.filter(post => {
      const inC = post.caption?.toLowerCase().includes(searchQuery);
      const inL = post.location?.toLowerCase().includes(searchQuery);
      const inT = post.tags?.some(t => t.toLowerCase().includes(searchQuery));
      return inC || inL || inT;
    });
  }

  if (finalPosts.length > 0) {
    window.allPosts = [...window.allPosts, ...finalPosts];
    appendGridPosts(finalPosts);
    if (postPage === 0) checkDeepLink();
  } else if (reset && emptySearch) {
    emptySearch.style.display = 'block';
  }
  postPage++;
}

// ── LINKIFY ───────────────────────────────────────
// Converts URLs in plain text into clickable <a> tags
function linkify(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  return text.replace(urlRegex, (url) => {
    // Trim trailing punctuation that's likely not part of the URL
    const trimmed = url.replace(/[.,;!?)]+$/, '');
    return `<a href="${trimmed}" target="_blank" rel="noopener noreferrer" class="caption-link" onclick="event.stopPropagation()">${trimmed}</a>`;
  });
}

function appendGridPosts(posts) {
  // Ensure grid wrapper exists
  let grid = document.getElementById('posts-grid');
  if (!grid) {
    const container = document.getElementById('posts-container');
    grid = document.createElement('div');
    grid.id = 'posts-grid';
    grid.className = 'posts-photo-grid';
    container.appendChild(grid);
  }

  posts.forEach((post, i) => {
    const cell = document.createElement('div');
    cell.className = 'photo-grid-cell';
    cell.style.animationDelay = `${(i % POSTS_PER_PAGE) * 0.04}s`;
    cell.setAttribute('role', 'button');
    cell.tabIndex = 0;
    cell.onclick = () => openModal(post.id);
    cell.onkeydown = e => { if (e.key === 'Enter') openModal(post.id); };

    const thumb = post.media_urls?.[0];
    const isVideo = post.media_types?.[0] === 'video';
    const isMulti = post.media_urls?.length > 1;
    const isPinned = post.is_pinned;

    let inner = '';
    if (thumb) {
      if (isVideo) {
        inner += `<video src="${thumb}" class="grid-cell-thumb" muted playsinline preload="none"></video>`;
      } else {
        inner += `<img src="${thumb}" alt="" class="grid-cell-thumb" loading="lazy" />`;
      }
    } else {
      inner += `<div class="grid-cell-text-thumb">${post.caption ? post.caption.slice(0, 80) : ''}</div>`;
    }

    // Badges
    let badges = '';
    if (isPinned) badges += `<span class="grid-cell-badge pin">📌</span>`;
    if (isMulti)  badges += `<span class="grid-cell-badge multi"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="2" y="7" width="15" height="15" rx="2"/><path d="M17 2h2a2 2 0 0 1 2 2v2" stroke="white" stroke-width="2" fill="none"/></svg></span>`;
    if (isVideo && !isMulti) badges += `<span class="grid-cell-badge video"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>`;

    cell.innerHTML = inner + (badges ? `<div class="grid-cell-badges">${badges}</div>` : '');
    grid.appendChild(cell);

    // Observe for autoplay if video
    if (isVideo && window.feedVideoObserver) {
      cell.querySelectorAll('video').forEach(v => window.feedVideoObserver.observe(v));
    }
  });
}

// Keep appendPosts as legacy (used nowhere now but safe to keep)
function appendPosts(posts, offset) {
  appendGridPosts(posts);
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

   // ── INSTAGRAM VIDEO CONTROLS & AUTOPLAY ───────────────
   window.globalVideoMuted = true; // Mobile OS default enforces muted auto-play 

   window.feedVideoObserver = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
           const video = entry.target;
           // If video is inside the open modal, let the modal logic handle it
           if (video.closest('#post-modal')) return; 
           
           if (entry.isIntersecting) {
               video.muted = window.globalVideoMuted;
               window.updateVideoMuteIcon(video, window.globalVideoMuted);

               const p = video.play();
               if (p !== undefined) {
                   p.catch(err => {
                       // Silent fallback: Mobile blocks unmuted autoplay without interaction
                       window.globalVideoMuted = true;
                       video.muted = true;
                       window.updateVideoMuteIcon(video, true);
                       video.play().catch(() => {});
                   });
               }
           } else {
               video.pause();
           }
       });
   }, { threshold: 0.5 });
}


// ── INSTAGRAM VIDEO CONTROLS ───────────────────────
window.onVideoPlay = function(video) {
    // Hide the play icon
    const playIcon = video.parentElement.querySelector('.video-play-icon');
    if (playIcon) playIcon.style.display = 'none';

    // Pause all other feed videos
    document.querySelectorAll('.feed-video').forEach(v => {
        if (v !== video && !v.paused) v.pause();
    });
};

window.onVideoPause = function(video) {
    // Show the play icon
    const playIcon = video.parentElement.querySelector('.video-play-icon');
    if (playIcon) playIcon.style.display = 'flex';
};

window.toggleVideoState = function(el, e) {
    // Only toggle play/pause if the click was not on the mute button
    if (e && e.target.closest('.video-mute-toggle')) return;
    
    const video = el.querySelector('video');
    if (!video) return;

    if (video.paused) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }
};

window.updateVideoMuteIcon = function(media, isMuted) {
    const btn = media.parentElement.querySelector('.video-mute-toggle');
    if (!btn) return;
    if (isMuted) {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-mute"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    } else {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-unmute"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    }
};

window.toggleVideoMute = function(btn, e) {
    if(e) e.stopPropagation();
    
    let wrapper, media;
    if (btn.classList.contains('audio-bg-mute')) {
        wrapper = btn.closest('.post-media-wrapper');
        media = wrapper ? wrapper.querySelector('.feed-bg-audio') : null;
    } else {
        wrapper = btn.closest('.custom-video-wrapper');
        media = wrapper ? wrapper.querySelector('video') : null;
    }
    
    if (!media) return;

    // Toggle local mute
    media.muted = !media.muted;
    
    // Update global reference so the rest of the feed matches this user's preference
    window.globalVideoMuted = media.muted;
    
    // Update all matching current media on screen to the new preference
    document.querySelectorAll('.feed-video').forEach(v => {
        v.muted = window.globalVideoMuted;
        window.updateVideoMuteIcon(v, window.globalVideoMuted);
    });
};

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
        await db.rpc('decrement_like', { post_id: postId });
    } else {
        // Like action
        localStorage.setItem(`liked_${postId}`, 'true');
        btn.classList.add('liked');
        svgIcon.style.fill = 'currentColor';
        if (window.triggerHaptic) window.triggerHaptic('heart');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
        post.likes_count = (post.likes_count || 0) + 1;
        await db.rpc('increment_like', { post_id: postId });
    }
}

// ── SEARCH ────────────────────────────────────────
let playgroundActive = false;
let pgAudio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3'); 
pgAudio.loop = true;

function handleCheatAttempt(e) {
    const val = e.target.value.toLowerCase().trim();
    if (val === 'gravity' && !playgroundActive) {
        initPlayground();
        e.target.value = ''; // clear it
        return true;
    }
    return false;
}

document.getElementById('search-input')?.addEventListener('input', (e) => {
    if (handleCheatAttempt(e)) return;
    searchQuery = e.target.value.toLowerCase().trim();
    loadPosts(true);
});

// Mobile search also needs cheat detection
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mobile-search-input')?.addEventListener('input', (e) => {
        if (handleCheatAttempt(e)) return;
    });
});

// ── PLAYGROUND MODE (CHEATS) ──────────────────────
let pgEngine, pgRender, pgRunner;
let pgTimerInterval;

window.initPlayground = function() {
    if (playgroundActive) return;
    playgroundActive = true;

    // Show Notification
    const notif = document.getElementById('cheat-notification');
    if (notif) {
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 3000);
    }

    // Play Music
    pgAudio.currentTime = 0;
    pgAudio.play().catch(() => {});

    // Show Overlay
    const overlay = document.getElementById('playground-overlay');
    overlay.classList.add('active');

    // Setup Matter.js
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;
    pgEngine = Engine.create();
    const container = document.getElementById('playground-canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    pgRender = Render.create({
        element: container,
        engine: pgEngine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent'
        }
    });

    Render.run(pgRender);
    pgRunner = Runner.create();
    Runner.run(pgRunner, pgEngine);

    // Context boundaries (ground, walls)
    const wallThick = 60;
    const ground = Bodies.rectangle(width/2, height + wallThick/2, width, wallThick, { isStatic: true });
    const leftWall = Bodies.rectangle(-wallThick/2, height/2, wallThick, height, { isStatic: true });
    const rightWall = Bodies.rectangle(width + wallThick/2, height/2, wallThick, height, { isStatic: true });
    const ceiling = Bodies.rectangle(width/2, -wallThick/2, width, wallThick, { isStatic: true });
    Composite.add(pgEngine.world, [ground, leftWall, rightWall, ceiling]);

    // Objects from posts
    const posts = window.allPosts || [];
    const limit = Math.min(posts.length, 15);
    for (let i = 0; i < limit; i++) {
        const p = posts[i];
        const imgUrl = (p.media_urls && p.media_urls[0]) || '';
        const size = 120 + Math.random() * 40;
        const box = Bodies.rectangle(
            Math.random() * width, 
            -100 - (i * 100), 
            size, size, 
            {
                render: {
                    sprite: { texture: imgUrl, xScale: size/400, yScale: size/400 } // rough scale
                },
                restitution: 0.6
            }
        );
        // If image sprite fails, it will just be a gray box, but we can't easily check load here
        Composite.add(pgEngine.world, box);
    }

    // Skill objects (Text boxes with readable labels)
    const skills = ['Javascript', 'React', 'HTML5', 'CSS3', 'Node.js', 'Git', 'Terminal', 'Python', 'UI/UX'];
    skills.forEach((s, idx) => {
        const sw = s.length * 10 + 30; // Better width calculation
        const box = Bodies.rectangle(Math.random() * width, -500 - (idx * 50), sw, 40, {
            chamfer: { radius: 10 },
            render: {
                fillStyle: '#7c3aed',
                strokeStyle: '#ffffff',
                lineWidth: 2
            },
            restitution: 0.5,
            density: 0.002,
            friction: 0.1,
            label: s, // Store label for custom rendering
            isSkill: true
        });
        Composite.add(pgEngine.world, box);
    });

    // Custom Rendering for Text and Labels
    Matter.Events.on(pgRender, 'afterRender', () => {
        const context = pgRender.context;
        const bodies = Composite.allBodies(pgEngine.world);

        context.save();
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        bodies.forEach(body => {
            if (body.isSkill) {
                const { x, y } = body.position;
                context.translate(x, y);
                context.rotate(body.angle);
                context.fillStyle = '#ffffff';
                context.fillText(body.label, 0, 0);
                context.setTransform(1, 0, 0, 1, 0, 0); 
            }
        });
        context.restore();
    });

    // Interaction
    const mouse = Mouse.create(pgRender.canvas);
    const mouseConstraint = MouseConstraint.create(pgEngine, {
        mouse: mouse,
        constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Composite.add(pgEngine.world, mouseConstraint);
    pgRender.mouse = mouse;

    // Timer (5 minutes)
    let timeLeft = 300;
    const timerEl = document.getElementById('playground-countdown');
    pgTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            stopPlayground();
            return;
        }
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        if (timerEl) timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);

    // Handle Resize
    window.addEventListener('resize', handlePgResize);
};

function handlePgResize() {
    if (!playgroundActive || !pgRender) return;
    pgRender.canvas.width = window.innerWidth;
    pgRender.canvas.height = window.innerHeight;
}

window.stopPlayground = function() {
    if (!playgroundActive) return;
    playgroundActive = false;

    // Stop Music
    pgAudio.pause();

    // Cleanup
    clearInterval(pgTimerInterval);
    window.removeEventListener('resize', handlePgResize);
    
    // Matter cleanup
    Matter.Render.stop(pgRender);
    Matter.Runner.stop(pgRunner);
    Matter.Engine.clear(pgEngine);
    pgRender.canvas.remove();
    pgRender.canvas = null;
    pgRender.context = null;
    pgRender.textures = {};

    // Restore UI
    const overlay = document.getElementById('playground-overlay');
    overlay.classList.remove('active');
    
    // Clear search
    const input = document.getElementById('search-input');
    if (input) input.value = '';
};

// ── PORTFOLIO ─────────────────────────────────────
async function loadPortfolio() {
  const { data: projects } = await db.from('portfolio').select('*').order('sort_order');
  const cont = document.getElementById('portfolio-container-page');
  const empty = document.getElementById('portfolio-empty-page');
  if (!projects || projects.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (cont) cont.innerHTML = '';
  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'portfolio-card';
    if (p.url) { card.style.cursor = 'pointer'; card.onclick = () => window.open(p.url, '_blank'); }
    card.innerHTML = `
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.title || ''}" loading="lazy" />` : `<div class="portfolio-card-no-img">${p.title || ''}</div>`}
      <div class="portfolio-card-overlay">
        <div class="portfolio-card-title">${p.title || ''}</div>
        ${p.url ? `<div class="portfolio-card-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> View</div>` : ''}
      </div>`;
    if (cont) cont.appendChild(card);
  });
}

// ── ALBUMS ────────────────────────────────────────
window.openAlbumView = function(albumId, title, desc) {
   currentAlbumFilter = albumId;
   searchQuery = '';
   const searchInput = document.getElementById('search-input');
   if (searchInput) searchInput.value = '';

   navigateTo('home');

   const heroEl = document.querySelector('.profile-hero');
   if (heroEl) heroEl.style.display = 'none';
   const headerEl = document.getElementById('album-view-header');
   if (headerEl) headerEl.style.display = 'block';
   document.getElementById('album-view-title').innerText = title;
   document.getElementById('album-view-desc').innerText = desc || '';
   const feedTitle = document.getElementById('feed-title');
   if (feedTitle) feedTitle.style.display = 'none';

   window.scrollTo({ top: 0, behavior: 'smooth' });
   loadPosts(true);
};

window.clearAlbumView = function() {
   currentAlbumFilter = null;
   const heroEl = document.querySelector('.profile-hero');
   if (heroEl) heroEl.style.display = '';
   const headerEl = document.getElementById('album-view-header');
   if (headerEl) headerEl.style.display = 'none';
   const feedTitle = document.getElementById('feed-title');
   if (feedTitle) feedTitle.style.display = 'block';
   loadPosts(true);
};

async function loadAlbums() {
  const { data: albums } = await db.from('albums').select('*').order('created_at', { ascending: false });
  const cont = document.getElementById('albums-container-page');
  const emptyEl = document.getElementById('albums-empty');
  if (!albums || albums.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (cont) cont.innerHTML = '';
  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.onclick = () => openAlbumView(album.id, album.title, album.description);
    card.onkeydown = (e) => { if (e.key === 'Enter') card.click(); };
    card.innerHTML = `
      ${album.cover_url
        ? `<img src="${album.cover_url}" alt="${album.title}" loading="lazy" />`
        : `<div class="album-card-no-img"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>`
      }
      <div class="album-card-overlay">
        <div class="album-card-title">${album.title}</div>
      </div>`;
    if (cont) cont.appendChild(card);
  });
}

// ── MODAL ─────────────────────────────────────────
let _modalAudio = null; // currently playing audio element

window.openModal = function(postId) {
    const post = window.allPosts.find(p => p.id === postId);
    if(!post) return;
    
    const modal = document.getElementById('post-modal');
    const mediaPane = document.getElementById('modal-media');
    const infoPane = document.getElementById('modal-info');
    
    // Stop any previous audio
    if (_modalAudio) { _modalAudio.pause(); _modalAudio.src = ''; _modalAudio = null; }
    
    const shareUrl = `${location.origin}${location.pathname}#post/${postId}`;
    
    // Inject Media
    const hasMedia = post.media_urls && post.media_urls.length > 0;
    if(hasMedia) {
        mediaPane.style.display = 'flex';
        mediaPane.innerHTML = buildCarousel(post.media_urls, post.media_types, `modal-${postId}`);
    } else {
        mediaPane.style.display = 'none';
    }

    // Audio — play button approach (no autoplay)
    // _modalAudio is created but NOT played yet
    if (post.audio_url) {
        _modalAudio = new Audio(post.audio_url);
        _modalAudio.loop = post.audio_loop !== false;
        _modalAudio.muted = false;
        let audioPlaying = false;

        // Helper: show mute button (swap in after play starts)
        function showMuteBtn(target) {
            const old = document.getElementById('modal-mute-btn');
            if (old) old.remove();
            const muteBtn = document.createElement('button');
            muteBtn.className = 'audio-mute-btn';
            muteBtn.id = 'modal-mute-btn';
            const isMuted = localStorage.getItem('postAudioMuted') === 'true';
            _modalAudio.muted = isMuted;
            muteBtn.innerHTML = isMuted ? muteOffSVG() : muteOnSVG();
            muteBtn.title = isMuted ? 'Unmute' : 'Mute';
            muteBtn.onclick = (e) => {
                e.stopPropagation();
                const nowMuted = !_modalAudio.muted;
                _modalAudio.muted = nowMuted;
                localStorage.setItem('postAudioMuted', nowMuted);
                muteBtn.innerHTML = nowMuted ? muteOffSVG() : muteOnSVG();
                muteBtn.title = nowMuted ? 'Unmute' : 'Mute';
            };
            target.style.position = 'relative';
            target.appendChild(muteBtn);
        }

        // Helper: play audio and swap play button → mute button
        function startAudio(playBtn, muteTarget) {
            _modalAudio.play().catch(() => {});
            audioPlaying = true;
            playBtn.remove();
            showMuteBtn(muteTarget);
            // Coordinate with any videos in the carousel
            wireVideoAudio();
        }

        if (hasMedia) {
            // Centered play button over the media
            const playBtn = document.createElement('button');
            playBtn.className = 'audio-play-btn';
            playBtn.id = 'modal-audio-play';
            playBtn.title = 'Play music';
            playBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
            playBtn.onclick = (e) => { e.stopPropagation(); startAudio(playBtn, mediaPane); };
            mediaPane.style.position = 'relative';
            mediaPane.appendChild(playBtn);
        }
        // The music row in the info pane is injected below after infoPane.innerHTML is set
        window._pendingAudioForInfo = { audio: _modalAudio, hasMedia, startAudio };
    } else {
        window._pendingAudioForInfo = null;
    }

    // Inject Info
    const captionHTML = post.caption ? `<div class="post-caption" style="-webkit-line-clamp: unset; white-space: pre-wrap;">${linkify(post.caption)}</div>` : '';
    const tagsHTML = (post.tags?.length > 0) ? `<div class="post-tags" style="margin-top: 1rem;">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : '';
    const locationHTML = post.location ? `<span class="post-location">${post.location}</span>` : '';
    const likes = post.likes_count || 0;
    const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';
    
    infoPane.innerHTML = `
        <!-- Author row: avatar + name/date on left, like + share on right -->
        <div style="display:flex; align-items:center; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; justify-content: space-between;">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
                <div class="avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">${document.getElementById('avatar-el').innerHTML}</div>
                <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">${document.getElementById('profile-name').innerText}</div>
                    <div style="font-size: 0.75rem; color: var(--text-2);">${formatDate(post.created_at)}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap: 0.5rem;">
                <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post.id}', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span class="like-count" style="font-size: 0.9rem;">${likes}</span>
                </button>
                <button class="share-btn" onclick="sharePost('${postId}', event)" title="Share post">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
            </div>
        </div>

        ${captionHTML}
        ${tagsHTML}
        ${locationHTML ? `<div style="font-size: 0.8rem; color: var(--text-2); margin-top: 1.25rem;">📍 ${post.location}</div>` : ''}
    `;

    // If audio exists but no media, inject a play row at the top of the info pane
    if (window._pendingAudioForInfo && !hasMedia) {
        const pa = window._pendingAudioForInfo;
        const musicRow = document.createElement('div');
        musicRow.className = 'audio-caption-row';
        musicRow.id = 'audio-caption-row';
        const playRowBtn = document.createElement('button');
        playRowBtn.className = 'audio-caption-play-btn';
        playRowBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play music`;
        playRowBtn.onclick = (e) => { e.stopPropagation(); pa.startAudio(playRowBtn, infoPane); musicRow.querySelector('.audio-caption-play-btn')?.remove(); };
        musicRow.appendChild(playRowBtn);
        infoPane.insertBefore(musicRow, infoPane.firstChild);
    }
    
    window.history.pushState({ modalOpen: true, postId }, '', shareUrl);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Video ↔ audio coordination — pause audio when video plays, resume when video stops
function wireVideoAudio() {
    const videos = document.querySelectorAll('#modal-media video');
    videos.forEach(vid => {
        vid.addEventListener('play', () => {
            if (_modalAudio && !_modalAudio.paused) _modalAudio.pause();
        });
        vid.addEventListener('pause', () => {
            if (_modalAudio && _modalAudio.paused) _modalAudio.play().catch(() => {});
        });
        vid.addEventListener('ended', () => {
            if (_modalAudio && _modalAudio.paused) _modalAudio.play().catch(() => {});
        });
    });

    // Carousel scroll — if swiped to a video slide, pause audio; image slide, resume
    const slider = document.getElementById(`media-modal-${document.querySelector('#modal-media .post-media')?.id?.replace('media-','')}`);
    const postMedia = document.querySelector('#modal-media .post-media');
    if (postMedia) {
        postMedia.addEventListener('scroll', () => {
            const idx = Math.round(postMedia.scrollLeft / postMedia.clientWidth);
            const slides = postMedia.querySelectorAll('.media-slide');
            const currentSlide = slides[idx];
            const hasVideo = currentSlide?.querySelector('video');
            if (hasVideo && !hasVideo.paused) {
                if (_modalAudio && !_modalAudio.paused) _modalAudio.pause();
            } else if (!hasVideo) {
                if (_modalAudio && _modalAudio.paused) _modalAudio.play().catch(() => {});
            }
        }, { passive: true });
    }
}

function muteOnSVG() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
}
function muteOffSVG() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
}


window.doCloseModalAnimation = function() {
    const modal = document.getElementById('post-modal');
    if (!modal || !modal.classList.contains('open')) return;
    // Stop audio
    if (_modalAudio) { _modalAudio.pause(); _modalAudio.src = ''; _modalAudio = null; }
    const content = document.getElementById('modal-content');
    if (content) {
        content.setAttribute('data-closing', '');
        setTimeout(() => {
            modal.classList.remove('open');
            content.removeAttribute('data-closing');
        }, 300);
    } else {
        modal.classList.remove('open');
    }
    document.body.style.overflow = '';
    
    // Clear URL hash to prevent auto-opening on refresh
    if (window.location.hash.startsWith('#post/')) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
}

window.closeModal = function() {
    const modal = document.getElementById('post-modal');
    if (!modal || !modal.classList.contains('open')) return;
    
    if (window.history.state && window.history.state.modalOpen) {
        window.history.back(); 
    } else {
        window.doCloseModalAnimation();
    }
}

// Esc key to close modal
document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeModal();
});

// ── SWIPE DOWN TO CLOSE MODAL (mobile) ────────────
(function() {
    let startY = 0;
    let startScrollTop = 0;
    let dragging = false;

    function onTouchStart(e) {
        const content = document.getElementById('modal-content');
        if (!content) return;
        startY = e.touches[0].clientY;
        startScrollTop = content.scrollTop;
        dragging = true;
        content.style.transition = 'none';
    }

    function onTouchMove(e) {
        if (!dragging) return;
        const content = document.getElementById('modal-content');
        if (!content) return;

        const dy = e.touches[0].clientY - startY;

        // Only intercept downward drag when already scrolled to top
        if (dy > 0 && startScrollTop === 0) {
            // Resist drag slightly (rubberbanding feel)
            const drag = Math.pow(dy, 0.85);
            content.style.transform = `translateY(${drag}px)`;
            // Prevent native scroll while we're dragging the sheet
            if (dy > 10) e.preventDefault();
        }
    }

    function onTouchEnd(e) {
        if (!dragging) return;
        dragging = false;
        const content = document.getElementById('modal-content');
        if (!content) return;

        const dy = e.changedTouches[0].clientY - startY;

        if (dy > 100 && startScrollTop === 0) {
            // Dragged far enough down — close
            closeModal();
        } else {
            // Snap back
            content.style.transition = 'transform 0.3s ease';
            content.style.transform = '';
            setTimeout(() => { content.style.transition = ''; }, 300);
        }
    }

    document.addEventListener('touchstart', (e) => {
        if (!document.getElementById('post-modal')?.classList.contains('open')) return;
        if (e.target.closest('#post-modal')) onTouchStart(e);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!document.getElementById('post-modal')?.classList.contains('open')) return;
        if (e.target.closest('#post-modal')) onTouchMove(e);
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!document.getElementById('post-modal')?.classList.contains('open')) return;
        if (e.target.closest('#post-modal')) onTouchEnd(e);
    }, { passive: true });
})();

// ── PAGE ROUTER ─────────────────────────────────────
const pages = ['home', 'albums', 'about', 'hobbies', 'work'];
const navIds = {
  home:    'nav-posts',
  albums:  'nav-albums',
  about:   'nav-about',
  hobbies: 'nav-hobbies',
  work:    'nav-work',
};
const mobIds = {
  home:    'mob-posts',
  albums:  'mob-albums',
  about:   'mob-about',
  hobbies: 'mob-hobbies',
  work:    'mob-work',
};

let portfolioLoaded = false;
let albumsLoaded    = false;

window.navigateTo = function(page) {
  // Transition: deactivate current, activate new
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (!el) return;
    if (p === page) {
      el.style.display = '';
      requestAnimationFrame(() => {
        el.classList.add('page-active');
      });
    } else {
      el.classList.remove('page-active');
      // hide after transition ends
      el.style.display = 'none';
    }
  });

  // Update desktop nav active state
  pages.forEach(p => {
    const navEl = document.getElementById(navIds[p]);
    if (navEl) {
      navEl.classList.toggle('nav-link-active', p === page);
      navEl.setAttribute('aria-selected', p === page ? 'true' : 'false');
    }
  });

  // Sync mobile bottom tab active states
  pages.forEach(p => {
    const mobEl = document.getElementById(mobIds[p]);
    if (mobEl) mobEl.classList.toggle('active', p === page);
  });

  // Lazy load data on first visit
  if (page === 'work' && !portfolioLoaded) {
    portfolioLoaded = true;
    loadPortfolio().catch(() => {});
  }
  if (page === 'albums' && !albumsLoaded) {
    albumsLoaded = true;
    loadAlbums().catch(() => {});
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Show/hide search bar on desktop
  const searchBar = document.getElementById('search-input');
  if (searchBar) searchBar.style.display = page === 'home' ? '' : 'none';
};

// ── INIT ──────────────────────────────────────────
Promise.all([
    loadProfile(),
    loadPosts(),
]);

// Scroll-hide mobile bottom nav
(function() {
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 80) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });
})();

// ── MOBILE SEARCH ─────────────────────────────────
window.toggleMobileSearch = function() {
  const overlay = document.getElementById('mobile-search-overlay');
  const searchBtn = document.getElementById('mob-search');
  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    closeMobileSearch();
  } else {
    overlay.classList.add('open');
    searchBtn.classList.add('active');
    // Focus the input after animation
    setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 100);
  }
};

window.openMobileSearch = function() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) {
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 120);
  }
};

window.closeMobileSearch = function() {
  document.getElementById('mobile-search-overlay')?.classList.remove('open');
  document.getElementById('mob-search')?.classList.remove('active');
  const input = document.getElementById('mobile-search-input');
  if (input) {
    input.value = '';
    input.blur();
    // Clear search to show all posts again
    searchQuery = '';
    loadPosts(true);
  }
};

// Wire mobile search input to the same search system
// ── PWA HARDWARE BACK BUTTON / GESTURE HANDLING ─────

let exitTimeout = null;

function showToast(msg) {
  let t = document.getElementById('app-toast');
  if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast';
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(30,30,30,0.95);color:#fff;padding:10px 18px;border-radius:24px;font-size:0.85rem;z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);';
      document.body.appendChild(t);
  }
  t.innerText = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2000);
}

window.addEventListener('popstate', (e) => {
    // 1. Post modal closure check
    const modal = document.getElementById('post-modal');
    if (modal && modal.classList.contains('open') && (!e.state || !e.state.modalOpen)) {
        window.doCloseModalAnimation();
        // If we also dropped back to the app root, we just swallowed the back action for the modal.
        if (e.state && e.state.appActive) return;
    }

    // 2. Double-back-to-exit protection for the root application
    if (e.state && e.state.appRoot) {
        if (exitTimeout) {
            clearTimeout(exitTimeout);
            window.history.back(); // Physically exit the app
        } else {
            showToast("Press back again to exit");
            // Push active state back so we explicitly stay inside the PWA
            window.history.pushState({ appActive: true }, '');
            exitTimeout = setTimeout(() => {
                exitTimeout = null;
            }, 2000);
        }
    }
});

// Initialize history tracking
document.addEventListener('DOMContentLoaded', () => {
    // Inject the root and active states so we can catch when the user tries to exit completely
    if (!window.history.state || (!window.history.state.appActive && !window.history.state.appRoot)) {
        window.history.replaceState({ appRoot: true }, '');
        window.history.pushState({ appActive: true }, '');
    }
    
    // Setup initial fetch
    fetchProfile();
    loadPosts();
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mobile-search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    navigateTo('home');
    loadPosts(true);
  });
});

// ── SWIPE NAVIGATION (mobile) ─────────────────────────
(function() {
  const pageOrder = ['home', 'albums', 'about', 'hobbies', 'work'];
  let touchStartX = 0;
  let touchStartY = 0;
  let tracking = false;

  function getCurrentPage() {
    return pageOrder.find(p => {
      const el = document.getElementById(`page-${p}`);
      return el && el.classList.contains('page-active');
    }) || 'home';
  }

  function isBlockedTarget(el) {
    if (!el) return true;
    const tag = el.tagName?.toLowerCase();
    if (['img', 'video', 'input', 'textarea', 'button', 'a', 'select'].includes(tag)) return true;
    if (el.closest('#post-modal')) return true;
    if (el.closest('.mobile-bottom-nav')) return true;
    if (el.closest('.mobile-search-overlay')) return true;
    if (el.closest('.post-media')) return true; // carousel area
    return false;
  }

  document.addEventListener('touchstart', (e) => {
    if (isBlockedTarget(e.target)) { tracking = false; return; }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Must be primarily horizontal and at least 55px
    if (Math.abs(dx) < 55 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

    const current = getCurrentPage();
    const idx = pageOrder.indexOf(current);

    if (dx < 0 && idx < pageOrder.length - 1) {
      // Swipe left → next page
      navigateTo(pageOrder[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      // Swipe right → previous page
      navigateTo(pageOrder[idx - 1]);
    }
  }, { passive: true });
})();

// ── DEEP LINK: auto-open post from URL hash ────────
// e.g. hanserq.github.io/VegSoup/#post/some-uuid
function checkDeepLink() {
    const hash = location.hash; // e.g. "#post/abc-123"
    const match = hash.match(/^#post\/(.+)$/);
    if (!match) return;
    const postId = match[1];
    // Posts may not be loaded yet — wait and retry
    const tryOpen = (attempts) => {
        const post = window.allPosts?.find(p => p.id === postId);
        if (post) {
            openModal(postId);
            updateOpenGraphMeta(post);
        } else if (attempts > 0) {
            setTimeout(() => tryOpen(attempts - 1), 300);
        }
    };
    tryOpen(15); // retry up to 15×300ms = 4.5 seconds
}

// Run after initial posts are fetched
const _origLoadPosts = window.loadPosts;
document.addEventListener('DOMContentLoaded', () => {
    checkDeepLink();
});

// ── SHARE POST NATIVE API ─────────────────────────
window.sharePost = function(postId, event) {
    if (event) event.stopPropagation();
    
    // Construct the deep link URL
    const shareUrl = `${location.origin}${location.pathname}#post/${postId}`;
    const post = window.allPosts?.find(p => p.id === postId);
    const title = post && post.caption ? `Post by ${document.getElementById('profile-name').innerText}` : document.title;
    
    // Use native share menu if available (Mobile Safari, Android Chrome, etc)
    if (navigator.share) {
        navigator.share({
            title: title,
            url: shareUrl
        }).catch((err) => {
            console.log('User cancelled share or error:', err);
        });
    } else {
        // Fallback for desktop/unsupported browsers: copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            const btn = event.currentTarget;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<span style="font-size: 0.8rem; font-weight: 500;">Copied!</span>`;
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Share link: ' + shareUrl);
        });
    }
};// Also handle browser back/forward hash change
window.addEventListener('hashchange', checkDeepLink);

// ── OPEN GRAPH INJECTION ────────────────────────
function updateOpenGraphMeta(post) {
    if (!post) return;
    
    document.title = `${post.caption ? post.caption.slice(0, 30) + '...' : 'Shared Post'} | Hanserq`;
    const ogImage = (post.media_urls && post.media_urls.length > 0) ? post.media_urls[0] : null;
    const ogTitle = post.caption || 'Shared Post from Hanserq';
    
    const setMeta = (property, content) => {
        let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(property.includes('og:') ? 'property' : 'name', property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    };

    setMeta('og:title', ogTitle);
    if (ogImage) {
        setMeta('og:image', ogImage);
        setMeta('twitter:image', ogImage);
        setMeta('twitter:card', 'summary_large_image');
    }
}

// ── PWA SERVICE WORKER ──────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered with scope:', registration.scope);
    }).catch(err => {
      console.error('SW registration failed:', err);
    });
  });
}

// ── HAPTICS / VIBRATION ENGINES ───────────────────
window.triggerHaptic = function(type = 'light') {
    if (!navigator.vibrate) return;
    
    // Most mobile browsers ignore vibration unless triggered by direct user interaction
    try {
        if (type === 'light') {
            navigator.vibrate(10); // Very short tick
        } else if (type === 'heavy') {
            navigator.vibrate([20, 30, 20]); // Double knock
        } else if (type === 'heart') {
            navigator.vibrate([15, 60, 25]); // Heartbeat feel
        }
    } catch(e) { /* ignore */ }
};

// Bind haptics to Mobile Tabs
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.mob-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => triggerHaptic('light'));
    });
});


