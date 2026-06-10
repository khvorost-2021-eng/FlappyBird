// ==========================================
// ТЕМА ОФОРМЛЕНИЯ
// ==========================================
const THEMES = {
    day: {
        name: T.themeNames.day,
        skyTop: '#87CEEB',
        skyBottom: '#B0E0E6',
        cloudColor: 'rgba(255, 255, 255, 0.8)',
        pipeMain: '#4CAF50',
        pipeLight: '#81C784',
        pipeDark: '#2E7D32',
        pipeTop: '#388E3C',
        ground: '#8BC34A',
        hasSun: true,
        hasMoon: false,
        hasStars: false,
        hasTrees: false,
        sunColor: '#FFEB3B',
        moonColor: '#F5F5DC'
    },
    night: {
        name: T.themeNames.night,
        skyTop: '#0B1026',
        skyBottom: '#1A237E',
        cloudColor: 'rgba(200, 200, 255, 0.25)',
        pipeMain: '#37474F',
        pipeLight: '#546E7A',
        pipeDark: '#1C262B',
        pipeTop: '#263238',
        ground: '#1B5E20',
        hasSun: false,
        hasMoon: true,
        hasStars: true,
        hasTrees: false,
        sunColor: '#FFEB3B',
        moonColor: '#FFFACD'
    },
    sunset: {
        name: T.themeNames.sunset,
        skyTop: '#FF6B9D',
        skyBottom: '#FFA751',
        cloudColor: 'rgba(255, 200, 150, 0.6)',
        pipeMain: '#5D4037',
        pipeLight: '#795548',
        pipeDark: '#3E2723',
        pipeTop: '#4E342E',
        ground: '#8D6E63',
        hasSun: true,
        hasMoon: false,
        hasStars: false,
        hasTrees: false,
        sunColor: '#FF5722',
        moonColor: '#FFFACD'
    },
    forest: {
        name: T.themeNames.forest,
        skyTop: '#A8D5BA',
        skyBottom: '#D4E8C2',
        cloudColor: 'rgba(255, 255, 255, 0.5)',
        pipeMain: '#6D4C41',
        pipeLight: '#8D6E63',
        pipeDark: '#4E342E',
        pipeTop: '#3E2723',
        ground: '#558B2F',
        hasSun: false,
        hasMoon: false,
        hasStars: false,
        hasTrees: true,
        sunColor: '#FFEB3B',
        moonColor: '#FFFACD'
    }
};

// ==========================================
// СОСТОЯНИЕ ИГРЫ И НАСТРОЙКИ
// ==========================================
const gameState = {
    name: T.guest,
    avatar: null,
    uniqueId: 'local',
    coins: 0,
    currentSkin: 'standard',
    ownedSkins: ['standard'],
    bestScore: 0,
    totalGames: 0,
    theme: 'day'
};

const settings = {
    musicVolume: 0.7,
    sfxVolume: 0.8,
    musicMuted: false,
    sfxMuted: false
};

(function loadLocalData() {
    const saved = localStorage.getItem('flappyPlayer');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(gameState, data);
        } catch (e) {}
    }
    const savedSettings = localStorage.getItem('flappySettings');
    if (savedSettings) {
        try {
            Object.assign(settings, JSON.parse(savedSettings));
        } catch (e) {}
    }
})();

// ==========================================
// ЗВУКОВОЙ МЕНЕДЖЕР
// ==========================================
const SoundManager = {
    audioCtx: null,
    musicGain: null,
    sfxGain: null,
    musicPlaying: false,
    musicTimeout: null,
    
    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioCtx.createGain();
            this.musicGain.connect(this.audioCtx.destination);
            this.sfxGain = this.audioCtx.createGain();
            this.sfxGain.connect(this.audioCtx.destination);
            this.updateVolumes();
        } catch (e) {}
    },
    
    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },
    
    updateVolumes() {
        if (!this.audioCtx) return;
        this.musicGain.gain.value = settings.musicMuted ? 0 : settings.musicVolume * 0.3;
        this.sfxGain.gain.value = settings.sfxMuted ? 0 : settings.sfxVolume;
    },
    
    playFlap() {
        if (!this.audioCtx || settings.sfxMuted) return;
        this.resume();
        try {
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {}
    },
    
    playCoin() {
        if (!this.audioCtx || settings.sfxMuted) return;
        this.resume();
        try {
            const now = this.audioCtx.currentTime;
            [880, 1320].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                const startTime = now + i * 0.06;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(startTime);
                osc.stop(startTime + 0.15);
            });
        } catch (e) {}
    },
    
    playCrash() {
        if (!this.audioCtx || settings.sfxMuted) return;
        this.resume();
        try {
            const now = this.audioCtx.currentTime;
            const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.3);
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            const osc = this.audioCtx.createOscillator();
            const oscGain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            oscGain.gain.setValueAtTime(0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(oscGain);
            oscGain.connect(this.sfxGain);
            noise.start(now);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    },
    
    startMusic() {
        if (!this.audioCtx || settings.musicMuted || this.musicPlaying) return;
        this.resume();
        this.musicPlaying = true;
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
                const note = melody[noteIndex];
                const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = note.note;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
                gain.gain.linearRampToValueAtTime(0.1, now + note.dur * 0.7);
                gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur);
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(now);
                osc.stop(now + note.dur);
                if (noteIndex % 4 === 0) {
                    const bass = this.audioCtx.createOscillator();
                    const bassGain = this.audioCtx.createGain();
                    bass.type = 'sine';
                    bass.frequency.value = note.note / 4;
                    bassGain.gain.setValueAtTime(0.2, now);
                    bassGain.gain.exponentialRampToValueAtTime(0.01, now + note.dur * 2);
                    bass.connect(bassGain);
                    bassGain.connect(this.musicGain);
                    bass.start(now);
                    bass.stop(now + note.dur * 2);
                }
            } catch (e) {}
            noteIndex = (noteIndex + 1) % melody.length;
            this.musicTimeout = setTimeout(playNextNote, melody[noteIndex === 0 ? melody.length - 1 : noteIndex - 1].dur * 1000);
        };
        playNextNote();
    },
    
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    }
};

// ==========================================
// YANDEX SDK
// ==========================================
let ysdk = null;
let yandexPlayer = null;
let sdkReady = false;

const YandexAPI = {
    async init() {
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SDK timeout')), 3000)
        );
        try {
            await Promise.race([this._tryInit(), timeout]);
            sdkReady = true;
            await this.syncPlayerData();
            return true;
        } catch (err) {
            sdkReady = false;
            return false;
        }
    },
    
    async _tryInit() {
        let attempts = 0;
        while (typeof YaGames === 'undefined' && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        if (typeof YaGames === 'undefined') throw new Error('YaGames не загружен');
        ysdk = await YaGames.init();
        try {
            yandexPlayer = await ysdk.getPlayer({ scopes: false });
        } catch (e) {}
    },
    
    async syncPlayerData() {
        if (!sdkReady || !yandexPlayer) return;
        try {
            const data = await yandexPlayer.getData([
                'coins', 'currentSkin', 'ownedSkins', 
                'bestScore', 'totalGames', 'theme'
            ]);
            const freshData = {
                name: yandexPlayer.getName() || T.guest,
                avatar: yandexPlayer.getPhoto('small'),
                uniqueId: yandexPlayer.getUniqueID(),
                coins: data.coins ?? gameState.coins,
                currentSkin: data.currentSkin ?? gameState.currentSkin,
                ownedSkins: data.ownedSkins ?? gameState.ownedSkins,
                bestScore: data.bestScore ?? gameState.bestScore,
                totalGames: data.totalGames ?? gameState.totalGames,
                theme: data.theme ?? gameState.theme
            };
            Object.assign(gameState, freshData);
            document.getElementById('coinCount').textContent = gameState.coins;
            const skinsCount = document.getElementById('coinCountSkins');
            if (skinsCount) skinsCount.textContent = gameState.coins;
            const avatarEl = document.getElementById('playerAvatar');
            const nameEl = document.getElementById('playerName');
            if (gameState.avatar && avatarEl) {
                avatarEl.src = gameState.avatar;
                avatarEl.style.display = 'block';
            }
            if (nameEl) nameEl.textContent = gameState.name;
        } catch (err) {}
    },
    
    async savePlayerData(data) {
        try {
            localStorage.setItem('flappyPlayer', JSON.stringify(data));
        } catch (e) {}
        if (!sdkReady || !yandexPlayer) return data;
        try {
            await yandexPlayer.setData({
                coins: data.coins,
                currentSkin: data.currentSkin,
                ownedSkins: data.ownedSkins,
                bestScore: data.bestScore,
                totalGames: data.totalGames,
                theme: data.theme
            }, true);
            await yandexPlayer.setStats({
                highScore: data.bestScore,
                totalCoins: data.coins
            });
        } catch (err) {}
        return data;
    },
    
    async submitScore(score) {
        if (!sdkReady || !ysdk) return false;
        try {
            const lb = await ysdk.getLeaderboards();
            await lb.setLeaderboardScore('flappycores', score);
            return true;
        } catch (err) {
            return false;
        }
    },
    
    async getLeaderboard() {
        if (!sdkReady || !ysdk) return this.getStaticLeaderboard();
        try {
            const lb = await ysdk.getLeaderboards();
            const result = await lb.getLeaderboardEntries('flappycores', {
                quantityTop: 10,
                quantityAround: 2,
                includeUser: true
            });
            return result.entries.map(entry => ({
                rank: entry.rank,
                name: entry.player.publicName || T.guest,
                score: entry.score,
                avatar: entry.player.getPhoto?.('small') || '',
                uniqueId: entry.player.uniqueID
            }));
        } catch (err) {
            return this.getStaticLeaderboard();
        }
    },
    
    getStaticLeaderboard() {
        return [
            { rank: 1, name: "Александр", score: 87, uniqueId: 'a' },
            { rank: 2, name: "Мария", score: 72, uniqueId: 'b' },
            { rank: 3, name: "Дмитрий", score: 65, uniqueId: 'c' },
            { rank: 4, name: "Екатерина", score: 58, uniqueId: 'd' },
            { rank: 5, name: "Иван", score: 51, uniqueId: 'e' },
            { rank: 6, name: "Ольга", score: 44, uniqueId: 'f' },
            { rank: 7, name: "Сергей", score: 38, uniqueId: 'g' },
            { rank: 8, name: "Анна", score: 31, uniqueId: 'h' },
            { rank: 9, name: "Павел", score: 25, uniqueId: 'i' },
            { rank: 10, name: "Наталья", score: 18, uniqueId: 'j' }
        ];
    }
};

// ==========================================
// КОНФИГУРАЦИЯ СКИНОВ
// ==========================================
const SKINS = {
    standard: { price: 0,   name: T.skinNames.standard },
    chicken:  { price: 10,  name: T.skinNames.chicken  },
    parrot:   { price: 20,  name: T.skinNames.parrot   },
    dragon:   { price: 30,  name: T.skinNames.dragon   },
    plane:    { price: 50,  name: T.skinNames.plane    },
    rocket:   { price: 80,  name: T.skinNames.rocket   },
    ghost:    { price: 100, name: T.skinNames.ghost    },
    gold:     { price: 150, name: T.skinNames.gold     }
};

// ==========================================
// КЛАСС ИГРЫ
// ==========================================
class FlappyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.menuCanvas = document.getElementById('menuCanvas');
        this.menuCtx = this.menuCanvas ? this.menuCanvas.getContext('2d') : null;
        
        this.VIRTUAL_WIDTH = 400;
        this.VIRTUAL_HEIGHT = 600;
        this.scale = 1;
        this.scaleX = 1;
        this.scaleY = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.extraWidth = 120; // Фиксированный запас для плавного появления
        
        this.gravity = 0.15;
        this.jumpStrength = -5;
        this.terminalVelocity = 10;
        this.pipeGap = 180;
        this.pipeWidth = 60;
        this.pipeSpeed = 2;
        this.pipeInterval = 110;
        
        this.bird = { x: 80, y: 300, velocity: 0, radius: 15 };
        this.pipes = [];
        this.coins = [];
        this.particles = [];
        this.stars = [];
        this.score = 0;
        this.earnedCoins = 0;
        this.pipesPassed = 0;
        this.frameCount = 0;
        this.gameRunning = false;
        this.gameStarted = false;
        this.animationId = null;
        this.menuAnimId = null;
        this.skinPreviewAnimId = null;
        this.themePreviewAnimIds = new Map();
        
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * this.VIRTUAL_WIDTH,
                y: Math.random() * this.VIRTUAL_HEIGHT * 0.8,
                size: Math.random() * 2 + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        
        this.bindEvents();
        this.updateUIFromState();
        this.startMenuPreview();
        
        SoundManager.init();
        SoundManager.updateVolumes();
        
        YandexAPI.init().catch(err => {});
    }
    
    updateUIFromState() {
        const coinCount = document.getElementById('coinCount');
        if (coinCount) coinCount.textContent = gameState.coins;
        const skinsCount = document.getElementById('coinCountSkins');
        if (skinsCount) skinsCount.textContent = gameState.coins;
        const avatarEl = document.getElementById('playerAvatar');
        const nameEl = document.getElementById('playerName');
        if (gameState.avatar && avatarEl) {
            avatarEl.src = gameState.avatar;
            avatarEl.style.display = 'block';
        }
        if (nameEl) nameEl.textContent = gameState.name;
        const bestScoreEl = document.getElementById('bestScore');
        if (bestScoreEl) bestScoreEl.textContent = gameState.bestScore;
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
        if (skinsBtn) skinsBtn.addEventListener('click', () => {
            this.showScreen('skinsScreen');
        });
        if (settingsBtn) settingsBtn.addEventListener('click', () => {
            this.showScreen('settingsScreen');
            this.renderSettingsScreen();
        });
        if (recordsBtn) recordsBtn.addEventListener('click', () => this.showRecords());
        if (restartBtn) restartBtn.addEventListener('click', () => this.startGame());
        if (menuBtn) menuBtn.addEventListener('click', () => this.goToMenu());
        if (gameBackBtn) gameBackBtn.addEventListener('click', () => this.confirmExit());
        
        document.querySelectorAll('[data-target]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                if (target) this.showScreen(target);
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
                SoundManager.updateVolumes();
                this.saveSettings();
            });
        }
        
        if (sfxSlider) {
            sfxSlider.value = settings.sfxVolume * 100;
            this.updateSliderProgress(sfxSlider);
            sfxSlider.addEventListener('input', (e) => {
                settings.sfxVolume = e.target.value / 100;
                this.updateSliderProgress(e.target);
                document.getElementById('sfxValue').textContent = e.target.value + '%';
                SoundManager.updateVolumes();
                this.saveSettings();
            });
        }
        
        if (musicToggle) {
            this.updateMuteButton(musicToggle, settings.musicMuted);
            musicToggle.addEventListener('click', () => {
                settings.musicMuted = !settings.musicMuted;
                this.updateMuteButton(musicToggle, settings.musicMuted);
                SoundManager.updateVolumes();
                if (settings.musicMuted) {
                    SoundManager.stopMusic();
                } else if (this.gameRunning) {
                    SoundManager.startMusic();
                }
                this.saveSettings();
            });
        }
        
        if (sfxToggle) {
            this.updateMuteButton(sfxToggle, settings.sfxMuted);
            sfxToggle.addEventListener('click', () => {
                settings.sfxMuted = !settings.sfxMuted;
                this.updateMuteButton(sfxToggle, settings.sfxMuted);
                SoundManager.updateVolumes();
                this.saveSettings();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.tap();
            }
        });
        
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.tap();
            });
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.tap();
            }, { passive: false });
        }
        
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    updateSliderProgress(slider) {
        const value = slider.value;
        slider.style.setProperty('--progress', value + '%');
    }
    
    updateMuteButton(btn, muted) {
        if (muted) btn.classList.add('muted');
        else btn.classList.remove('muted');
    }
    
    saveSettings() {
        try {
            localStorage.setItem('flappySettings', JSON.stringify(settings));
        } catch (e) {}
    }
    
    handleResize() {
        if (!this.canvas) return;
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen && gameScreen.classList.contains('active')) {
            this.resizeCanvas();
        }
    }
    
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        this.scaleX = displayWidth / this.VIRTUAL_WIDTH;
        this.scaleY = displayHeight / this.VIRTUAL_HEIGHT;
        
        // Используем масштаб по высоте для пропорций
        this.scale = this.scaleY;
        this.offsetX = (displayWidth - this.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = 0;
        
        // Фиксированный запас для плавного появления (не зависит от ширины экрана)
        this.extraWidth = 120;
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    tap() {
        if (!this.gameRunning) return;
        SoundManager.resume();
        if (!this.gameStarted) {
            this.gameStarted = true;
            const hint = document.getElementById('tapHint');
            if (hint) hint.classList.add('hidden');
            const backBtn = document.getElementById('gameBackBtn');
            if (backBtn) backBtn.classList.add('game-hidden');
            SoundManager.startMusic();
        }
        this.bird.velocity = this.jumpStrength;
        SoundManager.playFlap();
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        
        if (screenId !== 'gameScreen' && this.gameRunning) {
            this.stopGame();
        }
        
        if (screenId !== 'menuScreen' && this.menuAnimId) {
            cancelAnimationFrame(this.menuAnimId);
            this.menuAnimId = null;
        }
        
        if (screenId !== 'skinsScreen' && this.skinPreviewAnimId) {
            cancelAnimationFrame(this.skinPreviewAnimId);
            this.skinPreviewAnimId = null;
        }
        
        if (screenId !== 'settingsScreen') {
            this.themePreviewAnimIds.forEach((id) => {
                cancelAnimationFrame(id);
            });
            this.themePreviewAnimIds.clear();
        }
        
        if (screenId === 'menuScreen') {
            this.updateUIFromState();
            this.startMenuPreview();
        }
        
        if (screenId === 'skinsScreen') {
            this.renderSkinsGrid();
        }
        
        if (screenId === 'settingsScreen') {
            this.renderSettingsScreen();
        }
    }
    
    async goToMenu() {
        await YandexAPI.savePlayerData(gameState);
        SoundManager.stopMusic();
        this.showScreen('menuScreen');
    }
    
    confirmExit() {
        if (this.gameStarted && this.score > 0) {
            if (confirm(T.exitConfirm)) {
                this.goToMenu();
            }
        } else {
            this.goToMenu();
        }
    }
    
    stopGame() {
        this.gameRunning = false;
        SoundManager.stopMusic();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    updateAllCoinDisplays() {
        const coinCount = document.getElementById('coinCount');
        if (coinCount) coinCount.textContent = gameState.coins;
        const skinsCount = document.getElementById('coinCountSkins');
        if (skinsCount) skinsCount.textContent = gameState.coins;
    }
    
    renderSettingsScreen() {
        const musicSlider = document.getElementById('musicSlider');
        const sfxSlider = document.getElementById('sfxSlider');
        const musicToggle = document.getElementById('musicToggle');
        const sfxToggle = document.getElementById('sfxToggle');
        
        if (musicSlider) {
            musicSlider.value = settings.musicVolume * 100;
            this.updateSliderProgress(musicSlider);
            document.getElementById('musicValue').textContent = Math.round(settings.musicVolume * 100) + '%';
        }
        if (sfxSlider) {
            sfxSlider.value = settings.sfxVolume * 100;
            this.updateSliderProgress(sfxSlider);
            document.getElementById('sfxValue').textContent = Math.round(settings.sfxVolume * 100) + '%';
        }
        if (musicToggle) this.updateMuteButton(musicToggle, settings.musicMuted);
        if (sfxToggle) this.updateMuteButton(sfxToggle, settings.sfxMuted);
        
        const grid = document.getElementById('themesGrid');
        if (!grid) return;
        
        this.themePreviewAnimIds.forEach((id) => {
            cancelAnimationFrame(id);
        });
        this.themePreviewAnimIds.clear();
        
        grid.innerHTML = '';
        
        Object.entries(THEMES).forEach(([themeKey, theme]) => {
            const card = document.createElement('div');
            card.className = 'theme-card';
            if (themeKey === gameState.theme) card.classList.add('selected');
            
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 160;
            card.appendChild(canvas);
            
            const label = document.createElement('div');
            label.className = 'theme-label';
            label.textContent = theme.name;
            card.appendChild(label);
            
            const check = document.createElement('div');
            check.className = 'theme-check';
            check.textContent = '✓';
            card.appendChild(check);
            
            card.addEventListener('click', () => this.selectTheme(themeKey));
            
            grid.appendChild(card);
            
            this.startThemePreview(canvas, themeKey);
        });
    }
    
    startThemePreview(canvas, themeKey) {
        const ctx = canvas.getContext('2d');
        const theme = THEMES[themeKey];
        let frame = 0;
        
        const render = () => {
            const settingsScreen = document.getElementById('settingsScreen');
            if (!settingsScreen || !settingsScreen.classList.contains('active')) {
                this.themePreviewAnimIds.delete(canvas);
                return;
            }
            
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, theme.skyTop);
            grad.addColorStop(1, theme.skyBottom);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (theme.hasStars) {
                ctx.fillStyle = 'white';
                for (let i = 0; i < 20; i++) {
                    const twinkle = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
                    ctx.globalAlpha = twinkle;
                    const sx = (i * 37) % canvas.width;
                    const sy = (i * 23) % (canvas.height * 0.6);
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1 + twinkle, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            
            if (theme.hasSun) {
                ctx.fillStyle = theme.sunColor;
                ctx.beginPath();
                ctx.arc(canvas.width - 35, 35, 18, 0, Math.PI * 2);
                ctx.fill();
                if (themeKey === 'day') {
                    ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
                    ctx.beginPath();
                    ctx.arc(canvas.width - 35, 35, 25, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            if (theme.hasMoon) {
                ctx.fillStyle = theme.moonColor;
                ctx.beginPath();
                ctx.arc(canvas.width - 35, 35, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                ctx.arc(canvas.width - 38, 32, 3, 0, Math.PI * 2);
                ctx.arc(canvas.width - 30, 38, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = theme.cloudColor;
            const cloudX = (frame * 0.3) % (canvas.width + 50) - 25;
            ctx.beginPath();
            ctx.arc(cloudX, 50, 10, 0, Math.PI * 2);
            ctx.arc(cloudX + 10, 50, 13, 0, Math.PI * 2);
            ctx.arc(cloudX + 22, 50, 10, 0, Math.PI * 2);
            ctx.fill();
            
            if (theme.hasTrees) {
                for (let i = 0; i < 3; i++) {
                    const tx = (i * 70 + frame * 0.5) % (canvas.width + 50) - 25;
                    ctx.fillStyle = theme.pipeMain;
                    ctx.fillRect(tx, canvas.height - 60, 25, 60);
                    ctx.fillStyle = theme.pipeDark;
                    ctx.fillRect(tx - 3, canvas.height - 68, 31, 8);
                }
            } else {
                for (let i = 0; i < 2; i++) {
                    const px = (i * 100 + frame * 0.5) % (canvas.width + 50) - 25;
                    const topH = 40 + i * 10;
                    const botY = topH + 50;
                    ctx.fillStyle = theme.pipeMain;
                    ctx.fillRect(px, 0, 25, topH);
                    ctx.fillRect(px, botY, 25, canvas.height - botY);
                    ctx.fillStyle = theme.pipeTop;
                    ctx.fillRect(px - 3, topH - 8, 31, 8);
                    ctx.fillRect(px - 3, botY, 31, 8);
                }
            }
            
            ctx.fillStyle = theme.ground;
            ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
            
            frame++;
            const id = requestAnimationFrame(render);
            this.themePreviewAnimIds.set(canvas, id);
        };
        
        render();
    }
    
    async selectTheme(themeKey) {
        if (!THEMES[themeKey]) return;
        gameState.theme = themeKey;
        await YandexAPI.savePlayerData(gameState);
        this.renderSettingsScreen();
    }
    
    startMenuPreview() {
        if (!this.menuCanvas || !this.menuCtx) return;
        
        if (this.menuAnimId) {
            cancelAnimationFrame(this.menuAnimId);
            this.menuAnimId = null;
        }
        
        let frame = 0;
        const render = () => {
            const menuScreen = document.getElementById('menuScreen');
            if (!menuScreen || !menuScreen.classList.contains('active')) {
                this.menuAnimId = null;
                return;
            }
            
            this.menuCtx.clearRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
            
            const theme = THEMES[gameState.theme] || THEMES.day;
            const grad = this.menuCtx.createLinearGradient(0, 0, 0, this.menuCanvas.height);
            grad.addColorStop(0, theme.skyTop);
            grad.addColorStop(1, theme.skyBottom);
            this.menuCtx.fillStyle = grad;
            this.menuCtx.fillRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
            
            if (theme.hasStars) {
                this.menuCtx.fillStyle = 'white';
                for (let i = 0; i < 15; i++) {
                    const twinkle = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
                    this.menuCtx.globalAlpha = twinkle;
                    const sx = (i * 47) % this.menuCanvas.width;
                    const sy = (i * 23) % (this.menuCanvas.height * 0.6);
                    this.menuCtx.beginPath();
                    this.menuCtx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                    this.menuCtx.fill();
                }
                this.menuCtx.globalAlpha = 1;
            }
            
            if (theme.hasSun) {
                this.menuCtx.fillStyle = theme.sunColor;
                this.menuCtx.beginPath();
                this.menuCtx.arc(this.menuCanvas.width - 50, 50, 22, 0, Math.PI * 2);
                this.menuCtx.fill();
            }
            if (theme.hasMoon) {
                this.menuCtx.fillStyle = theme.moonColor;
                this.menuCtx.beginPath();
                this.menuCtx.arc(this.menuCanvas.width - 50, 50, 18, 0, Math.PI * 2);
                this.menuCtx.fill();
            }
            
            this.menuCtx.fillStyle = theme.cloudColor;
            for (let i = 0; i < 3; i++) {
                const x = (frame * 0.5 + i * 120) % (this.menuCanvas.width + 100) - 50;
                const y = 40 + i * 50;
                this.menuCtx.beginPath();
                this.menuCtx.arc(x, y, 18, 0, Math.PI * 2);
                this.menuCtx.arc(x + 18, y, 22, 0, Math.PI * 2);
                this.menuCtx.arc(x + 38, y, 18, 0, Math.PI * 2);
                this.menuCtx.fill();
            }
            
            this.menuCtx.fillStyle = theme.ground;
            this.menuCtx.fillRect(0, this.menuCanvas.height - 10, this.menuCanvas.width, 10);
            
            this.menuCtx.save();
            this.menuCtx.translate(this.menuCanvas.width / 2, this.menuCanvas.height / 2);
            this.menuCtx.scale(1.8, 1.8);
            
            const t = frame * 0.08;
            const birdY = Math.sin(frame * 0.05) * 15;
            this.menuCtx.translate(0, birdY);
            
            const originalCtx = this.ctx;
            this.ctx = this.menuCtx;
            try {
                this.drawSkin(t, gameState.currentSkin);
            } catch (e) {
                console.warn('Menu preview draw error:', e);
            }
            this.ctx = originalCtx;
            
            this.menuCtx.restore();
            
            frame++;
            this.menuAnimId = requestAnimationFrame(render);
        };
        
        render();
    }
    
    renderSkinsGrid() {
        const grid = document.getElementById('skinsGrid');
        if (!grid) return;
        
        if (this.skinPreviewAnimId) {
            cancelAnimationFrame(this.skinPreviewAnimId);
            this.skinPreviewAnimId = null;
        }
        
        grid.innerHTML = '';
        this.updateAllCoinDisplays();
        
        const canvases = [];
        
        Object.entries(SKINS).forEach(([skinKey, skin]) => {
            const card = document.createElement('div');
            card.className = 'skin-card';
            if (skinKey === gameState.currentSkin) card.classList.add('selected');
            
            const preview = document.createElement('canvas');
            preview.className = 'skin-preview';
            preview.width = 80;
            preview.height = 80;
            canvases.push({ canvas: preview, skinKey });
            card.appendChild(preview);
            
            const name = document.createElement('div');
            name.className = 'skin-name';
            name.textContent = skin.name;
            card.appendChild(name);
            
            const price = document.createElement('div');
            price.className = 'skin-price';
            price.textContent = skin.price === 0 ? T.free : `🪙 ${skin.price}`;
            card.appendChild(price);
            
            const btn = document.createElement('button');
            btn.className = 'skin-btn';
            
            if (skinKey === gameState.currentSkin) {
                btn.textContent = T.selected;
                btn.classList.add('selected');
                btn.disabled = true;
            } else if (gameState.ownedSkins.includes(skinKey)) {
                btn.textContent = T.select;
                btn.classList.add('select');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectSkin(skinKey);
                });
            } else {
                btn.textContent = `${T.buy} 🪙${skin.price}`;
                btn.classList.add('buy');
                if (gameState.coins < skin.price) {
                    btn.disabled = true;
                } else {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.buySkin(skinKey);
                    });
                }
            }
            
            card.appendChild(btn);
            grid.appendChild(card);
        });
        
        this.startAllSkinPreviews(canvases);
    }
    
    startAllSkinPreviews(canvases) {
        const contexts = canvases.map(({ canvas, skinKey }) => ({
            ctx: canvas.getContext('2d'),
            canvas,
            skinKey
        }));
        
        let frame = 0;
        
        const render = () => {
            const skinsScreen = document.getElementById('skinsScreen');
            if (!skinsScreen || !skinsScreen.classList.contains('active')) {
                this.skinPreviewAnimId = null;
                return;
            }
            
            contexts.forEach(({ ctx, canvas, skinKey }) => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const theme = THEMES[gameState.theme] || THEMES.day;
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0, theme.skyTop);
                grad.addColorStop(1, theme.skyBottom);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(1.4, 1.4);
                
                const originalCtx = this.ctx;
                this.ctx = ctx;
                try {
                    this.drawSkin(frame * 0.08, skinKey);
                } catch (e) {
                    console.warn('Skin preview draw error:', e);
                }
                this.ctx = originalCtx;
                
                ctx.restore();
            });
            
            frame++;
            this.skinPreviewAnimId = requestAnimationFrame(render);
        };
        
        render();
    }
    
    async buySkin(skinKey) {
        const price = SKINS[skinKey].price;
        if (gameState.coins < price) return;
        gameState.coins -= price;
        if (!gameState.ownedSkins.includes(skinKey)) {
            gameState.ownedSkins.push(skinKey);
        }
        gameState.currentSkin = skinKey;
        await YandexAPI.savePlayerData(gameState);
        this.updateAllCoinDisplays();
        this.renderSkinsGrid();
    }
    
    async selectSkin(skinKey) {
        gameState.currentSkin = skinKey;
        await YandexAPI.savePlayerData(gameState);
        this.renderSkinsGrid();
    }
    
    startGame() {
        this.showScreen('gameScreen');
        setTimeout(() => this.resizeCanvas(), 50);
        this.resetGame();
        this.gameRunning = true;
        this.gameStarted = false;
        const hint = document.getElementById('tapHint');
        if (hint) hint.classList.remove('hidden');
        const backBtn = document.getElementById('gameBackBtn');
        if (backBtn) backBtn.classList.remove('game-hidden');
        SoundManager.resume();
        
        // Первая труба появится уже через ~30 кадров
        this.frameCount = this.pipeInterval - 30;
        
        this.gameLoop();
    }
    
    resetGame() {
        this.bird = { x: 80, y: 300, velocity: 0, radius: 15 };
        this.pipes = [];
        this.coins = [];
        this.particles = [];
        this.score = 0;
        this.earnedCoins = 0;
        this.pipesPassed = 0;
        this.frameCount = 0;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = '0';
        const coinEl = document.getElementById('gameCoinCount');
        if (coinEl) coinEl.textContent = '0';
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        try {
            this.update();
            this.render();
        } catch (err) {
            console.error('Game loop error:', err);
        }
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.frameCount++;
        
        if (!this.gameStarted) {
            this.bird.y = 300 + Math.sin(this.frameCount * 0.05) * 20;
            return;
        }
        
        this.bird.velocity += this.gravity;
        if (this.bird.velocity > this.terminalVelocity) {
            this.bird.velocity = this.terminalVelocity;
        }
        this.bird.y += this.bird.velocity;
        
        if (this.frameCount % this.pipeInterval === 0) {
            this.addPipe();
            this.pipesPassed++;
            if (this.pipesPassed % 3 === 0 || this.pipesPassed % 4 === 0) {
                this.addCoin();
            }
        }
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;
            
            if (this.checkCollision(pipe)) {
                this.gameOver();
                return;
            }
            
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                document.getElementById('score').textContent = this.score;
            }
            
            // Удаление только когда труба полностью ушла за левый край
            if (pipe.x + this.pipeWidth < -this.pipeWidth * 2) {
                this.pipes.splice(i, 1);
            }
        }
        
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= this.pipeSpeed;
            const dx = this.bird.x - coin.x;
            const dy = this.bird.y - coin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.bird.radius + coin.radius + 5) {
                this.earnedCoins++;
                this.addParticles(coin.x, coin.y, '#FFD700');
                SoundManager.playCoin();
                document.getElementById('gameCoinCount').textContent = this.earnedCoins;
                this.coins.splice(i, 1);
                continue;
            }
            if (coin.x + coin.radius < -this.pipeWidth * 2) {
                this.coins.splice(i, 1);
            }
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        
        if (this.bird.y + this.bird.radius > this.VIRTUAL_HEIGHT ||
            this.bird.y - this.bird.radius < 0) {
            this.gameOver();
        }
    }
    
    addPipe() {
        const minHeight = 60;
        const maxHeight = this.VIRTUAL_HEIGHT - this.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        // Труба создаётся сразу за правым краем виртуальной области
        // + небольшой запас для плавного появления
        this.pipes.push({
            x: this.VIRTUAL_WIDTH + this.pipeWidth,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            passed: false
        });
    }
    
    addCoin() {
        const lastPipe = this.pipes[this.pipes.length - 1];
        if (lastPipe) {
            this.coins.push({
                x: lastPipe.x + this.pipeWidth / 2,
                y: lastPipe.topHeight + this.pipeGap / 2,
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
                life: 30,
                color
            });
        }
    }
    
    checkCollision(pipe) {
        const bL = this.bird.x - this.bird.radius;
        const bR = this.bird.x + this.bird.radius;
        const bT = this.bird.y - this.bird.radius;
        const bB = this.bird.y + this.bird.radius;
        
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
        let isNewBest = false;
        if (this.score > gameState.bestScore) {
            gameState.bestScore = this.score;
            isNewBest = true;
        }
        await YandexAPI.savePlayerData(gameState);
        if (isNewBest && this.score > 0) {
            await YandexAPI.submitScore(this.score);
        }
        this.showScreen('deathScreen');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('earnedCoins').textContent = this.earnedCoins;
        document.getElementById('bestScore').textContent = gameState.bestScore;
    }
    
    async showRecords() {
        this.showScreen('recordsScreen');
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '<li style="justify-content:center; background:transparent;">Загрузка...</li>';
        const players = await YandexAPI.getLeaderboard();
        const inTop = players.some(p => p.uniqueId === gameState.uniqueId);
        let all = [...players];
        if (!inTop && gameState.bestScore > 0) {
            all.push({
                rank: null,
                name: gameState.name + ' (ВЫ)',
                score: gameState.bestScore,
                uniqueId: gameState.uniqueId,
                isPlayer: true
            });
        }
        all.sort((a, b) => b.score - a.score);
        all = all.slice(0, 11);
        list.innerHTML = '';
        all.forEach((p, index) => {
            const li = document.createElement('li');
            if (p.uniqueId === gameState.uniqueId) {
                li.classList.add('current-player');
            }
            const avatarHtml = p.avatar 
                ? `<img src="${p.avatar}" class="lb-avatar" alt="">` 
                : '';
            li.innerHTML = `
                <span>${avatarHtml}${p.rank || (index + 1)}. ${p.name}</span>
                <span>🏆 ${p.score}</span>
            `;
            list.appendChild(li);
        });
    }
    
    // ==========================================
    // РЕНДЕР
    // ==========================================
    render() {
        const theme = THEMES[gameState.theme] || THEMES.day;
        const ctx = this.ctx;
        
        // 1. Фон на весь canvas
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, theme.skyTop);
        grad.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 2. Звёзды (ночная тема) — на весь canvas
        if (theme.hasStars) {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 100; i++) {
                const sx = (i * 137.5) % this.canvas.width;
                const sy = (i * 73.3) % (this.canvas.height * 0.8);
                const twinkle = Math.sin(this.frameCount * 0.05 + i) * 0.5 + 0.5;
                ctx.globalAlpha = twinkle;
                ctx.beginPath();
                ctx.arc(sx, sy, 1 + twinkle, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        // 3. Солнце/Луна
        const celestialX = this.canvas.width - 80 * this.scaleX;
        const celestialY = 100 * this.scaleY;
        
        if (theme.hasSun) {
            ctx.fillStyle = theme.sunColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 50 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 35 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (theme.hasMoon) {
            ctx.fillStyle = 'rgba(255, 250, 205, 0.15)';
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 55 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = theme.moonColor;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 35 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.arc(celestialX - 8 * this.scale, celestialY - 5 * this.scale, 5 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(celestialX + 10 * this.scale, celestialY + 5 * this.scale, 3 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(celestialX, celestialY + 12 * this.scale, 4 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 4. Применяем масштаб для игровых объектов
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        
        try {
            this.drawClouds(theme);
            this.drawGround(theme);
            this.pipes.forEach(p => this.drawPipe(p, theme));
            this.coins.forEach(c => this.drawCoin(c));
            this.drawBird();
            
            this.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 30;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        } catch (err) {
            console.error('Render error:', err);
        }
        
        // ВАЖНО: сбрасываем globalAlpha ПЕРЕД restore!
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }
    
    drawClouds(theme) {
        const ctx = this.ctx;
        ctx.fillStyle = theme.cloudColor;
        const totalWidth = this.VIRTUAL_WIDTH + this.pipeWidth * 3;
        for (let i = 0; i < 5; i++) {
            const x = ((this.frameCount * 0.3 + i * 130) % totalWidth) - this.pipeWidth;
            const y = 40 + i * 90;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.arc(x + 22, y - 5, 28, 0, Math.PI * 2);
            ctx.arc(x + 48, y, 22, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawGround(theme) {
        const ctx = this.ctx;
        const startX = -this.pipeWidth;
        const totalWidth = this.VIRTUAL_WIDTH + this.pipeWidth * 2;
        
        if (theme.hasTrees) {
            ctx.fillStyle = theme.ground;
            ctx.fillRect(startX, this.VIRTUAL_HEIGHT - 15, totalWidth, 15);
            
            ctx.fillStyle = '#388E3C';
            for (let i = 0; i < Math.ceil(totalWidth / 10); i++) {
                const gx = startX + ((i * 15 + Math.floor(this.frameCount * 0.3)) % totalWidth);
                ctx.fillRect(gx, this.VIRTUAL_HEIGHT - 18, 2, 6);
            }
        } else {
            ctx.fillStyle = theme.ground;
            ctx.fillRect(startX, this.VIRTUAL_HEIGHT - 10, totalWidth, 10);
        }
    }
    
    drawPipe(pipe, theme) {
        const ctx = this.ctx;
        
        if (theme.hasTrees) {
            this.drawTree(pipe.x, 0, pipe.topHeight, true, theme);
            this.drawTree(pipe.x, pipe.bottomY, this.VIRTUAL_HEIGHT - pipe.bottomY, false, theme);
            return;
        }
        
        const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
        grad.addColorStop(0, theme.pipeMain);
        grad.addColorStop(0.5, theme.pipeLight);
        grad.addColorStop(1, theme.pipeMain);
        
        ctx.fillStyle = grad;
        ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, this.VIRTUAL_HEIGHT - pipe.bottomY);
        
        ctx.strokeStyle = theme.pipeDark;
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, this.VIRTUAL_HEIGHT - pipe.bottomY);
        
        ctx.fillStyle = theme.pipeTop;
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, this.pipeWidth + 10, 20);
        ctx.fillRect(pipe.x - 5, pipe.bottomY, this.pipeWidth + 10, 20);
    }
    
    // ✅ ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ БЕЗОПАСНАЯ ВЕРСИЯ
    drawTree(x, y, height, topDown, theme) {
        if (height <= 0) return;
        
        const ctx = this.ctx;
        
        // Сохраняем состояние ctx
        ctx.save();
        
        try {
            // ОСНОВНОЙ СТВОЛ
            const trunkGrad = ctx.createLinearGradient(x, 0, x + this.pipeWidth, 0);
            trunkGrad.addColorStop(0, theme.pipeDark);
            trunkGrad.addColorStop(0.3, theme.pipeMain);
            trunkGrad.addColorStop(0.7, theme.pipeLight);
            trunkGrad.addColorStop(1, theme.pipeDark);
            
            ctx.fillStyle = trunkGrad;
            ctx.fillRect(x, y, this.pipeWidth, height);
            
            // Текстура коры
            ctx.strokeStyle = theme.pipeDark;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            
            // Вертикальные линии
            for (let i = 1; i < 4; i++) {
                const lineX = x + (this.pipeWidth / 4) * i;
                ctx.beginPath();
                ctx.moveTo(lineX, y);
                ctx.lineTo(lineX, y + height);
                ctx.stroke();
            }
            
            // Горизонтальные борозды
            const steps = Math.floor(height / 25);
            for (let i = 0; i < steps; i++) {
                const iy = y + i * 25;
                ctx.beginPath();
                ctx.moveTo(x, iy);
                ctx.bezierCurveTo(
                    x + this.pipeWidth * 0.3, iy + 3,
                    x + this.pipeWidth * 0.7, iy - 3,
                    x + this.pipeWidth, iy
                );
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
            
            // Обводка ствола
            ctx.strokeStyle = theme.pipeDark;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.pipeWidth, height);
            
            // Шляпка с листьями
            const capHeight = 20;
            const capX = x - 5;
            const capWidth = this.pipeWidth + 10;
            const capY = topDown ? y + height - capHeight : y;
            
            const leafGrad = ctx.createLinearGradient(capX, capY, capX, capY + capHeight);
            leafGrad.addColorStop(0, '#2E7D32');
            leafGrad.addColorStop(1, '#1B5E20');
            
            ctx.fillStyle = leafGrad;
            ctx.fillRect(capX, capY, capWidth, capHeight);
            
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 2;
            ctx.strokeRect(capX, capY, capWidth, capHeight);
            
            // ✅ ИСПРАВЛЕНО: листики рисуем через quadraticCurveTo БЕЗ отрицательных радиусов
            ctx.fillStyle = '#388E3C';
            const leavesCount = 4;
            for (let i = 0; i < leavesCount; i++) {
                const leafX = capX + (capWidth / (leavesCount + 1)) * (i + 1);
                const leafBaseY = topDown ? capY + capHeight : capY;
                // Направление кончика: вниз для верхнего дерева, вверх для нижнего
                const tipY = topDown ? leafBaseY + 10 : leafBaseY - 10;
                
                ctx.beginPath();
                ctx.moveTo(leafX, leafBaseY);
                ctx.quadraticCurveTo(leafX - 6, (leafBaseY + tipY) / 2, leafX, tipY);
                ctx.quadraticCurveTo(leafX + 6, (leafBaseY + tipY) / 2, leafX, leafBaseY);
                ctx.closePath();
                ctx.fill();
            }
            
            // Мох
            if (height > 60) {
                ctx.fillStyle = '#558B2F';
                ctx.globalAlpha = 0.6;
                const mossSide = (Math.floor(x) % 2 === 0) ? 0 : this.pipeWidth - 8;
                const mossSteps = Math.floor(height / 40);
                for (let i = 0; i < mossSteps; i++) {
                    const my = y + i * 40 + 10;
                    ctx.beginPath();
                    ctx.arc(x + mossSide + 4, my, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(x + mossSide + 6, my + 10, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        } catch (err) {
            // Fallback: если что-то сломалось, рисуем простой прямоугольник
            console.warn('drawTree error, fallback:', err);
            ctx.globalAlpha = 1;
            ctx.fillStyle = theme.pipeMain;
            ctx.fillRect(x, y, this.pipeWidth, height);
            ctx.strokeStyle = theme.pipeDark;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.pipeWidth, height);
        }
        
        // Восстанавливаем состояние ctx (важно!)
        ctx.restore();
        
        // Принудительно сбрасываем globalAlpha
        ctx.globalAlpha = 1;
    }
    
    drawCoin(coin) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(coin.x, coin.y);
        const scale = Math.abs(Math.cos(this.frameCount * 0.1));
        ctx.scale(Math.max(0.1, scale), 1);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#B8860B';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
    }
    
    drawBird() {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.bird.x, this.bird.y);
        let angle = 0;
        if (this.gameStarted) {
            angle = Math.max(-0.5, Math.min(0.8, this.bird.velocity / 15));
        }
        ctx.rotate(angle);
        try {
            this.drawSkin(this.frameCount * 0.05, gameState.currentSkin);
        } catch (e) {
            // Fallback на стандартную птицу если скин сломан
            this.drawStandardBird(this.frameCount * 0.05);
        }
        ctx.restore();
    }
    
    drawSkin(t, skinKey) {
        switch(skinKey) {
            case 'standard': this.drawStandardBird(t); break;
            case 'chicken':  this.drawChicken(t); break;
            case 'parrot':   this.drawParrot(t); break;
            case 'dragon':   this.drawDragon(t); break;
            case 'plane':    this.drawPlane(t); break;
            case 'rocket':   this.drawRocket(t); break;
            case 'ghost':    this.drawGhost(t); break;
            case 'gold':     this.drawGoldBird(t); break;
            default:         this.drawStandardBird(t);
        }
    }
    
    drawStandardBird(t) {
        const ctx = this.ctx;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const wY = Math.sin(t * 2) * 5;
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(-3, wY, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(6, -3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(7, -3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(20, -3);
        ctx.lineTo(20, 3);
        ctx.closePath();
        ctx.fill();
    }
    
    drawChicken(t) {
        const ctx = this.ctx;
        const bob = Math.sin(t * 2) * 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, bob, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DDD';
        ctx.lineWidth = 1;
        ctx.stroke();
        const wY = Math.sin(t * 4) * 3;
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath();
        ctx.ellipse(-6, bob + wY, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-6, bob - wY, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-2, -13 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -14 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -16 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        const blink = Math.sin(t * 0.5) > 0.95 ? 0.5 : 2;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(6, -3 + bob, blink, 0, Math.PI * 2);
        ctx.fill();
        const beakOpen = Math.sin(t * 3) * 0.5;
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(12, bob);
        ctx.lineTo(19, bob - 2 - beakOpen);
        ctx.lineTo(19, bob + 2 + beakOpen);
        ctx.closePath();
        ctx.fill();
    }
    
    drawParrot(t) {
        const ctx = this.ctx;
        const wave = Math.sin(t * 2) * 3;
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(0, wave, 15, 0, Math.PI * 2);
        ctx.fill();
        const spread = Math.sin(t * 4) * 6 + 14;
        ctx.fillStyle = '#FF1493';
        ctx.beginPath();
        ctx.ellipse(-8, wave, spread, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(8, wave - 7, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(11, wave - 9, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(12, wave - 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(14, wave - 7);
        ctx.quadraticCurveTo(22, wave - 9, 20, wave - 4);
        ctx.quadraticCurveTo(18, wave - 5, 14, wave - 5);
        ctx.closePath();
        ctx.fill();
    }
    
    drawDragon(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(255, ${120 - i * 20}, 0, ${Math.max(0.1, 0.7 - i * 0.1)})`;
            ctx.beginPath();
            ctx.arc(-22 - i * 7, 0, Math.max(1, 7 - i * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        const wA = Math.sin(t * 2) * 0.6;
        ctx.save();
        ctx.rotate(wA);
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(-8, -5);
        ctx.lineTo(-28, -18);
        ctx.lineTo(-22, -5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.rotate(-wA);
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(-8, 5);
        ctx.lineTo(-28, 18);
        ctx.lineTo(-22, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#2F4F4F';
        ctx.beginPath();
        ctx.moveTo(3, -13);
        ctx.lineTo(6, -22);
        ctx.lineTo(9, -13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(8, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(9, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawPlane(t) {
        const ctx = this.ctx;
        const shake = Math.sin(t * 15) * 0.5;
        ctx.save();
        ctx.translate(shake, 0);
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(-20, -7, 40, 14);
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(-20, -2, 5, 4);
        ctx.fillStyle = '#A0A0A0';
        ctx.beginPath();
        ctx.moveTo(-5, -7);
        ctx.lineTo(-10, -20);
        ctx.lineTo(5, -20);
        ctx.lineTo(10, -7);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 7);
        ctx.lineTo(-10, 20);
        ctx.lineTo(5, 20);
        ctx.lineTo(10, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#A0A0A0';
        ctx.beginPath();
        ctx.moveTo(-20, -4);
        ctx.lineTo(-28, -12);
        ctx.lineTo(-20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.translate(22, 0);
        ctx.rotate(t * 25);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(14, 0);
        ctx.moveTo(0, -14);
        ctx.lineTo(0, 14);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-2, -4, 5, 5);
        ctx.fillRect(6, -4, 5, 5);
        ctx.restore();
    }
    
    drawRocket(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 10; i++) {
            const alpha = Math.max(0, 0.8 - i * 0.08);
            const r = Math.max(1, 8 - i * 0.5);
            const grad = ctx.createRadialGradient(-22 - i * 4, 0, 0, -22 - i * 4, 0, r);
            grad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
            grad.addColorStop(0.5, `rgba(255, 150, 0, ${alpha * 0.7})`);
            grad.addColorStop(1, `rgba(255, 50, 0, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(-22 - i * 4, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }
        const vibrate = Math.sin(t * 20) * 1;
        ctx.save();
        ctx.translate(vibrate, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(25, -4);
        ctx.lineTo(25, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0000AA';
        ctx.beginPath();
        ctx.moveTo(-15, -12);
        ctx.lineTo(-22, -18);
        ctx.lineTo(-18, -10);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-15, 12);
        ctx.lineTo(-22, 18);
        ctx.lineTo(-18, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(5, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
    
    drawGhost(t) {
        const ctx = this.ctx;
        const alpha = 0.55 + Math.sin(t * 2.5) * 0.25;
        const wave = Math.sin(t * 1.5) * 5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#F8F8FF';
        ctx.beginPath();
        ctx.arc(0, wave, 15, Math.PI, 0, false);
        ctx.lineTo(15, wave + 12);
        for (let i = 0; i < 5; i++) {
            const x = 15 - i * 6;
            ctx.quadraticCurveTo(x - 1.5, wave + 16, x - 3, wave + 12);
            ctx.quadraticCurveTo(x - 4.5, wave + 16, x - 6, wave + 12);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5, wave - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, wave - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, wave + 4, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawGoldBird(t) {
        const ctx = this.ctx;
        for (let i = 0; i < 12; i++) {
            const angle = t * 2 + (i * Math.PI / 6);
            const r = 22 + Math.sin(t * 4 + i) * 4;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const sparkleAlpha = 0.5 + Math.sin(t * 5 + i * 2) * 0.4;
            ctx.fillStyle = `rgba(255, 223, 0, ${sparkleAlpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 6; i++) {
            const sX = Math.cos(t * 7 + i) * 18;
            const sY = Math.sin(t * 7 + i * 1.5) * 18;
            const sAlpha = (Math.sin(t * 10 + i * 3) + 1) / 2;
            ctx.strokeStyle = `rgba(255, 255, 255, ${sAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sX - 3, sY);
            ctx.lineTo(sX + 3, sY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sX, sY - 3);
            ctx.lineTo(sX, sY + 3);
            ctx.stroke();
        }
        const bodyGrad = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
        bodyGrad.addColorStop(0, '#FFF5B0');
        bodyGrad.addColorStop(0.5, '#FFD700');
        bodyGrad.addColorStop(1, '#DAA520');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const wY = Math.sin(t * 2) * 5;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(-3, wY, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-7, -13);
        ctx.lineTo(-5, -20);
        ctx.lineTo(-3, -15);
        ctx.lineTo(-1, -22);
        ctx.lineTo(1, -15);
        ctx.lineTo(3, -22);
        ctx.lineTo(5, -15);
        ctx.lineTo(7, -20);
        ctx.lineTo(8, -12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(6, -3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(7, -3, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new FlappyGame();
});