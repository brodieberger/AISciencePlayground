<script lang="ts">
    import { goto } from '$app/navigation';
</script>

<div class="page">
    <a class="back" href="/">← Back</a>

    <div class="content">
        <div class="title-block">
            <span class="icon">⚛</span>
            <h1>Physics Lab</h1>
            <p class="sub">Forces & Motion</p>
        </div>

        <div class="mode-grid">
            <button class="mode-card" onclick={() => goto('/physics/levels')}>
                <span class="mode-icon">🧩</span>
                <span class="mode-label">Puzzle Levels</span>
                <span class="mode-sub">Solve physics challenges with a limited toolbox</span>
                <span class="mode-arrow">→</span>
            </button>

            <button class="mode-card" onclick={() => goto('/physics/sandbox')}>
                <span class="mode-icon">🏗️</span>
                <span class="mode-label">Sandbox</span>
                <span class="mode-sub">Build freely — unlimited tools, no goal required</span>
                <span class="mode-arrow">→</span>
            </button>
        </div>
    </div>
</div>

<style>
:global(html, body) {
    margin: 0; padding: 0;
    height: 100%;
    background: #0b1020;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
}

.page {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0b1020;
}

.back {
    position: absolute;
    top: 20px;
    left: 24px;
    font-size: 0.8rem;
    color: #4a6a7a;
    text-decoration: none;
    letter-spacing: 0.05em;
    transition: color 0.2s;
}
.back:hover { color: #4fc3f7; }

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
}

.title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.icon {
    font-size: 3rem;
    filter: drop-shadow(0 0 12px #4fc3f7);
}

h1 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.8rem;
    margin: 0;
    background: linear-gradient(135deg, #a0d8f0, #4fc3f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.sub {
    font-size: 0.72rem;
    color: #4a6a7a;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin: 0;
}

.mode-grid {
    display: flex;
    gap: 20px;
}

.mode-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 200px;
    padding: 28px 20px 20px;
    background: #0d1828;
    border: 1.5px solid #1a3a5a;
    border-radius: 16px;
    cursor: pointer;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
    color: inherit;
    font-family: inherit;
}
.mode-card:hover {
    transform: translateY(-6px);
    border-color: #4fc3f7;
    background: color-mix(in srgb, #4fc3f7 8%, #0d1828);
    box-shadow: 0 8px 32px #4fc3f730;
}

.mode-icon { font-size: 2.2rem; }

.mode-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.2rem;
    color: #4fc3f7;
}

.mode-sub {
    font-size: 0.68rem;
    color: #4a6a7a;
    line-height: 1.4;
    letter-spacing: 0.03em;
}

.mode-arrow {
    margin-top: 4px;
    font-size: 1rem;
    color: #4fc3f7;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.2s, transform 0.2s;
}
.mode-card:hover .mode-arrow {
    opacity: 0.8;
    transform: translateX(0);
}
</style>
