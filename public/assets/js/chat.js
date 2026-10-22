import { getOrCreateDeviceId, detectPlatform } from './utils/device.js';
import { sendChatMessage } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const heroWrapper = document.getElementById('heroWrapper');
  const chatHistoryContainer = document.getElementById('chatHistoryContainer');
  const inputSectionContainer = document.getElementById('inputSectionContainer');
  const chatBottomAnchor = document.getElementById('chatBottomAnchor');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const brandHomeBtn = document.getElementById('brandHomeBtn');

  const deviceId = getOrCreateDeviceId();
  const platform = detectPlatform();
  const conversationHistory = [];
  let isGenerating = false;
  let autoScrollActive = true;
  let currentAbortController = null;
  let submitTimestamp = 0;

  function getScrollPosition() {
    return Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );
  }

  function getFullPageHeight() {
    const scEl = document.scrollingElement || document.documentElement;
    return Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      document.body?.offsetHeight || 0,
      document.documentElement?.offsetHeight || 0,
      scEl?.scrollHeight || 0,
      chatHistoryContainer?.scrollHeight || 0
    );
  }

  function isNearBottom(threshold = 280) {
    const scrollPos = getScrollPosition();
    const windowHeight = window.innerHeight;
    const totalHeight = getFullPageHeight();
    return (totalHeight - (scrollPos + windowHeight)) < threshold;
  }

  function scrollToBottom(smooth = true) {
    const targetY = getFullPageHeight();
    const behavior = smooth ? 'smooth' : 'auto';

    if (chatBottomAnchor) {
      try {
        chatBottomAnchor.scrollIntoView({ behavior, block: 'end' });
      } catch (_) {}
    }

    try {
      window.scrollTo({ top: targetY, behavior });
    } catch (_) {}

    if (document.scrollingElement && typeof document.scrollingElement.scrollTo === 'function') {
      try {
        document.scrollingElement.scrollTo({ top: targetY, behavior });
      } catch (_) {}
    }

    if (document.documentElement && typeof document.documentElement.scrollTo === 'function') {
      try {
        document.documentElement.scrollTo({ top: targetY, behavior });
      } catch (_) {}
    }

    if (document.body && typeof document.body.scrollTo === 'function') {
      try {
        document.body.scrollTo({ top: targetY, behavior });
      } catch (_) {}
    }

    if (!smooth) {
      if (document.documentElement) document.documentElement.scrollTop = targetY;
      if (document.body) document.body.scrollTop = targetY;
    }
  }

  window.addEventListener('wheel', (e) => {
    if (e.deltaY < -2) {
      autoScrollActive = false;
    } else if (e.deltaY > 2 && isNearBottom()) {
      autoScrollActive = true;
    }
  }, { passive: true });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const delta = e.touches[0].clientY - touchStartY;
      if (delta > 15) {
        autoScrollActive = false;
      } else if (delta < -15 && isNearBottom()) {
        autoScrollActive = true;
      }
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (isNearBottom()) {
      autoScrollActive = true;
    }
  }, { passive: true });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) return;
      handleSubmit();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (isGenerating) {
      handleStop();
    } else {
      handleSubmit();
    }
  });

  function handleStop() {
    if (Date.now() - submitTimestamp < 450) {
      return;
    }
    if (currentAbortController) {
      currentAbortController.abort();
    }
  }

  function updateSendButtonState(generating) {
    if (generating) {
      sendBtn.classList.add('is-generating');
      sendBtn.setAttribute('aria-label', 'Hentikan respons');
      sendBtn.disabled = false;
    } else {
      sendBtn.classList.remove('is-generating');
      sendBtn.setAttribute('aria-label', 'Kirim Pesan');
      if (chatInput.disabled) {
        sendBtn.disabled = true;
      } else {
        sendBtn.disabled = false;
      }
    }
  }

  async function handleSubmit() {
    const text = chatInput.value.trim();
    if (!text || isGenerating) return;

    submitTimestamp = Date.now();

    if (conversationHistory.length === 0) {
      heroWrapper.classList.add('hidden');
      chatHistoryContainer.classList.add('active');
      inputSectionContainer.classList.add('pinned-bottom');
      document.getElementById('appFooter')?.classList.add('hidden');
    }

    autoScrollActive = true;
    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    isGenerating = true;
    currentAbortController = new AbortController();
    updateSendButtonState(true);

    const botRow = document.createElement('div');
    botRow.className = 'message-row bot';
    botRow.innerHTML = `
      <img src="/assets/images/farrel-avatar.png" alt="Farrel" class="bot-avatar-badge">
      <div class="message-bubble">
        <div class="typing-indicator">
          <span class="typing-text">mengetik</span>
          <span class="typing-dots"><span></span><span></span><span></span></span>
        </div>
        <span class="bubble-content"></span><span class="typing-cursor" style="display: none;"></span>
      </div>
    `;
    
    chatHistoryContainer.appendChild(botRow);
    if (chatBottomAnchor) {
      chatHistoryContainer.appendChild(chatBottomAnchor);
    }

    scrollToBottom(true);
    setTimeout(() => scrollToBottom(true), 80);
    setTimeout(() => scrollToBottom(true), 200);

    const bubbleContent = botRow.querySelector('.bubble-content');
    const typingCursor = botRow.querySelector('.typing-cursor');

    try {
      const response = await sendChatMessage({
        message: text,
        history: conversationHistory,
        deviceId,
        platform,
        signal: currentAbortController.signal
      });

      const reply = response.reply || 'waduh ga ada balasan nih.';

      conversationHistory.push({ role: 'user', text });
      conversationHistory.push({ role: 'model', text: reply });

      const typingIndicator = botRow.querySelector('.typing-indicator');
      if (typingIndicator) typingIndicator.remove();
      typingCursor.style.display = 'inline-block';

      await streamText(bubbleContent, reply, 12, currentAbortController.signal);

      if (currentAbortController?.signal?.aborted) {
        if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'model') {
          conversationHistory[conversationHistory.length - 1].text = bubbleContent.textContent;
        }
      }

      if (reply.toLowerCase().includes('udah dulu ya chatnya')) {
        chatInput.disabled = true;
        chatInput.placeholder = 'chat telah diakhiri.';
        sendBtn.disabled = true;
      }
    } catch (err) {
      const typingIndicator = botRow.querySelector('.typing-indicator');
      if (typingIndicator) typingIndicator.remove();
      typingCursor.style.display = 'inline-block';
      if (err.name === 'AbortError' || currentAbortController?.signal?.aborted) {
        if (!bubbleContent.textContent.trim()) {
          botRow.remove();
        }
      } else if (/quota|exhausted|rate limit|too many requests|tokens|429/i.test(err.message)) {
        bubbleContent.textContent = 'yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset';
      } else {
        bubbleContent.textContent = `error: ${err.message || 'gagal mengirim pesan.'}`;
      }
    } finally {
      const typingIndicator = botRow.querySelector('.typing-indicator');
      if (typingIndicator) typingIndicator.remove();
      typingCursor.remove();
      isGenerating = false;
      currentAbortController = null;
      updateSendButtonState(false);
      if (autoScrollActive) {
        scrollToBottom(true);
      }
    }
  }

  function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    if (role === 'bot') {
      row.innerHTML = `
        <img src="/assets/images/farrel-avatar.png" alt="Farrel" class="bot-avatar-badge">
        <div class="message-bubble">${escapeHtml(text)}</div>
      `;
    } else {
      row.innerHTML = `
        <div class="message-bubble">${escapeHtml(text)}</div>
      `;
    }

    chatHistoryContainer.appendChild(row);
    if (chatBottomAnchor) {
      chatHistoryContainer.appendChild(chatBottomAnchor);
    }
    scrollToBottom(true);
  }

  function streamText(element, fullText, speedMs = 12, signal) {
    return new Promise((resolve) => {
      let index = 0;
      let lastScroll = 0;
      const interval = setInterval(() => {
        if (signal && signal.aborted) {
          clearInterval(interval);
          resolve();
          return;
        }
        if (index < fullText.length) {
          element.textContent += fullText.charAt(index);
          index++;
          const now = Date.now();
          if (autoScrollActive && now - lastScroll > 50) {
            lastScroll = now;
            scrollToBottom(false);
          }
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speedMs);
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  brandHomeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (conversationHistory.length > 0) {
      if (confirm('Mulai obrolan baru dari awal?')) {
        window.location.reload();
      }
    }
  });

  infoBtn.addEventListener('click', () => {
    infoModal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => {
    infoModal.classList.remove('active');
  });

  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      infoModal.classList.remove('active');
    }
  });
});
