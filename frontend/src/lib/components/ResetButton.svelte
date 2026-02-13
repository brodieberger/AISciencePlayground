<script>
  export let onclick;
</script>

<button class="reset-btn" on:click={onclick}>
  Reset
</button>

<style>
  .reset-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    background: #1f2937;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }

  .reset-btn:hover {
    background: #374151;
  }

  .reset-btn:active {
    transform: translateY(1px);
  }

  .reset-btn:focus {
    outline: 2px solid #66ccff;
    outline-offset: 2px;
  }
</style>
