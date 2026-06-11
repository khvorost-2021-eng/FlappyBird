// ==========================================
// ТЕМА ОФОРМЛЕНИЯ
// ==========================================
const THEMES = {
    day: { name: T.themeNames.day, skyTop: '#87CEEB', skyBottom: '#B0E0E6', cloudColor: 'rgba(255,255,255,0.8)', pipeMain: '#4CAF50', pipeLight: '#81C784', pipeDark: '#2E7D32', pipeTop: '#388E3C', ground: '#8BC34A', hasSun: true, hasMoon: false, hasStars: false, hasTrees: false, sunColor: '#FFEB3B', moonColor: '#F5F5DC' },
    night: { name: T.themeNames.night, skyTop: '#0B1026', skyBottom: '#1A237E', cloudColor: 'rgba(200,200,255,0.25)', pipeMain: '#37474F', pipeLight: '#546E7A', pipeDark: '#1C262B', pipeTop: '#263238', ground: '#1B5E20', hasSun: false, hasMoon: true, hasStars: true, hasTrees: false, sunColor: '#FFEB3B', moonColor: '#FFFACD' },
    sunset: { name: T.themeNames.sunset, skyTop: '#FF6B9D', skyBottom: '#FFA751', cloudColor: 'rgba(255,200,150,0.6)', pipeMain: '#5D4037', pipeLight: '#795548', pipeDark: '#3E2723', pipeTop: '#4E342E', ground: '#8D6E63', hasSun: true, hasMoon: false, hasStars: false, hasTrees: false, sunColor: '#FF5722', moonColor: '#FFFACD' },
    forest: { name: T.themeNames.forest, skyTop: '#A8D5BA', skyBottom: '#D4E8C2', cloudColor: 'rgba(255,255,255,0.5)', pipeMain: '#6D4C41', pipeLight: '#8D6E63', pipeDark: '#4E342E', pipeTop: '#3E2723', ground: '#558B2F', hasSun: false, hasMoon: false, hasStars: false, hasTrees: true, sunColor: '#FFEB3B', moonColor: '#FFFACD' }
};

// ==========================================
// СОСТОЯНИЕ
// ==========================================
const gameState = {
    name: T.guest, avatar: null, uniqueId: 'local',
    coins: 0, currentSkin: 'standard', ownedSkins: ['standard'],
    bestScore: 0, totalGames: 0, theme: 'day'
};

const settings = {
    musicVolume: 0.7, sfxVolume: 0.8,
    musicMuted: false, sfxMuted: false
};

(function loadLocalData() {
    const saved = localStorage.getItem('flappyPlayer');
    if (saved) { try { Object.assign(gameState, JSON.parse(saved)); } catch (e) {} }
    const savedSettings = localStorage.getItem('flappySettings');
    if (savedSettings) { try { Object.assign(settings, JSON.parse(savedSettings)); } catch (e) {} }
})();

// ==========================================
// ЗВУК
// ==========================================
const SoundManager = {
    audioCtx: null, musicGain: null, sfxGain: null,
    musicPlaying: false, musicTimeout: null,
    
    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioCtx.createGain(); this.musicGain.connect(this.audioCtx.destination);
            this.sfxGain = this.audioCtx.createGain(); this.sfxGain.connect(this.audioCtx.destination);
            this.updateVolumes();
        } catch (e) {}
    },
    
    resume() { if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume(); },
    
    updateVolumes() {
        if (!this.audioCtx) return;
        this.musicGain.gain.value = settings.musicMuted ? 0 : settings.musicVolume * 0.3;
        this.sfxGain.gain.value = settings.sfxMuted ? 0 : settings.sfxVolume;
    },
    
    playFlap() {
        if (!this.audioCtx || settings.sfxMuted) return; this.resume();
        try {
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain); gain.connect(this.sfxGain);
            osc.start(now); osc.stop(now + 0.1);
        } catch (e) {}
    },
    
    playCoin() {
        if (!this.audioCtx || settings.sfxMuted) return; this.resume();
        try {
            const now = this.audioCtx.currentTime;
            [880, 1320].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
                osc.type = 'square'; osc.frequency.value = freq;
                const st = now + i * 0.06;
                gain.gain.setValueAtTime(0, st); gain.gain.linearRampToValueAtTime(0.25, st + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, st + 0.15);
                osc.connect(gain); gain.connect(this.sfxGain);
                osc.start(st); osc.stop(st + 0.15);
            });
        } catch (e) {}
    },
    
    playCrash() {
        if (!this.audioCtx || settings.sfxMuted) return; this.resume();
        try {
            const now = this.audioCtx.currentTime;
            const size = Math.floor(this.audioCtx.sampleRate * 0.3);
            const buffer = this.audioCtx.createBuffer(1, size, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
            const noise = this.audioCtx.createBufferSource(); noise.buffer = buffer;
            const ng = this.audioCtx.createGain();
            ng.gain.setValueAtTime(0.4, now); ng.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            const f = this.audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
            noise.connect(f); f.connect(ng); ng.connect(this.sfxGain);
            const osc = this.audioCtx.createOscillator(); const og = this.audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            og.gain.setValueAtTime(0.5, now); og.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(og); og.connect(this.sfxGain);
            noise.start(now); osc.start(now); osc.stop(now + 0.3);
        } catch (e) {}
    },
    
    playUIClick() {
        if (!this.audioCtx || settings.sfxMuted) return; this.resume();
        try {
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain); gain.connect(this.sfxGain);
            osc.start(now); osc.stop(now + 0.08);
        } catch (e) {}
    },
    
    startMusic() {
        if (!this.audioCtx || settings.musicMuted || this.musicPlaying) return;
        this.resume(); this.musicPlaying = true;
        const melody = [
            { note: 523.25, dur: 0.2 }, { note: 659.25, dur: 0.2 },
            { note: 783.99, dur: 0.2 }, { note: 880.00, dur: 0.3 },
            { note: 783.99, dur: 0.2 }, { note: 659.25, dur: 0.2 },
            { note: 523.25, dur: 0.3 }, { note: 587.33, dur: 0.2 },
            { note: 659.25, dur: 0.2 }, { note: 783.99, dur: 0.2 },
            { note: 880.00, dur: 0.3 }, { note: 783.99, dur: 0.2 },
            { note: 523.25, dur: 0.4 }
        ];
        let noteIndex = 0;
        const playNextNote = () => {
            if (!this.musicPlaying || !this.audioCtx) return;
            try {
                const note = melody[noteIndex]; const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
                osc.type = 'triangle'; osc.frequency.value = note.note;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
                gain.gain.linearRampToValueAtTime(0.1, now + note.dur * 0.7);
                gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur);
                osc.connect(gain); gain.connect(this.musicGain);
                osc.start(now); osc.stop(now + note.dur);
                if (noteIndex % 4 === 0) {
                    const bass = this.audioCtx.createOscillator(); const bg = this.audioCtx.createGain();
                    bass.type = 'sine'; bass.frequency.value = note.note / 4;
                    bg.gain.setValueAtTime(0.2, now);
                    bg.gain.exponentialRampToValueAtTime(0.01, now + note.dur * 2);
                    bass.connect(bg); bg.connect(this.musicGain);
                    bass.start(now); bass.stop(now + note.dur * 2);
                }
            } catch (e) {}
            noteIndex = (noteIndex + 1) % melody.length;
            this.musicTimeout = setTimeout(playNextNote, melody[(noteIndex - 1 + melody.length) % melody.length].dur * 1000);
        };
        playNextNote();
    },
    
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) { clearTimeout(this.musicTimeout); this.musicTimeout = null; }
    }
};

// ==========================================
// YANDEX SDK
// ==========================================
let ysdk = null, yandexPlayer = null, sdkReady = false;

const YandexAPI = {
    async init() {
        const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000));
        try {
            await Promise.race([this._tryInit(), timeout]);
            sdkReady = true; await this.syncPlayerData(); return true;
        } catch (err) { sdkReady = false; return false; }
    },
    
    async _tryInit() {
        let a = 0;
        while (typeof YaGames === 'undefined' && a < 30) { await new Promise(r => setTimeout(r, 100)); a++; }
        if (typeof YaGames === 'undefined') throw new Error('no sdk');
        ysdk = await YaGames.init();
        try { yandexPlayer = await ysdk.getPlayer({ scopes: false }); } catch (e) {}
    },
    
    async syncPlayerData() {
        if (!sdkReady || !yandexPlayer) return;
        try {
            const data = await yandexPlayer.getData(['coins','currentSkin','ownedSkins','bestScore','totalGames','theme']);
            const f = {
                name: yandexPlayer.getName() || T.guest, avatar: yandexPlayer.getPhoto('small'),
                uniqueId: yandexPlayer.getUniqueID(),
                coins: data.coins ?? gameState.coins, currentSkin: data.currentSkin ?? gameState.currentSkin,
                ownedSkins: data.ownedSkins ?? gameState.ownedSkins, bestScore: data.bestScore ?? gameState.bestScore,
                totalGames: data.totalGames ?? gameState.totalGames, theme: data.theme ?? gameState.theme
            };
            Object.assign(gameState, f);
            document.getElementById('coinCount').textContent = gameState.coins;
            const sc = document.getElementById('coinCountSkins'); if (sc) sc.textContent = gameState.coins;
            const av = document.getElementById('playerAvatar'); const nm = document.getElementById('playerName');
            if (gameState.avatar && av) { av.src = gameState.avatar; av.style.display = 'block'; }
            if (nm) nm.textContent = gameState.name;
        } catch (e) {}
    },
    
    async savePlayerData(data) {
        try { localStorage.setItem('flappyPlayer', JSON.stringify(data)); } catch (e) {}
        if (!sdkReady || !yandexPlayer) return data;
        try {
            await yandexPlayer.setData({
                coins: data.coins, currentSkin: data.currentSkin, ownedSkins: data.ownedSkins,
                bestScore: data.bestScore, totalGames: data.totalGames, theme: data.theme
            }, true);
            await yandexPlayer.setStats({ highScore: data.bestScore, totalCoins: data.coins });
        } catch (e) {}
        return data;
    },
    
    async submitScore(score) {
        if (!sdkReady || !ysdk) return false;
        try { const lb = await ysdk.getLeaderboards(); await lb.setLeaderboardScore('flappycores', score); return true; }
        catch (e) { return false; }
    },
    
    async getLeaderboard() {
        if (!sdkReady || !ysdk) return this.getStaticLeaderboard();
        try {
            const lb = await ysdk.getLeaderboards();
            const r = await lb.getLeaderboardEntries('flappycores', { quantityTop: 10, quantityAround: 2, includeUser: true });
            return r.entries.map(e => ({ rank: e.rank, name: e.player.publicName || T.guest, score: e.score, avatar: e.player.getPhoto?.('small') || '', uniqueId: e.player.uniqueID }));
        } catch (e) { return this.getStaticLeaderboard(); }
    },
    
    getStaticLeaderboard() {
        return [
            { rank: 1, name: "Александр", score: 87, uniqueId: 'a' }, { rank: 2, name: "Мария", score: 72, uniqueId: 'b' },
            { rank: 3, name: "Дмитрий", score: 65, uniqueId: 'c' }, { rank: 4, name: "Екатерина", score: 58, uniqueId: 'd' },
            { rank: 5, name: "Иван", score: 51, uniqueId: 'e' }, { rank: 6, name: "Ольга", score: 44, uniqueId: 'f' },
            { rank: 7, name: "Сергей", score: 38, uniqueId: 'g' }, { rank: 8, name: "Анна", score: 31, uniqueId: 'h' },
            { rank: 9, name: "Павел", score: 25, uniqueId: 'i' }, { rank: 10, name: "Наталья", score: 18, uniqueId: 'j' }
        ];
    }
};

// ==========================================
// СКИНЫ
// ==========================================
const SKINS = {
    standard: { price: 0, name: T.skinNames.standard }, chicken: { price: 10, name: T.skinNames.chicken },
    parrot: { price: 20, name: T.skinNames.parrot }, dragon: { price: 30, name: T.skinNames.dragon },
    plane: { price: 50, name: T.skinNames.plane }, rocket: { price: 80, name: T.skinNames.rocket },
    ghost: { price: 100, name: T.skinNames.ghost }, gold: { price: 150, name: T.skinNames.gold }
};

// ==========================================
// ПРОСТАЯ СИСТЕМА ПЕРЕХОДОВ (ИСПРАВЛЕНО)
// ==========================================
const ScreenManager = {
    currentScreen: 'menuScreen',
    isTransitioning: false,
    
    // Переход между экранами: fade out → fade in (без наложений)
    goTo(targetId, game = null) {
        if (this.isTransitioning) return;
        if (targetId === this.currentScreen) return;
        
        const fromEl = document.getElementById(this.currentScreen);
        const toEl = document.getElementById(targetId);
        
        if (!fromEl || !toEl) return;
        
        this.isTransitioning = true;
        SoundManager.playUIClick();
        
        // === ШАГ 1: Плавный fade out текущего экрана ===
        fromEl.classList.remove('active');
        
        // === ШАГ 2: Ждём полного исчезновения старого экрана ===
        setTimeout(() => {
            // === ШАГ 3: Плавный fade in нового экрана ===
            toEl.classList.add('active');
            
            // === ШАГ 4: Ждём полного появления и разблокируем переходы ===
            setTimeout(() => {
                this.currentScreen = targetId;
                this.isTransitioning = false;
                
                // Колбэки после перехода
                if (targetId === 'skinsScreen' && game) {
                    game.renderSkinsGrid();
                } else if (targetId === 'settingsScreen' && game) {
                    game.renderSettingsScreen();
                } else if (targetId === 'menuScreen' && game) {
                    game.updateUIFromState();
                    game.startMenuPreview();
                }
            }, 280);
        }, 280);
    }
};

// ==========================================
// ИГРА
// ==========================================
class FlappyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.menuCanvas = document.getElementById('menuCanvas');
        this.menuCtx = this.menuCanvas ? this.menuCanvas.getContext('2d') : null;
        
        this.VIRTUAL_WIDTH = 400;
        this.VIRTUAL_HEIGHT = 600;
        this.scale = 1; this.offsetX = 0; this.offsetY = 0;
        this.visibleLeft = 0; this.visibleRight = this.VIRTUAL_WIDTH; this.visibleWidth = this.VIRTUAL_WIDTH;
        this.displayWidth = 400; this.displayHeight = 600;
        
        this.gravity = 0.35;
        this.jumpStrength = -6.5;
        this.terminalVelocity = 11;
        this.pipeGap = 165;
        this.pipeWidth = 60;
        this.pipeSpeed = 2.8;
        this.pipeInterval = 95;
        
        this.FIXED_DT = 1 / 60;
        this.accumulator = 0;
        this.lastTime = null;
        
        this.bird = { x: 80, y: 300, velocity: 0, radius: 15 };
        this.pipes = []; this.coins = []; this.particles = [];
        this.stars = []; this.clouds = [];
        this.score = 0; this.earnedCoins = 0; this.pipesPassed = 0;
        this.frameCount = 0;
        
        this.gameRunning = false; this.gameStarted = false;
        this.animationId = null; this.menuAnimId = null;
        this.skinPreviewAnimId = null; this.themePreviewAnimIds = new Map();
        
        this.generateClouds();
        this.bindEvents();
        this.updateUIFromState();
        this.startMenuPreview();
        
        SoundManager.init(); SoundManager.updateVolumes();
        YandexAPI.init().catch(() => {});
        
        this.pausedForRotation = false;
        this.checkMobileOrientation();
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkMobileOrientation(), 100);
        });
        
        if (window.matchMedia) {
            const portraitQuery = window.matchMedia('(orientation: portrait)');
            const handleOrientationChange = () => this.checkMobileOrientation();
            if (portraitQuery.addEventListener) {
                portraitQuery.addEventListener('change', handleOrientationChange);
            } else if (portraitQuery.addListener) {
                portraitQuery.addListener(handleOrientationChange);
            }
        }
        
        this.tryLockOrientation();
    }

    generateClouds() {
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                baseX: i * 150 + Math.random() * 50,
                y: 30 + i * 70 + Math.random() * 30,
                speed: 0.3 + Math.random() * 0.2,
                scale: 0.7 + Math.random() * 0.5
            });
        }
    }

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * this.displayWidth,
                y: Math.random() * this.displayHeight * 0.85,
                size: Math.random() * 2 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.03 + Math.random() * 0.05
            });
        }
    }

    updateUIFromState() {
        const cc = document.getElementById('coinCount'); if (cc) cc.textContent = gameState.coins;
        const sc = document.getElementById('coinCountSkins'); if (sc) sc.textContent = gameState.coins;
        const av = document.getElementById('playerAvatar'); const nm = document.getElementById('playerName');
        if (gameState.avatar && av) { av.src = gameState.avatar; av.style.display = 'block'; }
        if (nm) nm.textContent = gameState.name;
        const bs = document.getElementById('bestScore'); if (bs) bs.textContent = gameState.bestScore;
    }

    bindEvents() {
        const playBtn = document.getElementById('playBtn');
        const skinsBtn = document.getElementById('skinsBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const recordsBtn = document.getElementById('recordsBtn');
        const restartBtn = document.getElementById('restartBtn');
        const menuBtn = document.getElementById('menuBtn');
        const gameBackBtn = document.getElementById('gameBackBtn');
        
        if (playBtn) playBtn.addEventListener('click', () => this.startGame());
        if (skinsBtn) skinsBtn.addEventListener('click', () => ScreenManager.goTo('skinsScreen', this));
        if (settingsBtn) settingsBtn.addEventListener('click', () => ScreenManager.goTo('settingsScreen', this));
        if (recordsBtn) recordsBtn.addEventListener('click', () => {
            ScreenManager.goTo('recordsScreen', this);
            setTimeout(() => this.loadLeaderboard(), 300);
        });
        if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());
        if (menuBtn) menuBtn.addEventListener('click', () => this.goToMenu());
        if (gameBackBtn) gameBackBtn.addEventListener('click', () => this.confirmExit());
        
        document.querySelectorAll('[data-target]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                if (target) {
                    if (this.gameRunning) this.stopGame();
                    ScreenManager.goTo(target, this);
                }
            });
        });
        
        const musicSlider = document.getElementById('musicSlider');
        const sfxSlider = document.getElementById('sfxSlider');
        const musicToggle = document.getElementById('musicToggle');
        const sfxToggle = document.getElementById('sfxToggle');
        
        if (musicSlider) {
            musicSlider.value = settings.musicVolume * 100;
            this.updateSliderProgress(musicSlider);
            musicSlider.addEventListener('input', (e) => {
                settings.musicVolume = e.target.value / 100;
                this.updateSliderProgress(e.target);
                document.getElementById('musicValue').textContent = e.target.value + '%';
                SoundManager.updateVolumes(); this.saveSettings();
            });
        }
        if (sfxSlider) {
            sfxSlider.value = settings.sfxVolume * 100;
            this.updateSliderProgress(sfxSlider);
            sfxSlider.addEventListener('input', (e) => {
                settings.sfxVolume = e.target.value / 100;
                this.updateSliderProgress(e.target);
                document.getElementById('sfxValue').textContent = e.target.value + '%';
                SoundManager.updateVolumes(); this.saveSettings();
            });
        }
        if (musicToggle) {
            this.updateMuteButton(musicToggle, settings.musicMuted);
            musicToggle.addEventListener('click', () => {
                settings.musicMuted = !settings.musicMuted;
                this.updateMuteButton(musicToggle, settings.musicMuted);
                SoundManager.updateVolumes();
                if (settings.musicMuted) SoundManager.stopMusic();
                else if (this.gameRunning) SoundManager.startMusic();
                this.saveSettings();
            });
        }
        if (sfxToggle) {
            this.updateMuteButton(sfxToggle, settings.sfxMuted);
            sfxToggle.addEventListener('click', () => {
                settings.sfxMuted = !settings.sfxMuted;
                this.updateMuteButton(sfxToggle, settings.sfxMuted);
                SoundManager.updateVolumes(); this.saveSettings();
            });
        }
        
        document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); this.tap(); } });
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => { e.preventDefault(); this.tap(); });
            this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.tap(); }, { passive: false });
        }
        
        window.addEventListener('resize', () => this.handleResize());
    }

    updateSliderProgress(slider) { slider.style.setProperty('--progress', slider.value + '%'); }
    updateMuteButton(btn, muted) { if (muted) btn.classList.add('muted'); else btn.classList.remove('muted'); }
    saveSettings() { try { localStorage.setItem('flappySettings', JSON.stringify(settings)); } catch (e) {} }

    handleResize() {
        if (!this.canvas) return;
        const gs = document.getElementById('gameScreen');
        if (gs && gs.classList.contains('active')) this.resizeCanvas();
        this.checkMobileOrientation();
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.displayWidth = window.innerWidth;
        this.displayHeight = window.innerHeight;
        this.canvas.width = this.displayWidth * dpr;
        this.canvas.height = this.displayHeight * dpr;
        this.canvas.style.width = this.displayWidth + 'px';
        this.canvas.style.height = this.displayHeight + 'px';
        
        this.scale = this.displayHeight / this.VIRTUAL_HEIGHT;
        this.offsetX = (this.displayWidth - this.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = 0;
        
        this.visibleLeft = -this.offsetX / this.scale;
        this.visibleRight = (this.displayWidth - this.offsetX) / this.scale;
        this.visibleWidth = this.visibleRight - this.visibleLeft;
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.generateStars();
    }

    checkMobileOrientation() {
        const overlay = document.getElementById('rotateOverlay');
        if (!overlay) return;
        
        const isMobile = (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.innerWidth <= 1024)
        );
        
        if (isMobile) {
            overlay.classList.add('mobile-device');
            document.body.classList.add('is-mobile');
            const isPortrait = window.innerHeight > window.innerWidth;
            
            if (isPortrait) {
                document.body.classList.add('rotate-locked');
                if (this.gameRunning) this.pauseForRotation();
            } else {
                document.body.classList.remove('rotate-locked');
                if (this.pausedForRotation) this.resumeAfterRotation();
            }
        } else {
            overlay.classList.remove('mobile-device');
            document.body.classList.remove('is-mobile', 'rotate-locked');
        }
    }

    tryLockOrientation() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    }

    pauseForRotation() {
        this.pausedForRotation = true;
        this.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        SoundManager.stopMusic();
    }

    resumeAfterRotation() {
        if (this.pausedForRotation) {
            this.pausedForRotation = false;
        }
    }

    tap() {
        if (!this.gameRunning) return;
        SoundManager.resume();
        if (!this.gameStarted) {
            this.gameStarted = true;
            const h = document.getElementById('tapHint'); if (h) h.classList.add('hidden');
            const b = document.getElementById('gameBackBtn'); if (b) b.classList.add('game-hidden');
            SoundManager.startMusic();
        }
        this.bird.velocity = this.jumpStrength;
        SoundManager.playFlap();
    }

    async goToMenu() {
        await YandexAPI.savePlayerData(gameState);
        SoundManager.stopMusic();
        this.stopGame();
        ScreenManager.goTo('menuScreen', this);
    }

    confirmExit() {
        if (this.gameStarted && this.score > 0) {
            if (confirm(T.exitConfirm)) this.goToMenu();
        } else this.goToMenu();
    }

    stopGame() {
        this.gameRunning = false;
        SoundManager.stopMusic();
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    }

    updateAllCoinDisplays() {
        const c = document.getElementById('coinCount'); if (c) c.textContent = gameState.coins;
        const s = document.getElementById('coinCountSkins'); if (s) s.textContent = gameState.coins;
    }

    renderSettingsScreen() {
        const ms = document.getElementById('musicSlider'); const ss = document.getElementById('sfxSlider');
        const mt = document.getElementById('musicToggle'); const st = document.getElementById('sfxToggle');
        if (ms) { ms.value = settings.musicVolume * 100; this.updateSliderProgress(ms); document.getElementById('musicValue').textContent = Math.round(settings.musicVolume * 100) + '%'; }
        if (ss) { ss.value = settings.sfxVolume * 100; this.updateSliderProgress(ss); document.getElementById('sfxValue').textContent = Math.round(settings.sfxVolume * 100) + '%'; }
        if (mt) this.updateMuteButton(mt, settings.musicMuted);
        if (st) this.updateMuteButton(st, settings.sfxMuted);
        
        const grid = document.getElementById('themesGrid'); if (!grid) return;
        this.themePreviewAnimIds.forEach(id => cancelAnimationFrame(id));
        this.themePreviewAnimIds.clear();
        grid.innerHTML = '';
        
        Object.entries(THEMES).forEach(([k, theme]) => {
            const card = document.createElement('div');
            card.className = 'theme-card'; if (k === gameState.theme) card.classList.add('selected');
            const cvs = document.createElement('canvas'); cvs.width = 200; cvs.height = 160; card.appendChild(cvs);
            const lbl = document.createElement('div'); lbl.className = 'theme-label'; lbl.textContent = theme.name; card.appendChild(lbl);
            const chk = document.createElement('div'); chk.className = 'theme-check'; chk.textContent = '✓'; card.appendChild(chk);
            card.addEventListener('click', () => this.selectTheme(k));
            grid.appendChild(card);
            this.startThemePreview(cvs, k);
        });
    }

    startThemePreview(canvas, themeKey) {
        const ctx = canvas.getContext('2d'); const theme = THEMES[themeKey]; let frame = 0;
        const render = () => {
            const ss = document.getElementById('settingsScreen');
            if (!ss || !ss.classList.contains('active')) { this.themePreviewAnimIds.delete(canvas); return; }
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, theme.skyTop); g.addColorStop(1, theme.skyBottom);
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (theme.hasStars) {
                ctx.fillStyle = 'white';
                for (let i = 0; i < 20; i++) {
                    const tw = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
                    ctx.globalAlpha = tw;
                    ctx.beginPath(); ctx.arc((i * 37) % canvas.width, (i * 23) % (canvas.height * 0.6), 1 + tw, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            if (theme.hasSun) { ctx.fillStyle = theme.sunColor; ctx.beginPath(); ctx.arc(canvas.width - 35, 35, 18, 0, Math.PI * 2); ctx.fill(); }
            if (theme.hasMoon) { ctx.fillStyle = theme.moonColor; ctx.beginPath(); ctx.arc(canvas.width - 35, 35, 15, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = theme.cloudColor;
            const cx = ((frame * 0.3) % (canvas.width + 50)) - 25;
            ctx.beginPath(); ctx.arc(cx, 50, 10, 0, Math.PI * 2); ctx.arc(cx + 10, 50, 13, 0, Math.PI * 2); ctx.arc(cx + 22, 50, 10, 0, Math.PI * 2); ctx.fill();
            if (theme.hasTrees) {
                for (let i = 0; i < 3; i++) {
                    const tx = ((i * 70 + frame * 0.5) % (canvas.width + 50)) - 25;
                    ctx.fillStyle = theme.pipeMain; ctx.fillRect(tx, canvas.height - 60, 25, 60);
                    ctx.fillStyle = theme.pipeDark; ctx.fillRect(tx - 3, canvas.height - 68, 31, 8);
                }
            } else {
                for (let i = 0; i < 2; i++) {
                    const px = ((i * 100 + frame * 0.5) % (canvas.width + 50)) - 25;
                    const th = 40 + i * 10; const by = th + 50;
                    ctx.fillStyle = theme.pipeMain;
                    ctx.fillRect(px, 0, 25, th); ctx.fillRect(px, by, 25, canvas.height - by);
                    ctx.fillStyle = theme.pipeTop;
                    ctx.fillRect(px - 3, th - 8, 31, 8); ctx.fillRect(px - 3, by, 31, 8);
                }
            }
            ctx.fillStyle = theme.ground; ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
            frame++;
            this.themePreviewAnimIds.set(canvas, requestAnimationFrame(render));
        };
        requestAnimationFrame(render);
    }

    async selectTheme(k) {
        if (!THEMES[k]) return;
        gameState.theme = k;
        await YandexAPI.savePlayerData(gameState);
        this.renderSettingsScreen();
    }

    startMenuPreview() {
        if (!this.menuCanvas || !this.menuCtx) return;
        if (this.menuAnimId) { cancelAnimationFrame(this.menuAnimId); this.menuAnimId = null; }
        let frame = 0;
        const render = () => {
            const ms = document.getElementById('menuScreen');
            if (!ms || !ms.classList.contains('active')) { this.menuAnimId = null; return; }
            this.menuCtx.clearRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
            const theme = THEMES[gameState.theme] || THEMES.day;
            const g = this.menuCtx.createLinearGradient(0, 0, 0, this.menuCanvas.height);
            g.addColorStop(0, theme.skyTop); g.addColorStop(1, theme.skyBottom);
            this.menuCtx.fillStyle = g; this.menuCtx.fillRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
            if (theme.hasSun) { this.menuCtx.fillStyle = theme.sunColor; this.menuCtx.beginPath(); this.menuCtx.arc(this.menuCanvas.width - 50, 50, 22, 0, Math.PI * 2); this.menuCtx.fill(); }
            if (theme.hasMoon) { this.menuCtx.fillStyle = theme.moonColor; this.menuCtx.beginPath(); this.menuCtx.arc(this.menuCanvas.width - 50, 50, 18, 0, Math.PI * 2); this.menuCtx.fill(); }
            this.menuCtx.fillStyle = theme.cloudColor;
            for (let i = 0; i < 3; i++) {
                const x = ((frame * 0.5 + i * 120) % (this.menuCanvas.width + 100)) - 50;
                const y = 40 + i * 50;
                this.menuCtx.beginPath();
                this.menuCtx.arc(x, y, 18, 0, Math.PI * 2); this.menuCtx.arc(x + 18, y, 22, 0, Math.PI * 2);
                this.menuCtx.arc(x + 38, y, 18, 0, Math.PI * 2); this.menuCtx.fill();
            }
            this.menuCtx.fillStyle = theme.ground;
            this.menuCtx.fillRect(0, this.menuCanvas.height - 10, this.menuCanvas.width, 10);
            this.menuCtx.save();
            this.menuCtx.translate(this.menuCanvas.width / 2, this.menuCanvas.height / 2);
            this.menuCtx.scale(1.8, 1.8);
            const by = Math.sin(frame * 0.05) * 15;
            this.menuCtx.translate(0, by);
            const oc = this.ctx; this.ctx = this.menuCtx;
            try { this.drawSkin(frame * 0.08, gameState.currentSkin); } catch (e) {}
            this.ctx = oc;
            this.menuCtx.restore();
            frame++;
            this.menuAnimId = requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    renderSkinsGrid() {
        const grid = document.getElementById('skinsGrid'); if (!grid) return;
        if (this.skinPreviewAnimId) { cancelAnimationFrame(this.skinPreviewAnimId); this.skinPreviewAnimId = null; }
        grid.innerHTML = '';
        this.updateAllCoinDisplays();
        const canvases = [];
        Object.entries(SKINS).forEach(([k, skin]) => {
            const card = document.createElement('div');
            card.className = 'skin-card'; if (k === gameState.currentSkin) card.classList.add('selected');
            const p = document.createElement('canvas'); p.className = 'skin-preview'; p.width = 80; p.height = 80;
            canvases.push({ canvas: p, skinKey: k }); card.appendChild(p);
            const n = document.createElement('div'); n.className = 'skin-name'; n.textContent = skin.name; card.appendChild(n);
            const pr = document.createElement('div'); pr.className = 'skin-price';
            pr.textContent = skin.price === 0 ? T.free : `🪙 ${skin.price}`; card.appendChild(pr);
            const btn = document.createElement('button'); btn.className = 'skin-btn';
            if (k === gameState.currentSkin) { btn.textContent = T.selected; btn.classList.add('selected'); btn.disabled = true; }
            else if (gameState.ownedSkins.includes(k)) {
                btn.textContent = T.select; btn.classList.add('select');
                btn.addEventListener('click', (e) => { e.stopPropagation(); this.selectSkin(k); });
            } else {
                btn.textContent = `${T.buy} 🪙${skin.price}`; btn.classList.add('buy');
                if (gameState.coins < skin.price) btn.disabled = true;
                else btn.addEventListener('click', (e) => { e.stopPropagation(); this.buySkin(k); });
            }
            card.appendChild(btn); grid.appendChild(card);
        });
        this.startAllSkinPreviews(canvases);
    }

    startAllSkinPreviews(canvases) {
        const ctxs = canvases.map(({ canvas, skinKey }) => ({ ctx: canvas.getContext('2d'), canvas, skinKey }));
        let frame = 0;
        const render = () => {
            const ss = document.getElementById('skinsScreen');
            if (!ss || !ss.classList.contains('active')) { this.skinPreviewAnimId = null; return; }
            ctxs.forEach(({ ctx, canvas, skinKey }) => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const theme = THEMES[gameState.theme] || THEMES.day;
                const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
                g.addColorStop(0, theme.skyTop); g.addColorStop(1, theme.skyBottom);
                ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(1.4, 1.4);
                const oc = this.ctx; this.ctx = ctx;
                try { this.drawSkin(frame * 0.08, skinKey); } catch (e) {}
                this.ctx = oc; ctx.restore();
            });
            frame++;
            this.skinPreviewAnimId = requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    async buySkin(k) {
        const p = SKINS[k].price; if (gameState.coins < p) return;
        gameState.coins -= p;
        if (!gameState.ownedSkins.includes(k)) gameState.ownedSkins.push(k);
        gameState.currentSkin = k;
        await YandexAPI.savePlayerData(gameState);
        this.updateAllCoinDisplays(); this.renderSkinsGrid();
    }

    async selectSkin(k) {
        gameState.currentSkin = k;
        await YandexAPI.savePlayerData(gameState);
        this.renderSkinsGrid();
    }

    // ==========================================
    // ЗАПУСК ИГРЫ (ИСПРАВЛЕНО: таймаут 600мс)
    // ==========================================
    startGame() {
        ScreenManager.goTo('gameScreen', this);
        
        setTimeout(() => {
            this.resizeCanvas();
            this.resetGame();
            this.gameRunning = true;
            this.gameStarted = false;
            const h = document.getElementById('tapHint'); if (h) h.classList.remove('hidden');
            const b = document.getElementById('gameBackBtn'); if (b) b.classList.remove('game-hidden');
            SoundManager.resume();
            this.lastTime = null;
            this.accumulator = 0;
            this.gameLoop();
        }, 600); // ⬅️ Ждём полного завершения перехода (280 + 280 = 560ms)
    }

    restartGame() {
        ScreenManager.goTo('gameScreen', this);
        
        setTimeout(() => {
            this.resizeCanvas();
            this.resetGame();
            this.gameRunning = true;
            this.gameStarted = false;
            const h = document.getElementById('tapHint'); if (h) h.classList.remove('hidden');
            const b = document.getElementById('gameBackBtn'); if (b) b.classList.remove('game-hidden');
            SoundManager.resume();
            this.lastTime = null;
            this.accumulator = 0;
            this.gameLoop();
        }, 600); // ⬅️ Ждём полного завершения перехода
    }

    resetGame() {
        this.bird = { x: 80, y: 300, velocity: 0, radius: 15 };
        this.pipes = []; this.coins = []; this.particles = [];
        this.score = 0; this.earnedCoins = 0; this.pipesPassed = 0;
        this.frameCount = this.pipeInterval - 30;
        const s = document.getElementById('score'); if (s) s.textContent = '0';
        const c = document.getElementById('gameCoinCount'); if (c) c.textContent = '0';
    }

    gameLoop() {
        if (!this.gameRunning) return;
        
        const now = performance.now();
        
        if (this.lastTime === null) {
            this.lastTime = now;
            try { this.render(); } catch (e) {}
            this.animationId = requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        if (dt > 0.1) dt = 0.1;
        if (dt <= 0) dt = 1/60;
        
        this.accumulator += dt;
        
        let updates = 0;
        while (this.accumulator >= this.FIXED_DT && updates < 5) {
            this.update();
            this.accumulator -= this.FIXED_DT;
            updates++;
        }
        
        if (this.accumulator > this.FIXED_DT * 5) {
            this.accumulator = 0;
        }
        
        try { this.render(); } catch (err) { console.error('Render error:', err); }
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.frameCount++;
        
        if (!this.gameStarted) {
            this.bird.y = 300 + Math.sin(this.frameCount * 0.05) * 20;
            return;
        }
        
        this.bird.velocity += this.gravity;
        if (this.bird.velocity > this.terminalVelocity) this.bird.velocity = this.terminalVelocity;
        this.bird.y += this.bird.velocity;
        
        if (this.frameCount % this.pipeInterval === 0) {
            this.addPipe();
            this.pipesPassed++;
            if (this.pipesPassed % 3 === 0 || this.pipesPassed % 4 === 0) this.addCoin();
        }
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;
            
            if (this.checkCollision(pipe)) { this.gameOver(); return; }
            
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                document.getElementById('score').textContent = this.score;
            }
            
            // ✅ ИСПРАВЛЕНО: удаляем только когда труба ушла за левый край видимой области
            if (pipe.x + this.pipeWidth < this.visibleLeft - 50) this.pipes.splice(i, 1);
        }
        
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= this.pipeSpeed;
            const dx = this.bird.x - coin.x; const dy = this.bird.y - coin.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < this.bird.radius + coin.radius + 5) {
                this.earnedCoins++;
                this.addParticles(coin.x, coin.y, '#FFD700');
                SoundManager.playCoin();
                document.getElementById('gameCoinCount').textContent = this.earnedCoins;
                this.coins.splice(i, 1);
                continue;
            }
            // ✅ ИСПРАВЛЕНО: удаляем только когда монета ушла за левый край
            if (coin.x + coin.radius < this.visibleLeft - 50) this.coins.splice(i, 1);
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        
        if (this.bird.y + this.bird.radius > this.VIRTUAL_HEIGHT || this.bird.y - this.bird.radius < 0) {
            this.gameOver();
        }
    }

    addPipe() {
        const min = 60;
        const max = this.VIRTUAL_HEIGHT - this.pipeGap - min;
        const top = Math.random() * (max - min) + min;
        this.pipes.push({
            // ✅ ИСПРАВЛЕНО: появляется ЗА правой границей видимой области
            x: this.visibleRight + 50,
            topHeight: top,
            bottomY: top + this.pipeGap,
            passed: false
        });
    }

    addCoin() {
        const last = this.pipes[this.pipes.length - 1];
        if (last) {
            this.coins.push({
                x: last.x + this.pipeWidth / 2,
                y: last.topHeight + this.pipeGap / 2,
                radius: 12
            });
        }
    }

    addParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                life: 30, color
            });
        }
    }

    checkCollision(pipe) {
        const bL = this.bird.x - this.bird.radius; const bR = this.bird.x + this.bird.radius;
        const bT = this.bird.y - this.bird.radius; const bB = this.bird.y + this.bird.radius;
        if (bR > pipe.x && bL < pipe.x + this.pipeWidth) {
            if (bT < pipe.topHeight || bB > pipe.bottomY) return true;
        }
        return false;
    }

    async gameOver() {
        this.stopGame();
        SoundManager.playCrash();
        gameState.coins += this.earnedCoins;
        gameState.totalGames = (gameState.totalGames || 0) + 1;
        let isNew = false;
        if (this.score > gameState.bestScore) { gameState.bestScore = this.score; isNew = true; }
        await YandexAPI.savePlayerData(gameState);
        if (isNew && this.score > 0) await YandexAPI.submitScore(this.score);
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('earnedCoins').textContent = this.earnedCoins;
        document.getElementById('bestScore').textContent = gameState.bestScore;
        
        ScreenManager.goTo('deathScreen', this);
    }

    async loadLeaderboard() {
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '<li style="justify-content:center;background:transparent;">Загрузка...</li>';
        const players = await YandexAPI.getLeaderboard();
        const inTop = players.some(p => p.uniqueId === gameState.uniqueId);
        let all = [...players];
        if (!inTop && gameState.bestScore > 0) {
            all.push({ rank: null, name: gameState.name + ' (ВЫ)', score: gameState.bestScore, uniqueId: gameState.uniqueId, isPlayer: true });
        }
        all.sort((a, b) => b.score - a.score);
        all = all.slice(0, 11);
        list.innerHTML = '';
        all.forEach((p, i) => {
            const li = document.createElement('li');
            if (p.uniqueId === gameState.uniqueId) li.classList.add('current-player');
            const av = p.avatar ? `<img src="${p.avatar}" class="lb-avatar" alt="">` : '';
            li.innerHTML = `<span>${av}${p.rank || (i + 1)}. ${p.name}</span><span>🏆 ${p.score}</span>`;
            list.appendChild(li);
        });
    }

    render() {
        const theme = THEMES[gameState.theme] || THEMES.day;
        const ctx = this.ctx;
        
        const g = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        g.addColorStop(0, theme.skyTop); g.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = g; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (theme.hasStars) {
            ctx.fillStyle = 'white';
            for (const star of this.stars) {
                const tw = Math.sin(this.frameCount * star.speed + star.twinkle) * 0.5 + 0.5;
                ctx.globalAlpha = tw;
                ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        const celX = this.displayWidth - 80; const celY = 100; const celR = 35 * this.scale;
        if (theme.hasSun) {
            ctx.fillStyle = theme.sunColor; ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(celX, celY, celR * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(celX, celY, celR, 0, Math.PI * 2); ctx.fill();
        }
        if (theme.hasMoon) {
            ctx.fillStyle = 'rgba(255,250,205,0.15)';
            ctx.beginPath(); ctx.arc(celX, celY, celR * 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = theme.moonColor;
            ctx.beginPath(); ctx.arc(celX, celY, celR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.arc(celX - 8 * this.scale, celY - 5 * this.scale, 5 * this.scale, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(celX + 10 * this.scale, celY + 5 * this.scale, 3 * this.scale, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        
        try {
            this.drawClouds(theme);
            this.drawGround(theme);
            for (const p of this.pipes) this.drawPipe(p, theme);
            for (const c of this.coins) this.drawCoin(c);
            this.drawBird();
            for (const p of this.particles) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 30;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        } catch (err) { console.error('Render error:', err); }
        
        ctx.globalAlpha = 1;
        ctx.restore();
        
        if (this.offsetX > 0) {
            const darkColor = theme.hasStars ? 'rgba(5,8,20,0.7)' :
                              theme.skyTop === '#FF6B9D' ? 'rgba(80,20,40,0.5)' :
                              theme.hasTrees ? 'rgba(30,60,40,0.5)' : 'rgba(100,160,200,0.4)';
            const leftGrad = ctx.createLinearGradient(0, 0, this.offsetX, 0);
            leftGrad.addColorStop(0, darkColor); leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = leftGrad; ctx.fillRect(0, 0, this.offsetX, this.canvas.height);
            const rightGrad = ctx.createLinearGradient(this.displayWidth - this.offsetX, 0, this.displayWidth, 0);
            rightGrad.addColorStop(0, 'rgba(0,0,0,0)'); rightGrad.addColorStop(1, darkColor);
            ctx.fillStyle = rightGrad; ctx.fillRect(this.displayWidth - this.offsetX, 0, this.offsetX, this.canvas.height);
        }
    }

    drawClouds(theme) {
        const ctx = this.ctx;
        ctx.fillStyle = theme.cloudColor;
        const totalW = this.visibleWidth + 200;
        for (const cloud of this.clouds) {
            const x = ((cloud.baseX - this.frameCount * cloud.speed) % totalW + totalW) % totalW + this.visibleLeft - 100;
            const y = cloud.y; const s = cloud.scale;
            ctx.beginPath();
            ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
            ctx.arc(x + 22 * s, y - 5 * s, 28 * s, 0, Math.PI * 2);
            ctx.arc(x + 48 * s, y, 22 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawGround(theme) {
        const ctx = this.ctx;
        const startX = this.visibleLeft - 20;
        const totalW = this.visibleWidth + 40;
        if (theme.hasTrees) {
            ctx.fillStyle = theme.ground; ctx.fillRect(startX, this.VIRTUAL_HEIGHT - 15, totalW, 15);
            ctx.fillStyle = '#388E3C';
            const count = Math.ceil(totalW / 10);
            for (let i = 0; i < count; i++) {
                const gx = startX + ((i * 15 + Math.floor(this.frameCount * 0.3)) % totalW + totalW) % totalW;
                ctx.fillRect(gx, this.VIRTUAL_HEIGHT - 18, 2, 6);
            }
        } else {
            ctx.fillStyle = theme.ground; ctx.fillRect(startX, this.VIRTUAL_HEIGHT - 10, totalW, 10);
        }
    }

    drawPipe(pipe, theme) {
        const ctx = this.ctx;
        if (theme.hasTrees) {
            this.drawTree(pipe.x, 0, pipe.topHeight, true, theme);
            this.drawTree(pipe.x, pipe.bottomY, this.VIRTUAL_HEIGHT - pipe.bottomY, false, theme);
            return;
        }
        const g = ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
        g.addColorStop(0, theme.pipeMain); g.addColorStop(0.5, theme.pipeLight); g.addColorStop(1, theme.pipeMain);
        ctx.fillStyle = g;
        ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, this.VIRTUAL_HEIGHT - pipe.bottomY);
        ctx.strokeStyle = theme.pipeDark; ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, this.VIRTUAL_HEIGHT - pipe.bottomY);
        ctx.fillStyle = theme.pipeTop;
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, this.pipeWidth + 10, 20);
        ctx.fillRect(pipe.x - 5, pipe.bottomY, this.pipeWidth + 10, 20);
    }

    drawTree(x, y, height, topDown, theme) {
        if (height <= 0) return;
        const ctx = this.ctx; ctx.save();
        try {
            const tg = ctx.createLinearGradient(x, 0, x + this.pipeWidth, 0);
            tg.addColorStop(0, theme.pipeDark); tg.addColorStop(0.3, theme.pipeMain);
            tg.addColorStop(0.7, theme.pipeLight); tg.addColorStop(1, theme.pipeDark);
            ctx.fillStyle = tg; ctx.fillRect(x, y, this.pipeWidth, height);
            
            ctx.strokeStyle = theme.pipeDark; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
            for (let i = 1; i < 4; i++) {
                const lx = x + (this.pipeWidth / 4) * i;
                ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
            }
            const steps = Math.floor(height / 25);
            for (let i = 0; i < steps; i++) {
                const iy = y + i * 25;
                ctx.beginPath(); ctx.moveTo(x, iy);
                ctx.bezierCurveTo(x + this.pipeWidth * 0.3, iy + 3, x + this.pipeWidth * 0.7, iy - 3, x + this.pipeWidth, iy);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = theme.pipeDark; ctx.lineWidth = 2; ctx.strokeRect(x, y, this.pipeWidth, height);
            
            const capH = 20; const capX = x - 5; const capW = this.pipeWidth + 10;
            const capY = topDown ? y + height - capH : y;
            const lg = ctx.createLinearGradient(capX, capY, capX, capY + capH);
            lg.addColorStop(0, '#2E7D32'); lg.addColorStop(1, '#1B5E20');
            ctx.fillStyle = lg; ctx.fillRect(capX, capY, capW, capH);
            ctx.strokeStyle = '#1B5E20'; ctx.lineWidth = 2; ctx.strokeRect(capX, capY, capW, capH);
            
            ctx.fillStyle = '#388E3C';
            for (let i = 0; i < 4; i++) {
                const lx = capX + (capW / 5) * (i + 1);
                const lby = topDown ? capY + capH : capY;
                const tipY = topDown ? lby + 10 : lby - 10;
                ctx.beginPath(); ctx.moveTo(lx, lby);
                ctx.quadraticCurveTo(lx - 6, (lby + tipY) / 2, lx, tipY);
                ctx.quadraticCurveTo(lx + 6, (lby + tipY) / 2, lx, lby);
                ctx.closePath(); ctx.fill();
            }
            
            if (height > 60) {
                ctx.fillStyle = '#558B2F'; ctx.globalAlpha = 0.6;
                const ms = (Math.floor(x) % 2 === 0) ? 0 : this.pipeWidth - 8;
                const msteps = Math.floor(height / 40);
                for (let i = 0; i < msteps; i++) {
                    const my = y + i * 40 + 10;
                    ctx.beginPath(); ctx.arc(x + ms + 4, my, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + ms + 6, my + 10, 4, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        } catch (err) {
            ctx.globalAlpha = 1; ctx.fillStyle = theme.pipeMain; ctx.fillRect(x, y, this.pipeWidth, height);
        }
        ctx.restore(); ctx.globalAlpha = 1;
    }

    drawCoin(coin) {
        const ctx = this.ctx; ctx.save(); ctx.translate(coin.x, coin.y);
        const sc = Math.abs(Math.cos(this.frameCount * 0.1));
        ctx.scale(Math.max(0.1, sc), 1);
        ctx.fillStyle = 'rgba(255,215,0,0.3)'; ctx.beginPath(); ctx.arc(0, 0, coin.radius + 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 0, coin.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#B8860B'; ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0); ctx.restore();
    }

    drawBird() {
        const ctx = this.ctx; ctx.save(); ctx.translate(this.bird.x, this.bird.y);
        let angle = 0;
        if (this.gameStarted) angle = Math.max(-0.5, Math.min(0.8, this.bird.velocity / 15));
        ctx.rotate(angle);
        try { this.drawSkin(this.frameCount * 0.05, gameState.currentSkin); }
        catch (e) { this.drawStandardBird(this.frameCount * 0.05); }
        ctx.restore();
    }

    drawSkin(t, k) {
        switch(k) {
            case 'standard': this.drawStandardBird(t); break; case 'chicken': this.drawChicken(t); break;
            case 'parrot': this.drawParrot(t); break; case 'dragon': this.drawDragon(t); break;
            case 'plane': this.drawPlane(t); break; case 'rocket': this.drawRocket(t); break;
            case 'ghost': this.drawGhost(t); break; case 'gold': this.drawGoldBird(t); break;
            default: this.drawStandardBird(t);
        }
    }

    drawStandardBird(t) {
        const ctx = this.ctx;
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1.5; ctx.stroke();
        const wY = Math.sin(t * 2) * 5;
        ctx.fillStyle = '#FFA500'; ctx.beginPath(); ctx.ellipse(-3, wY, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(6, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(7, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF6347'; ctx.beginPath();
        ctx.moveTo(13, 0); ctx.lineTo(20, -3); ctx.lineTo(20, 3); ctx.closePath(); ctx.fill();
    }

    drawChicken(t) {
        const ctx = this.ctx;
        const bob = Math.sin(t * 2) * 2;
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, bob, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#DDD'; ctx.lineWidth = 1; ctx.stroke();
        const wY = Math.sin(t * 4) * 3;
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath(); ctx.ellipse(-6, bob + wY, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-6, bob - wY, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(-2, -13 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -14 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -16 + bob, 3, 0, Math.PI * 2); ctx.fill();
        const blink = Math.sin(t * 0.5) > 0.95 ? 0.5 : 2;
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(6, -3 + bob, blink, 0, Math.PI * 2); ctx.fill();
        const bo = Math.sin(t * 3) * 0.5;
        ctx.fillStyle = '#FFA500'; ctx.beginPath();
        ctx.moveTo(12, bob); ctx.lineTo(19, bob - 2 - bo); ctx.lineTo(19, bob + 2 + bo); ctx.closePath(); ctx.fill();
    }

    drawParrot(t) {
        const ctx = this.ctx;
        const w = Math.sin(t * 2) * 3;
        ctx.fillStyle = '#32CD32'; ctx.beginPath(); ctx.arc(0, w, 15, 0, Math.PI * 2); ctx.fill();
        const sp = Math.sin(t * 4) * 6 + 14;
        ctx.fillStyle = '#FF1493'; ctx.beginPath(); ctx.ellipse(-8, w, sp, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4169E1'; ctx.beginPath(); ctx.arc(8, w - 7, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(11, w - 9, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(12, w - 9, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath();
        ctx.moveTo(14, w - 7); ctx.quadraticCurveTo(22, w - 9, 20, w - 4);
        ctx.quadraticCurveTo(18, w - 5, 14, w - 5); ctx.closePath(); ctx.fill();
    }

    drawDragon(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(255,${120 - i * 20},0,${Math.max(0.1, 0.7 - i * 0.1)})`;
            ctx.beginPath(); ctx.arc(-22 - i * 7, 0, Math.max(1, 7 - i * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#8B0000'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
        const wA = Math.sin(t * 2) * 0.6;
        ctx.save(); ctx.rotate(wA); ctx.fillStyle = '#DC143C';
        ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-28, -18); ctx.lineTo(-22, -5); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.rotate(-wA); ctx.fillStyle = '#DC143C';
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(-28, 18); ctx.lineTo(-22, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#2F4F4F'; ctx.beginPath();
        ctx.moveTo(3, -13); ctx.lineTo(6, -22); ctx.lineTo(9, -13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFFF00'; ctx.beginPath(); ctx.arc(8, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(9, -4, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    drawPlane(t) {
        const ctx = this.ctx;
        const sh = Math.sin(t * 15) * 0.5;
        ctx.save(); ctx.translate(sh, 0);
        ctx.fillStyle = '#E0E0E0'; ctx.fillRect(-20, -7, 40, 14);
        ctx.fillStyle = '#FF4444'; ctx.fillRect(-20, -2, 5, 4);
        ctx.fillStyle = '#A0A0A0';
        ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-10, -20); ctx.lineTo(5, -20); ctx.lineTo(10, -7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-10, 20); ctx.lineTo(5, 20); ctx.lineTo(10, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#A0A0A0'; ctx.beginPath();
        ctx.moveTo(-20, -4); ctx.lineTo(-28, -12); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(22, 0); ctx.rotate(t * 25);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#87CEEB'; ctx.fillRect(-2, -4, 5, 5); ctx.fillRect(6, -4, 5, 5);
        ctx.restore();
    }

    drawRocket(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 10; i++) {
            const a = Math.max(0, 0.8 - i * 0.08); const r = Math.max(1, 8 - i * 0.5);
            const g = ctx.createRadialGradient(-22 - i * 4, 0, 0, -22 - i * 4, 0, r);
            g.addColorStop(0, `rgba(255,255,200,${a})`); g.addColorStop(0.5, `rgba(255,150,0,${a * 0.7})`);
            g.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-22 - i * 4, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        const v = Math.sin(t * 20) * 1;
        ctx.save(); ctx.translate(v, 0);
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(-15, -12); ctx.lineTo(-15, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF0000'; ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(25, -4); ctx.lineTo(25, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0000AA';
        ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(-22, -18); ctx.lineTo(-18, -10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-15, 12); ctx.lineTo(-22, 18); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#87CEEB'; ctx.beginPath(); ctx.arc(5, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
    }

    drawGhost(t) {
        const ctx = this.ctx;
        const a = 0.55 + Math.sin(t * 2.5) * 0.25; const w = Math.sin(t * 1.5) * 5;
        ctx.globalAlpha = a; ctx.fillStyle = '#F8F8FF';
        ctx.beginPath(); ctx.arc(0, w, 15, Math.PI, 0, false); ctx.lineTo(15, w + 12);
        for (let i = 0; i < 5; i++) {
            const x = 15 - i * 6;
            ctx.quadraticCurveTo(x - 1.5, w + 16, x - 3, w + 12);
            ctx.quadraticCurveTo(x - 4.5, w + 16, x - 6, w + 12);
        }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-5, w - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, w - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, w + 4, 3, 0, Math.PI * 2); ctx.fill();
    }

    drawGoldBird(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 12; i++) {
            const a = t * 2 + (i * Math.PI / 6); const r = 22 + Math.sin(t * 4 + i) * 4;
            const x = Math.cos(a) * r; const y = Math.sin(a) * r;
            const sa = 0.5 + Math.sin(t * 5 + i * 2) * 0.4;
            ctx.fillStyle = `rgba(255,223,0,${sa})`; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 6; i++) {
            const sx = Math.cos(t * 7 + i) * 18; const sy = Math.sin(t * 7 + i * 1.5) * 18;
            const sa = (Math.sin(t * 10 + i * 3) + 1) / 2;
            ctx.strokeStyle = `rgba(255,255,255,${sa})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3); ctx.stroke();
        }
        const bg = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
        bg.addColorStop(0, '#FFF5B0'); bg.addColorStop(0.5, '#FFD700'); bg.addColorStop(1, '#DAA520');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1.5; ctx.stroke();
        const wY = Math.sin(t * 2) * 5;
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(-3, wY, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath();
        ctx.moveTo(-7, -13); ctx.lineTo(-5, -20); ctx.lineTo(-3, -15); ctx.lineTo(-1, -22);
        ctx.lineTo(1, -15); ctx.lineTo(3, -22); ctx.lineTo(5, -15); ctx.lineTo(7, -20);
        ctx.lineTo(8, -12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#B8860B'; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(6, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(7, -3, 2, 0, Math.PI * 2); ctx.fill();
    }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new FlappyGame(); });