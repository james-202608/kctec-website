(function () {
  const form = document.getElementById('inviteForm');
  const input = form.elements.invite;
  const output = form.querySelector('output');
  const endpoint = window.KCTEC_AI_ENDPOINT || 'https://kctec-website.jameszh369.workers.dev/v1/chat';
  const inviteFromUrl = new URLSearchParams(location.search).get('invite');
  if (inviteFromUrl) input.value = inviteFromUrl;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!endpoint) {
      output.textContent = '会员后台正在配置，邀请登录尚未开放。';
      return;
    }
    const apiBase = endpoint.replace(/\/v1\/chat\/?$/, '');
    const button = form.querySelector('button');
    button.disabled = true;
    output.textContent = '正在验证…';
    try {
      const response = await fetch(`${apiBase}/v1/invites/redeem`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({inviteToken: input.value.trim()})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '邀请验证失败');
      history.replaceState({}, '', 'member-login.html');
      input.value = '';
      output.innerHTML = '登录成功。<a href="index.html">返回首页使用AI商务助手</a>';
    } catch (error) {
      output.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
