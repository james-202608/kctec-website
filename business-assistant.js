(function () {
  const endpoint = window.KCTEC_AI_ENDPOINT || '';
  const tasks = {
    translate: '中韩商务翻译',
    meaning: '商务语境释义',
    reply: '帮我回复对方',
    email: '撰写商务邮件',
    negotiate: '准备谈判问题',
    minutes: '整理会议纪要'
  };

  document.body.insertAdjacentHTML('beforeend', `
    <button class="ai-launcher" type="button">AI 商务助手<small>AI 비즈니스 도우미</small></button>
    <aside class="ai-desk" aria-hidden="true" aria-label="韩中 AI 商务助手">
      <button class="ai-close" type="button" aria-label="关闭">×</button>
      <span>KCTEC AI BUSINESS DESK</span>
      <h2>韩中 AI 商务助手</h2>
      <p>选择任务并输入内容。正式服务将采用 DeepSeek V4，聊天是否保存由您决定。</p>
      <div class="ai-tools">
        <button type="button" data-prompt="translate">中韩商务翻译<small>한중 비즈니스 번역</small></button>
        <button type="button" data-prompt="meaning">商务语境释义<small>비즈니스 의미 해석</small></button>
        <button type="button" data-prompt="reply">帮我回复对方<small>답변 작성</small></button>
        <button type="button" data-prompt="email">撰写商务邮件<small>비즈니스 이메일</small></button>
        <button type="button" data-prompt="negotiate">准备谈判问题<small>협상 준비</small></button>
        <button type="button" data-prompt="minutes">整理会议纪要<small>회의록 정리</small></button>
      </div>
      <label class="ai-input-label">需要 AI 协助的内容
        <textarea placeholder="粘贴对方的话、邮件或会议内容……"></textarea>
      </label>
      <fieldset class="ai-consent">
        <legend>聊天数据设置</legend>
        <label><input type="checkbox" name="save-history"> 保存这次对话，供本人查询，并帮助协会改进服务</label>
        <label><input type="checkbox" name="staff-followup" disabled> 允许协会工作人员根据本次对话联系我跟进</label>
        <small>保存的对话可供协会授权人员进行内部汇总和服务改进；主动联系跟进需要单独授权。敏感商业秘密请勿直接提交。</small>
        <a href="ai-data-policy.html">查看聊天数据说明</a>
      </fieldset>
      <button class="ai-run" type="button">${endpoint ? '开始分析' : 'AI 服务配置中'}</button>
      <div class="ai-result" role="status" aria-live="polite"></div>
    </aside>`);

  const desk = document.querySelector('.ai-desk');
  const launcher = document.querySelector('.ai-launcher');
  const textarea = desk.querySelector('textarea');
  const saveHistory = desk.querySelector('[name="save-history"]');
  const staffFollowup = desk.querySelector('[name="staff-followup"]');
  const run = desk.querySelector('.ai-run');
  const result = desk.querySelector('.ai-result');
  let mode = 'translate';
  let currentSessionId = null;

  launcher.addEventListener('click', () => {
    desk.classList.add('open');
    desk.setAttribute('aria-hidden', 'false');
  });
  desk.querySelector('.ai-close').addEventListener('click', () => {
    desk.classList.remove('open');
    desk.setAttribute('aria-hidden', 'true');
  });
  desk.querySelectorAll('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.prompt;
      desk.querySelectorAll('[data-prompt]').forEach((item) => item.classList.toggle('active', item === button));
      textarea.focus();
    });
  });
  desk.querySelector('[data-prompt="translate"]').classList.add('active');

  saveHistory.addEventListener('change', () => {
    staffFollowup.disabled = !saveHistory.checked;
    if (!saveHistory.checked) staffFollowup.checked = false;
  });

  run.addEventListener('click', async () => {
    const message = textarea.value.trim();
    if (!message) {
      result.textContent = '请先输入需要协助的内容。';
      textarea.focus();
      return;
    }
    if (!endpoint) {
      result.innerHTML = '<b>尚未发送，也没有保存</b><p>DeepSeek 与协会数据库正在配置。正式启用前，本页面不会上传或记录您输入的内容。</p>';
      return;
    }

    run.disabled = true;
    run.textContent = '正在分析…';
    result.textContent = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          task: mode,
          message,
          sessionId: currentSessionId,
          saveHistory: saveHistory.checked,
          allowStaffFollowup: staffFollowup.checked
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          result.innerHTML = '<b>请先登录会员账号</b><p>协会为每位客户建立独立身份和会话，登录后才能使用专属商务助理。</p><a href="member-login.html">使用邀请代码登录</a>';
          return;
        }
        throw new Error(data.error || '服务暂时不可用');
      }
      result.innerHTML = `<b>${tasks[mode]}</b><p class="ai-answer-text"></p><small class="ai-save-state"></small>`;
      const answer = result.querySelector('.ai-answer-text');
      const saveState = result.querySelector('.ai-save-state');
      await readEventStream(response, (event, data) => {
        if (event === 'meta') {
          currentSessionId = data.sessionId || currentSessionId;
          saveState.textContent = data.saved ? '本次对话将按您的选择保存。' : '本次对话不会保存为历史记录。';
        } else if (event === 'delta') {
          answer.textContent += data.text || '';
        } else if (event === 'done') {
          saveState.textContent = data.saved ? '本次对话已保存。' : '本次对话未保存。';
        } else if (event === 'error') {
          throw new Error(data.error || '回复中断');
        }
      });
    } catch (error) {
      result.innerHTML = `<b>暂时无法完成</b><p>${escapeHtml(error.message)}</p>`;
    } finally {
      run.disabled = false;
      run.textContent = '开始分析';
    }
  });

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  async function readEventStream(response, onEvent) {
    if (!response.body) throw new Error('浏览器不支持流式回复');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true}).replace(/\r\n/g, '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';
      for (const block of blocks) {
        let event = 'message';
        const dataLines = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        onEvent(event, JSON.parse(dataLines.join('\n')));
      }
    }
  }
})();
