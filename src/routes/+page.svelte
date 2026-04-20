<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { uiState } from '$lib/game-ui.svelte';

    // Particle config — mirrors the floating gas particles in the chemistry game
    interface Particle {
        x: number; y: number;
        size: number; color: string;
        dx: number; dy: number;
        opacity: number;
    }

    const COLORS = ['#4fc3f7','#ef9a9a','#80cbc4','#dce775','#ce93d8','#ffcc80','#90caf9'];
    let particles: Particle[] = [];
    let canvas: HTMLCanvasElement;
    let raf: number;

    onMount(() => {
        if (browser) {
            const saved = localStorage.getItem('aiMode');
            if (saved === 'online' || saved === 'local') uiState.aiMode = saved;
        }

        const ctx = canvas.getContext('2d')!;

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Spawn 55 particles
        particles = Array.from({ length: 55 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: 2 + Math.random() * 4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            dx: (Math.random() - 0.5) * 0.4,
            dy: -0.15 - Math.random() * 0.25,
            opacity: 0.2 + Math.random() * 0.5,
        }));

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2,'0');
                ctx.fill();

                p.x += p.dx;
                p.y += p.dy;

                // Wrap around
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;
            }
            raf = requestAnimationFrame(draw);
        }
        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    });

    function toggleAIMode() {
        uiState.aiMode = uiState.aiMode === 'online' ? 'local' : 'online';
        if (browser) localStorage.setItem('aiMode', uiState.aiMode);
    }

    const modes = [
        {
            href: '/physics',
            label: 'Physics',
            icon: '⚛',
            sub: 'Forces & Motion',
            color: '#4fc3f7',
            glow: '#4fc3f740',
            delay: '0.55s',
        },
        {
            href: '/circuitry',
            label: 'Circuitry',
            icon: '⚡',
            sub: 'Circuits & Current',
            color: '#dce775',
            glow: '#dce77540',
            delay: '0.7s',
        },
        {
            href: '/chemistry',
            label: 'Chemistry',
            icon: '⚗',
            sub: 'Elements & Reactions',
            color: '#80cbc4',
            glow: '#80cbc440',
            delay: '0.85s',
        },
    ];
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=JetBrains+Mono:wght@400;600&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="page">
    <!-- Animated particle background -->
    <canvas bind:this={canvas} class="particle-canvas" aria-hidden="true"></canvas>

    <!-- Radial glow backdrop -->
    <div class="backdrop" aria-hidden="true"></div>

    <main class="content">
        <!-- Logo mark -->
        <div class="logo-mark" aria-hidden="true">
            <span class="atom-ring ring-1"></span>
            <span class="atom-ring ring-2"></span>
            <span class="atom-ring ring-3"></span>
            <span class="atom-core">✦</span>
        </div>

        <!-- Title -->
        <div class="title-block">
            <h1 class="title">Illuminate</h1>
            <p class="subtitle">An AI Powered Science Sandbox</p>
        </div>

        <p class="tagline">Pick a lab. Start experimenting.</p>

        <!-- Mode cards -->
        <nav class="mode-grid" aria-label="Game modes">
            {#each modes as mode}
                <a
                    href={mode.href}
                    class="mode-card"
                    style="
                        --c: {mode.color};
                        --glow: {mode.glow};
                        --delay: {mode.delay};
                    "
                >
                    <span class="mode-icon">{mode.icon}</span>
                    <span class="mode-label">{mode.label}</span>
                    <span class="mode-sub">{mode.sub}</span>
                    <span class="mode-arrow">→</span>
                </a>
            {/each}
        </nav>

        <!-- AI mode toggle -->
        <div class="ai-toggle" aria-label="AI mode selector">
            <span class="toggle-label" class:active={uiState.aiMode === 'online'}>Online AI</span>
            <button
                class="toggle-track"
                class:local={uiState.aiMode === 'local'}
                onclick={toggleAIMode}
                aria-pressed={uiState.aiMode === 'local'}
                title={uiState.aiMode === 'online' ? 'Switch to local Ollama AI' : 'Switch to online AI'}
            >
                <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-label" class:active={uiState.aiMode === 'local'}>Local AI</span>
        </div>

        <footer class="footer">
            <span class="footer-dot"></span>
            <span>Created by:<br>Brodie Berger, Travis Matos, Christian Rasmussen, Ibrahim Khan Shovo</span>
            <span class="footer-dot"></span>
        </footer>
    </main>
</div>

<style>
    /* ── Reset & base ── */
    :global(html, body) {
        margin: 0; padding: 0;
        height: 100%;
        background: #0b1020;
        color: #e0e0e0;
        font-family: 'Nunito', sans-serif;
        overflow: hidden;
    }

    /* ── Page shell ── */
    .page {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #0b1020;
    }

    /* ── Particle canvas ── */
    .particle-canvas {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
    }

    /* ── Radial glow ── */
    .backdrop {
        position: absolute;
        inset: 0;
        background:
            radial-gradient(ellipse 60% 50% at 50% 40%,
                #1a3a5a55 0%,
                transparent 70%);
        pointer-events: none;
        z-index: 1;
    }

    /* ── Content ── */
    .content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        text-align: center;
        padding: 20px;
    }

    /* ── Logo mark ── */
    .logo-mark {
        position: relative;
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        animation: fade-up 0.6s ease both;
    }
    .atom-ring {
        position: absolute;
        border-radius: 50%;
        border: 1.5px solid;
        animation: spin linear infinite;
    }
    .ring-1 {
        width: 80px; height: 80px;
        border-color: #4fc3f750;
        animation-duration: 8s;
    }
    .ring-2 {
        width: 56px; height: 56px;
        border-color: #80cbc460;
        animation-duration: 5s;
        animation-direction: reverse;
        transform: rotate(60deg);
    }
    .ring-3 {
        width: 34px; height: 34px;
        border-color: #dce77550;
        animation-duration: 3s;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .atom-core {
        font-size: 1.1rem;
        color: #a0d8f0;
        z-index: 1;
        animation: pulse-glow 2.5s ease-in-out infinite alternate;
    }
    @keyframes pulse-glow {
        from { text-shadow: 0 0 6px #4fc3f7, 0 0 14px #4fc3f760; }
        to   { text-shadow: 0 0 12px #80cbc4, 0 0 28px #80cbc460; }
    }

    /* ── Title ── */
    .title-block {
        animation: fade-up 0.5s 0.15s ease both;
        margin-bottom: 6px;
    }
    .title {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(2.8rem, 7vw, 5rem);
        font-weight: 400;
        margin: 0;
        line-height: 1;
        letter-spacing: 0.02em;
        background: linear-gradient(135deg, #a0d8f0 0%, #80cbc4 40%, #dce775 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 2px 16px #4fc3f730);
    }
    .subtitle {
        font-family: 'JetBrains Mono', monospace;
        font-size: clamp(0.7rem, 2vw, 0.9rem);
        color: #4a7a9b;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        margin: 4px 0 0;
    }

    /* ── Tagline ── */
    .tagline {
        font-size: clamp(0.8rem, 2vw, 1rem);
        color: #4a6a7a;
        margin: 10px 0 28px;
        font-weight: 600;
        letter-spacing: 0.05em;
        animation: fade-up 0.5s 0.35s ease both;
    }

    /* ── Mode cards ── */
    .mode-grid {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: 28px;
    }

    .mode-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 20px 24px 16px;
        width: 140px;
        background: #0d1828;
        border: 1.5px solid color-mix(in srgb, var(--c) 35%, #1a2a3a);
        border-radius: 14px;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        animation: fade-up 0.5s var(--delay) ease both;
        overflow: hidden;
    }
    .mode-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 50% 0%, var(--glow) 0%, transparent 65%);
        opacity: 0;
        transition: opacity 0.3s;
    }
    .mode-card:hover {
        transform: translateY(-5px);
        border-color: var(--c);
        background: color-mix(in srgb, var(--c) 10%, #0d1828);
        box-shadow:
            0 8px 32px var(--glow),
            0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent);
    }
    .mode-card:hover::before { opacity: 1; }

    .mode-icon {
        font-size: 2rem;
        line-height: 1;
        filter: drop-shadow(0 0 8px var(--c));
        transition: transform 0.2s;
        z-index: 1;
    }
    .mode-card:hover .mode-icon { transform: scale(1.15); }

    .mode-label {
        font-family: 'Fredoka One', cursive;
        font-size: 1.15rem;
        color: var(--c);
        letter-spacing: 0.03em;
        z-index: 1;
        line-height: 1.1;
    }
    .mode-sub {
        font-size: 0.62rem;
        color: #4a6a7a;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        z-index: 1;
    }
    .mode-arrow {
        margin-top: 8px;
        font-size: 0.9rem;
        color: var(--c);
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 0.2s, transform 0.2s;
        z-index: 1;
    }
    .mode-card:hover .mode-arrow {
        opacity: 0.8;
        transform: translateX(0);
    }

    /* ── Footer ── */
    .footer {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        color: #2a4a5a;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        animation: fade-up 0.5s 1s ease both;
    }
    .footer-dot {
        width: 3px; height: 3px;
        border-radius: 50%;
        background: #2a4a5a;
    }

    /* ── AI mode toggle ── */
    .ai-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        animation: fade-up 0.5s 0.95s ease both;
    }
    .toggle-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #2a4a5a;
        transition: color 0.2s;
    }
    .toggle-label.active { color: #66ccff; }
    .toggle-track {
        position: relative;
        width: 40px;
        height: 20px;
        border-radius: 10px;
        background: #1a2a3a;
        border: 1px solid #2a4a5a;
        cursor: pointer;
        padding: 0;
        transition: border-color 0.2s, background 0.2s;
    }
    .toggle-track:hover { border-color: #66ccff; }
    .toggle-track.local { background: #0d2030; border-color: #66ccff; }
    .toggle-thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #2a4a5a;
        transition: transform 0.2s, background 0.2s;
    }
    .toggle-track.local .toggle-thumb {
        transform: translateX(20px);
        background: #66ccff;
        box-shadow: 0 0 6px #66ccff;
    }

    /* ── Shared animation ── */
    @keyframes fade-up {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>
