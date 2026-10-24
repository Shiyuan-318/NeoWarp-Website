"use strict";
/**
 * solo-demo.ts —— NeoWarp SOLO 界面演示（仅供观看，模拟 AI 对话与独立舞台）
 * SOLO：纯 AI 工作台，无传统编辑器界面；演示中不含任何设置界面。
 */
const WELCOME = {
    text: '你好！我是 <strong>NeoWarp SOLO</strong> —— 一个"纯 AI"工作台，没有传统编辑器界面。' +
        '把 <code>.sb3</code> 项目或 JavaScript 扩展拖进来，直接用自然语言下达指令，我会调用后台隐藏编辑器完成所有工作。<br><br>' +
        '试试点击右下角的「打开独立舞台」，或直接输入你的需求 👇'
};
const SCENARIOS = [
    {
        text: '好的，我来给小猫加上"按下空格跳跃"的功能。',
        steps: [
            '读取项目结构（2 个角色 / 5 个脚本）',
            '定位主角色「角色1」的按键事件积木',
            '新增 <code>当按下空格</code> 脚本并应用',
            '点击绿旗验证运行结果'
        ],
        vars: [{ label: '跳跃次数', value: '0' }]
    },
    {
        text: '我来帮你在舞台右侧生成 10 个随机位置的金币克隆体。',
        steps: [
            '新建列表变量 <code>金币坐标</code>',
            '添加 <code>克隆</code> 与随机数逻辑积木',
            '增量应用到工作区并校验 opcode',
            '保存修改回 <code>game.sb3</code>'
        ],
        vars: [{ label: '金币', value: '10' }]
    },
    {
        text: '已收到！这个功能会涉及循环与侦测积木，我先把方案拆解成步骤，逐步执行并实时保存快照，随时可以一键撤销。',
        steps: [
            '分析需求并生成积木 DSL',
            '经 opcode schema 校验后应用',
            '截图核对舞台运行效果'
        ]
    },
    {
        text: '没问题，我会在现有脚本的基础上做增量修改，不影响你正在运行的部分。',
        steps: [
            '增量应用改动（不整项重载）',
            '保持运行中的脚本与选中角色不变'
        ]
    }
];
let scenarioIndex = 0;
function el(sel, root = document) {
    return root.querySelector(sel);
}
function initSoloDemo() {
    const root = document.getElementById('soloDemo');
    if (!root)
        return;
    const chat = el('.solo-chat', root);
    const input = el('.solo-input', root);
    const sendBtn = el('.solo-send', root);
    const stageToggle = el('.solo-stage-toggle', root);
    const stage = el('.solo-stage');
    /* ---------- 基础渲染 ---------- */
    function addMsg(role, html) {
        const msg = document.createElement('div');
        msg.className = 'solo-msg ' + role;
        const avatar = document.createElement('div');
        avatar.className = 'solo-avatar';
        avatar.textContent = role === 'ai' ? 'AI' : '你';
        const bubble = document.createElement('div');
        bubble.className = 'solo-bubble';
        if (html !== undefined)
            bubble.innerHTML = html;
        msg.appendChild(avatar);
        msg.appendChild(bubble);
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
        return { bubble, msg };
    }
    function sleep(ms) {
        return new Promise((r) => window.setTimeout(r, ms));
    }
    /* ---------- 打字机输出（保留 HTML 标签） ---------- */
    function typeHtml(target, html) {
        return new Promise((resolve) => {
            // 按可见字符流式输出：用占位分段，保证标签不被截断
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const tokens = [];
            (function walk(node) {
                node.childNodes.forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.textContent.split('').forEach((ch) => tokens.push(ch === '<' ? '&lt;' : ch));
                    }
                    else if (child.nodeType === Node.ELEMENT_NODE) {
                        const elx = child;
                        tokens.push('<' + elx.tagName.toLowerCase() + '>');
                        walk(elx);
                        tokens.push('</' + elx.tagName.toLowerCase() + '>');
                    }
                });
            })(tmp);
            let i = 0;
            const caret = document.createElement('span');
            caret.className = 'caret';
            target.innerHTML = '';
            target.appendChild(caret);
            const timer = window.setInterval(() => {
                // 每帧输出 2~3 个字符，接近真实流式观感
                for (let k = 0; k < 2 + Math.floor(Math.random() * 2) && i < tokens.length; k++) {
                    caret.insertAdjacentHTML('beforebegin', tokens[i]);
                    i++;
                }
                chat.scrollTop = chat.scrollHeight;
                if (i >= tokens.length) {
                    window.clearInterval(timer);
                    caret.remove();
                    resolve();
                }
            }, 24);
        });
    }
    /* ---------- 步骤卡片（待办联动） ---------- */
    function buildSteps(container, texts) {
        const wrap = document.createElement('div');
        wrap.className = 'solo-steps';
        const steps = texts.map((t) => {
            const step = document.createElement('div');
            step.className = 'solo-step';
            const icon = document.createElement('span');
            icon.className = 'step-icon';
            const label = document.createElement('span');
            label.innerHTML = t;
            step.appendChild(icon);
            step.appendChild(label);
            wrap.appendChild(step);
            return { text: t, state: 'pending', el: step };
        });
        container.appendChild(wrap);
        chat.scrollTop = chat.scrollHeight;
        return steps;
    }
    async function runSteps(steps) {
        for (const step of steps) {
            step.el.classList.add('running');
            chat.scrollTop = chat.scrollHeight;
            await sleep(900 + Math.random() * 500);
            step.el.classList.remove('running');
            step.el.classList.add('done');
            chat.scrollTop = chat.scrollHeight;
            await sleep(180);
        }
    }
    /* ---------- 变量监视器 ---------- */
    function setVars(vars) {
        const box = el('.solo-stage-vars', stage);
        box.innerHTML = '';
        vars.forEach((v) => {
            const m = document.createElement('div');
            m.className = 'var-monitor';
            m.innerHTML = '<span class="var-label">' + v.label + '</span>' +
                '<span class="var-value">' + v.value + '</span>';
            box.appendChild(m);
        });
    }
    /* ---------- 独立舞台 ---------- */
    const flagBtn = el('.stage-ctl.flag', stage);
    const pauseBtn = el('.stage-ctl.pause', stage);
    const stopBtn = el('.stage-ctl.stop', stage);
    const screen = el('.solo-stage-screen', stage);
    const askBox = el('.solo-stage-ask', stage);
    const askInput = el('input', askBox);
    stageToggle.addEventListener('click', () => {
        stage.classList.toggle('open');
    });
    el('.solo-stage-close', stage).addEventListener('click', () => {
        stage.classList.remove('open');
    });
    let askResolve = null;
    function showAsk(question) {
        el('.ask-question', askBox).textContent = question;
        askBox.classList.add('visible');
        askInput.value = '';
        askInput.focus();
        return new Promise((resolve) => { askResolve = resolve; });
    }
    function submitAsk() {
        askBox.classList.remove('visible');
        const ans = askInput.value.trim();
        if (askResolve) {
            askResolve();
            askResolve = null;
        }
        if (ans) {
            addMsg('user', '（回答舞台提问）' + ans.replace(/</g, '&lt;'));
        }
    }
    el('button', askBox).addEventListener('click', submitAsk);
    askInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            submitAsk();
    });
    flagBtn.addEventListener('click', () => {
        flagBtn.classList.add('active');
        pauseBtn.classList.remove('active');
        screen.classList.add('stage-running');
        // 绿旗后随机弹出项目"询问并等待"问答框
        window.setTimeout(() => {
            if (stage.classList.contains('open') && !askResolve) {
                showAsk('你想让小猫跳多高？').then(() => {
                    const vars = el('.solo-stage-vars', stage);
                    if (!vars.children.length) {
                        setVars([{ label: '跳跃次数', value: '1' }]);
                    }
                });
            }
        }, 1500);
    });
    pauseBtn.addEventListener('click', () => {
        pauseBtn.classList.add('active');
        flagBtn.classList.remove('active');
        screen.classList.remove('stage-running');
    });
    stopBtn.addEventListener('click', () => {
        flagBtn.classList.remove('active');
        pauseBtn.classList.remove('active');
        screen.classList.remove('stage-running');
        askBox.classList.remove('visible');
        setVars([]);
    });
    /* ---------- AI 回复执行 ---------- */
    let busy = false;
    async function playReply(reply) {
        busy = true;
        sendBtn.disabled = true;
        await sleep(500);
        const typing = addMsg('ai');
        typing.bubble.innerHTML = '<span class="solo-typing"><i></i><i></i><i></i></span>';
        await sleep(1100);
        await typeHtml(typing.bubble, reply.text);
        if (reply.steps && reply.steps.length) {
            const steps = buildSteps(typing.bubble, reply.steps);
            await sleep(400);
            await runSteps(steps);
        }
        if (reply.vars)
            setVars(reply.vars);
        if (reply.ask) {
            await sleep(400);
            await showAsk(reply.ask);
        }
        busy = false;
        sendBtn.disabled = false;
    }
    /* ---------- 发送 ---------- */
    async function send() {
        const text = input.value.trim();
        if (!text || busy)
            return;
        input.value = '';
        addMsg('user', text.replace(/</g, '&lt;').replace(/\n/g, '<br>'));
        const reply = SCENARIOS[scenarioIndex % SCENARIOS.length];
        scenarioIndex++;
        await playReply(reply);
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });
    /* 会话切换（演示） */
    document.querySelectorAll('.solo-session-item').forEach((item) => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.solo-session-item').forEach((i) => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
    /* 开场白 */
    window.setTimeout(() => playReply(WELCOME), 600);
}
initSoloDemo();
