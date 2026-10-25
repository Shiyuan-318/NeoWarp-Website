/**
 * solo-demo.ts —— NeoWarp SOLO 界面演示（对齐实际 AI 助手 / SOLO 窗口）
 * 悬浮玻璃侧栏（Chats + 待办联动步骤卡片 + 舞台缩略图）、悬浮顶栏、底部输入坞。
 * SOLO 演示不含任何设置界面。
 */

interface AiReply {
    text: string;
    /** 待办联动：侧栏步骤卡片，依次执行 */
    steps?: string[];
    /** 回复完成后是否弹出"询问并等待"问答框 */
    ask?: string;
    /** 回复完成后变量监视器数值 */
    vars?: { label: string; value: string }[];
}

const WELCOME: AiReply = {
    text: '你好！我是 <strong>NeoWarp SOLO</strong> —— 一个"纯 AI"工作台，没有传统编辑器界面。' +
        '把 <code>.sb3</code> 项目或 JavaScript 扩展拖进来，直接用自然语言下达指令，我会调用后台隐藏编辑器完成所有工作。<br><br>' +
        '点击左侧的「舞台」缩略图可以弹出独立舞台，或直接在下方输入你的需求 👇'
};

const SCENARIOS: AiReply[] = [
    {
        text: '好的，我来给小猫加上"按下空格跳跃"的功能。',
        steps: ['读取项目结构（2 个角色 / 5 个脚本）', '定位「角色1」的按键事件积木', '新增 <code>当按下空格</code> 脚本', '点击绿旗验证运行结果'],
        vars: [{ label: '跳跃次数', value: '0' }]
    },
    {
        text: '我来帮你在舞台右侧生成 10 个随机位置的金币克隆体。',
        steps: ['新建列表变量 <code>金币坐标</code>', '添加克隆与随机数逻辑积木', '增量应用到工作区并校验', '保存修改回 <code>game.sb3</code>'],
        vars: [{ label: '金币', value: '10' }]
    },
    {
        text: '已收到！这个功能会涉及循环与侦测积木，我先把方案拆解成步骤，逐步执行并实时保存快照，随时可以一键撤销。',
        steps: ['分析需求并生成积木 DSL', '经 opcode schema 校验后应用', '截图核对舞台运行效果']
    },
    {
        text: '没问题，我会在现有脚本的基础上做增量修改，不影响你正在运行的部分。',
        steps: ['增量应用改动（不整项重载）', '保持运行中的脚本与选中角色不变']
    }
];

let scenarioIndex = 0;

function el<T extends HTMLElement>(sel: string, root: ParentNode = document): T {
    return root.querySelector(sel) as T;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => window.setTimeout(r, ms));
}

function initSoloDemo(): void {
    const root = document.getElementById('soloDemo') as HTMLElement | null;
    if (!root) return;

    const chat = el<HTMLElement>('#soloChat', root);
    const input = el<HTMLTextAreaElement>('#soloInput', root);
    const sendBtn = el<HTMLButtonElement>('#soloSendBtn', root);
    const stagePreview = el<HTMLElement>('#soloStagePreview');
    const stageLive = el<HTMLElement>('#soloStageLive');
    const stage = el<HTMLElement>('.solo-stage');
    const sideTodo = el<HTMLElement>('#soloSidebarTodo');

    /* ---------- 消息渲染 ---------- */
    function addMsg(role: 'ai' | 'user', html?: string): HTMLElement {
        const msg = document.createElement('div');
        msg.className = 'nso-msg ' + role;
        const bubble = document.createElement('div');
        bubble.className = 'nso-bubble';
        if (html !== undefined) bubble.innerHTML = html;
        msg.appendChild(bubble);
        const welcome = chat.querySelector('.nso-welcome');
        if (welcome) welcome.remove();
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
        return bubble;
    }

    /* ---------- 打字机输出（保留 HTML 标签） ---------- */
    function typeHtml(target: HTMLElement, html: string): Promise<void> {
        return new Promise((resolve) => {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const tokens: string[] = [];
            (function walk(node: Node): void {
                node.childNodes.forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.textContent!.split('').forEach((ch) =>
                            tokens.push(ch === '<' ? '&lt;' : ch));
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const elx = child as HTMLElement;
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

    /* ---------- 待办联动：侧栏步骤卡片 ---------- */
    function buildSideSteps(texts: string[]): { el: HTMLElement }[] {
        sideTodo.innerHTML = '';
        return texts.map((t) => {
            const step = document.createElement('div');
            step.className = 'nso-side-step';
            step.innerHTML =
                '<span class="step-icon"></span><span class="step-label">' + t + '</span>';
            sideTodo.appendChild(step);
            return { el: step };
        });
    }

    async function runSteps(steps: { el: HTMLElement }[]): Promise<void> {
        for (const step of steps) {
            step.el.classList.add('running');
            await sleep(900 + Math.random() * 500);
            step.el.classList.remove('running');
            step.el.classList.add('done');
            await sleep(180);
        }
        // 完成后短暂停留再清除
        await sleep(1800);
        sideTodo.innerHTML = '';
    }

    /* ---------- 变量监视器 / 问答框 ---------- */
    function setVars(vars: { label: string; value: string }[]): void {
        const box = el<HTMLElement>('.solo-stage-vars', stage);
        box.innerHTML = '';
        vars.forEach((v) => {
            const m = document.createElement('div');
            m.className = 'var-monitor';
            m.innerHTML = '<span class="var-label">' + v.label + '</span>' +
                          '<span class="var-value">' + v.value + '</span>';
            box.appendChild(m);
        });
    }

    const flagBtn = el<HTMLButtonElement>('.stage-ctl.flag', stage);
    const pauseBtn = el<HTMLButtonElement>('.stage-ctl.pause', stage);
    const stopBtn = el<HTMLButtonElement>('.stage-ctl.stop', stage);
    const screen = el<HTMLElement>('#soloStageScreen');
    const askBox = el<HTMLElement>('.solo-stage-ask', stage);
    const askInput = el<HTMLInputElement>('input', askBox);

    /* ---------- 独立舞台 ---------- */
    stagePreview.addEventListener('click', () => stage.classList.toggle('open'));
    stagePreview.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') stage.classList.toggle('open');
    });
    el<HTMLButtonElement>('.solo-stage-close', stage).addEventListener('click', () => {
        stage.classList.remove('open');
    });

    let askResolve: (() => void) | null = null;

    function showAsk(question: string): Promise<void> {
        el<HTMLElement>('.ask-question', askBox).textContent = question;
        askBox.classList.add('visible');
        askInput.value = '';
        askInput.focus();
        return new Promise((resolve) => { askResolve = resolve; });
    }

    function submitAsk(): void {
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
    el<HTMLButtonElement>('button', askBox).addEventListener('click', submitAsk);
    askInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAsk();
    });

    flagBtn.addEventListener('click', () => {
        flagBtn.classList.add('active');
        pauseBtn.classList.remove('active');
        screen.classList.add('stage-running');
        stageLive.style.display = 'inline-flex';
        window.setTimeout(() => {
            if (stage.classList.contains('open') && !askResolve) {
                showAsk('你想让小猫跳多高？').then(() => {
                    const vars = el<HTMLElement>('.solo-stage-vars', stage);
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
        stageLive.style.display = 'none';
        askBox.classList.remove('visible');
        setVars([]);
    });

    /* ---------- 会话切换（演示） ---------- */
    document.querySelectorAll<HTMLElement>('.nso-chat-item').forEach((item) => {
        item.addEventListener('click', () => {
            document.querySelectorAll<HTMLElement>('.nso-chat-item').forEach((i) =>
                i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    /* ---------- AI 回复 ---------- */
    let busy = false;

    function updateSendState(): void {
        sendBtn.disabled = busy || input.value.trim().length === 0;
    }

    async function playReply(reply: AiReply): Promise<void> {
        busy = true;
        updateSendState();
        await sleep(500);

        const bubble = addMsg('ai');
        bubble.innerHTML = '<span class="nso-typing"><i></i><i></i><i></i></span>';
        await sleep(1100);

        await typeHtml(bubble, reply.text);

        if (reply.steps && reply.steps.length) {
            const steps = buildSideSteps(reply.steps);
            await sleep(300);
            await runSteps(steps);
        }

        if (reply.vars) setVars(reply.vars);

        if (reply.ask) {
            await sleep(400);
            await showAsk(reply.ask);
        }

        busy = false;
        updateSendState();
    }

    /* ---------- 发送 ---------- */
    async function send(): Promise<void> {
        const text = input.value.trim();
        if (!text || busy) return;
        input.value = '';
        input.style.height = 'auto';
        updateSendState();
        addMsg('user', text.replace(/</g, '&lt;').replace(/\n/g, '<br>'));

        const reply = SCENARIOS[scenarioIndex % SCENARIOS.length];
        scenarioIndex++;
        await playReply(reply);
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 88) + 'px';
        updateSendState();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });

    /* 开场白 */
    window.setTimeout(() => playReply(WELCOME), 600);
}

initSoloDemo();
