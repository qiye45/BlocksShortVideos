// ==UserScript==
// @name         哔哩哔哩短视频屏蔽
// @namespace    https://github.com/qiye45/BlocksShortVideos
// @version      1.1
// @description  屏蔽哔哩哔哩网页版上的短视频和推广内容（可设置最短时长，默认2分钟）
// @author       qiye45
// @match        *://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @license      GPL-3.0 license
// ==/UserScript==

(function () {
    'use strict';

    // 获取保存的设置或使用默认值
    let minDuration = GM_getValue('minDuration', 120); // 默认2分钟（单位：秒）
    let isTemporarilyDisabled = false; // 是否临时禁用过滤功能
    let enabledPages = GM_getValue('enabledPages', {
        home: true,        // 首页
        video: true,       // 视频播放页
        channel: true,     // 分区页
        search: true,      // 搜索结果页
        space: true,       // 用户空间
        dynamic: true      // 动态页
    });

    // 新增：屏蔽设置
    let blockSettings = GM_getValue('blockSettings', {
        blockShortVideos: true,    // 屏蔽短视频
        blockAds: true,            // 屏蔽推广/广告
        blockLive: false,          // 屏蔽直播（默认不屏蔽）
        blockSpecialUsers: false   // 屏蔽特定UP主（默认不屏蔽）
    });

    // 屏蔽的UP主列表
    let blockedUsers = GM_getValue('blockedUsers', []);

    // 添加CSS样式
    GM_addStyle(`
        .bilibli-short-video-blocked {
            display: none !important;
        }

        .bilibili-ad-blocked {
            display: none !important;
        }

        .bilibili-live-blocked {
            display: none !important;
        }

        .bilibili-user-blocked {
            display: none !important;
        }

        .bilibili-short-video-counter {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 9999;
            cursor: pointer;
            transition: background-color 0.3s;
            max-width: 250px;
            text-align: center;
        }

        .bilibili-short-video-counter:hover {
            background-color: rgba(0, 0, 0, 0.9);
        }

        .bilibili-short-video-disabled {
            background-color: rgba(255, 0, 0, 0.7) !important;
        }

        .bilibili-short-video-float-button {
            position: fixed;
            bottom: 100px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 9999;
            cursor: pointer;
            transition: all 0.3s;
            opacity: 0.7;
        }

        .bilibili-short-video-float-button:hover {
            opacity: 1;
            background-color: rgba(0, 0, 0, 0.9);
        }

        .bilibili-settings-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .bilibili-settings-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-width: 90%;
            max-height: 80%;
            overflow-y: auto;
            color: #333;
        }

        .bilibili-settings-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }

        .bilibili-settings-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
        }

        .bilibili-settings-section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #666;
        }

        .bilibili-settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 5px 0;
        }

        .bilibili-settings-row label {
            flex: 1;
        }

        .bilibili-settings-buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .bilibili-settings-button {
            padding: 8px 20px;
            border-radius: 4px;
            margin-left: 10px;
            cursor: pointer;
            border: none;
            font-size: 14px;
        }

        .bilibili-settings-save {
            background-color: #00a1d6;
            color: white;
        }

        .bilibili-settings-cancel {
            background-color: #999;
            color: white;
        }

        .bilibili-time-input {
            display: flex;
            align-items: center;
        }

        .bilibili-time-input input {
            width: 50px;
            margin: 0 5px;
            text-align: center;
            padding: 3px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }

        .bilibili-user-list {
            max-height: 100px;
            overflow-y: auto;
            border: 1px solid #ccc;
            padding: 5px;
            margin-top: 5px;
            font-size: 12px;
        }

        .bilibili-user-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 5px;
            margin: 2px 0;
            background-color: #f5f5f5;
            border-radius: 3px;
        }

        .bilibili-user-remove {
            background-color: #ff4444;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 1px 5px;
            cursor: pointer;
            font-size: 10px;
        }

        .bilibili-add-user {
            display: flex;
            margin-top: 5px;
        }

        .bilibili-add-user input {
            flex: 1;
            padding: 3px;
            border: 1px solid #ccc;
            border-radius: 3px;
            margin-right: 5px;
        }

        .bilibili-add-user button {
            background-color: #00a1d6;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 3px 10px;
            cursor: pointer;
            font-size: 12px;
        }
    `);

    // 注册菜单命令
    GM_registerMenuCommand('设置最短视频时长', showSettings);
    GM_registerMenuCommand('临时显示被屏蔽内容', toggleBlockingState);
    GM_registerMenuCommand('高级设置', showAdvancedSettings);

    // 统计各种屏蔽的数量
    let blockStats = {
        shortVideos: 0,
        ads: 0,
        live: 0,
        users: 0
    };
// 添加全局变量来管理定时器
    let counterHideTimer = null;
    let lastUpdateTime = 0;

    // 检查当前页面是否需要启用屏蔽
    function shouldEnableOnCurrentPage() {
        const url = window.location.href;

        if (url.match(/bilibili\.com\/?$/) || url.match(/bilibili\.com\/index/)) {
            return enabledPages.home;
        } else if (url.match(/bilibili\.com\/video\//)) {
            return enabledPages.video;
        } else if (url.match(/bilibili\.com\/(v|channel|list|anime|guochuang)/)) {
            return enabledPages.channel;
        } else if (url.match(/bilibili\.com\/search/)) {
            return enabledPages.search;
        } else if (url.match(/space\.bilibili\.com/)) {
            return enabledPages.space;
        } else if (url.match(/t\.bilibili\.com/)) {
            return enabledPages.dynamic;
        }

        return true;
    }

    // 检查是否为推广/广告内容
    function isAdContent(element) {
        if (!blockSettings.blockAds) return false;

        // 检查链接中是否包含广告标识
        const links = element.querySelectorAll('a[href]');
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && (
                href.includes('cm.bilibili.com/cm/api/fees') ||
                href.includes('trackid=') ||
                href.includes('track_id=') ||
                href.includes('creative_id=') ||
                href.includes('source_id=') ||
                href.includes('caid=') ||
                href.includes('resource_id=')
            )) {
                return true;
            }
        }

        // 检查是否有广告相关的类名或属性
        if (element.querySelector('[data-target-url*="trackid"]') ||
            element.querySelector('[data-target-url*="creative_id"]') ||
            element.classList.contains('ad-card') ||
            element.classList.contains('spread-module') ||
            element.querySelector('.ad-tag') ||
            element.querySelector('.spread-tag')) {
            return true;
        }

        // 检查文本内容是否包含推广标识
        const textContent = element.textContent.toLowerCase();
        if (textContent.includes('推广') ||
            textContent.includes('广告') ||
            textContent.includes('sponsor') ||
            textContent.includes('promoted')) {
            return true;
        }

        // 检查推荐标签（某些推广内容会有特殊的推荐标签）
        const recommendText = element.querySelector('.bili-video-card__info--rcmd-text');
        if (recommendText && recommendText.textContent.includes('推广')) {
            return true;
        }

        return false;
    }

    // 检查是否为直播内容
    function isLiveContent(element) {
        if (!blockSettings.blockLive) return false;

        return element.classList.contains('bili-live-card') ||
            element.querySelector('.live-card') ||
            element.querySelector('.bili-live-card') ||
            element.querySelector('[href*="/live/"]') ||
            (element.textContent && element.textContent.includes('直播中'));
    }

    // 检查是否为被屏蔽的UP主
    function isBlockedUser(element) {
        if (!blockSettings.blockSpecialUsers || blockedUsers.length === 0) return false;

        // 查找UP主名称
        const authorElements = element.querySelectorAll('.bili-video-card__info--author, .up-name, .username, .bili-video-card__info--owner');

        for (const authorElement of authorElements) {
            const authorName = authorElement.textContent.trim();
            if (blockedUsers.includes(authorName)) {
                return true;
            }
        }

        return false;
    }

    // 高级设置界面
    function showAdvancedSettings() {
        const modal = document.createElement('div');
        modal.className = 'bilibili-settings-modal';

        // 构建屏蔽用户列表HTML
        const userListHTML = blockedUsers.map(user => `
            <div class="bilibili-user-item">
                <span>${user}</span>
                <button class="bilibili-user-remove" onclick="this.parentElement.remove()">删除</button>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="bilibili-settings-content">
                <div class="bilibili-settings-title">哔哩哔哩内容屏蔽 - 高级设置</div>

                <div class="bilibili-settings-section">
                    <div class="bilibili-settings-section-title">时长设置</div>
                    <div class="bilibili-settings-row">
                        <label>最短视频时长：</label>
                        <div class="bilibili-time-input">
                            <input type="number" id="bili-minutes" min="0" value="${Math.floor(minDuration / 60)}"> 分
                            <input type="number" id="bili-seconds" min="0" max="59" value="${minDuration % 60}"> 秒
                        </div>
                    </div>
                </div>

                <div class="bilibili-settings-section">
                    <div class="bilibili-settings-section-title">屏蔽类型</div>
                    <div class="bilibili-settings-row">
                        <label>屏蔽短视频</label>
                        <input type="checkbox" id="bili-block-short" ${blockSettings.blockShortVideos ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>屏蔽推广/广告</label>
                        <input type="checkbox" id="bili-block-ads" ${blockSettings.blockAds ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>屏蔽直播</label>
                        <input type="checkbox" id="bili-block-live" ${blockSettings.blockLive ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>屏蔽特定UP主</label>
                        <input type="checkbox" id="bili-block-users" ${blockSettings.blockSpecialUsers ? 'checked' : ''}>
                    </div>
                </div>

                <div class="bilibili-settings-section">
                    <div class="bilibili-settings-section-title">屏蔽UP主列表</div>
                    <div class="bilibili-user-list" id="bili-user-list">${userListHTML}</div>
                    <div class="bilibili-add-user">
                        <input type="text" id="bili-new-user" placeholder="输入UP主名称">
                        <button id="bili-add-user-btn">添加</button>
                    </div>
                </div>

                <div class="bilibili-settings-section">
                    <div class="bilibili-settings-section-title">启用页面</div>
                    <div class="bilibili-settings-row">
                        <label>首页</label>
                        <input type="checkbox" id="bili-home" ${enabledPages.home ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>视频播放页（右侧推荐）</label>
                        <input type="checkbox" id="bili-video" ${enabledPages.video ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>分区/频道页</label>
                        <input type="checkbox" id="bili-channel" ${enabledPages.channel ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>搜索结果页</label>
                        <input type="checkbox" id="bili-search" ${enabledPages.search ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>用户空间</label>
                        <input type="checkbox" id="bili-space" ${enabledPages.space ? 'checked' : ''}>
                    </div>
                    <div class="bilibili-settings-row">
                        <label>动态页</label>
                        <input type="checkbox" id="bili-dynamic" ${enabledPages.dynamic ? 'checked' : ''}>
                    </div>
                </div>

                <div class="bilibili-settings-buttons">
                    <button class="bilibili-settings-button bilibili-settings-cancel">取消</button>
                    <button class="bilibili-settings-button bilibili-settings-save">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加用户按钮事件
        const addUserBtn = modal.querySelector('#bili-add-user-btn');
        const newUserInput = modal.querySelector('#bili-new-user');

        addUserBtn.addEventListener('click', () => {
            const username = newUserInput.value.trim();
            if (username && !blockedUsers.includes(username)) {
                const userList = modal.querySelector('#bili-user-list');
                const userItem = document.createElement('div');
                userItem.className = 'bilibili-user-item';
                userItem.innerHTML = `
                    <span>${username}</span>
                    <button class="bilibili-user-remove" onclick="this.parentElement.remove()">删除</button>
                `;
                userList.appendChild(userItem);
                newUserInput.value = '';
            }
        });

        // 取消按钮
        modal.querySelector('.bilibili-settings-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 保存按钮
        modal.querySelector('.bilibili-settings-save').addEventListener('click', () => {
            // 获取时长设置
            const minutes = parseInt(document.getElementById('bili-minutes').value, 10) || 0;
            const seconds = parseInt(document.getElementById('bili-seconds').value, 10) || 0;

            if (seconds > 59) {
                alert('秒数应该在0-59之间！');
                return;
            }

            // 保存时长设置
            minDuration = minutes * 60 + seconds;
            GM_setValue('minDuration', minDuration);

            // 获取屏蔽设置
            const newBlockSettings = {
                blockShortVideos: document.getElementById('bili-block-short').checked,
                blockAds: document.getElementById('bili-block-ads').checked,
                blockLive: document.getElementById('bili-block-live').checked,
                blockSpecialUsers: document.getElementById('bili-block-users').checked
            };
            blockSettings = newBlockSettings;
            GM_setValue('blockSettings', blockSettings);

            // 获取页面启用设置
            const newEnabledPages = {
                home: document.getElementById('bili-home').checked,
                video: document.getElementById('bili-video').checked,
                channel: document.getElementById('bili-channel').checked,
                search: document.getElementById('bili-search').checked,
                space: document.getElementById('bili-space').checked,
                dynamic: document.getElementById('bili-dynamic').checked
            };
            enabledPages = newEnabledPages;
            GM_setValue('enabledPages', enabledPages);

            // 获取屏蔽用户列表
            const userItems = modal.querySelectorAll('.bilibili-user-item span');
            const newBlockedUsers = Array.from(userItems).map(item => item.textContent.trim());
            blockedUsers = newBlockedUsers;
            GM_setValue('blockedUsers', blockedUsers);

            // 关闭设置面板
            document.body.removeChild(modal);

            // 重新应用屏蔽
            isTemporarilyDisabled = false;
            processVideos();
            updateCounter();

            alert('设置已保存！');
        });
    }

    // 设置界面（简化版）
    function showSettings() {
        const currentMinutes = Math.floor(minDuration / 60);
        const currentSeconds = minDuration % 60;

        const minutesStr = window.prompt('请输入最短视频时长（分钟）：', currentMinutes);
        if (minutesStr === null) return;

        const minutes = parseInt(minutesStr, 10);
        if (isNaN(minutes) || minutes < 0) {
            alert('请输入有效的数字！');
            return;
        }

        const secondsStr = window.prompt('请输入额外的秒数：', currentSeconds);
        if (secondsStr === null) return;

        const seconds = parseInt(secondsStr, 10);
        if (isNaN(seconds) || seconds < 0 || seconds > 59) {
            alert('请输入0-59之间的有效秒数！');
            return;
        }

        const newDuration = minutes * 60 + seconds;
        GM_setValue('minDuration', newDuration);
        minDuration = newDuration;

        alert(`设置已保存！当前屏蔽 ${minutes} 分 ${seconds} 秒以下的视频。`);

        isTemporarilyDisabled = false;
        processVideos();
        updateCounter();
    }

    // 切换屏蔽状态
    function toggleBlockingState() {
        isTemporarilyDisabled = !isTemporarilyDisabled;

        // 移除或应用屏蔽类
        const blockedElements = document.querySelectorAll('.bilibli-short-video-blocked, .bilibili-ad-blocked, .bilibili-live-blocked, .bilibili-user-blocked');
        blockedElements.forEach(element => {
            if (isTemporarilyDisabled) {
                element.classList.remove('bilibli-short-video-blocked', 'bilibili-ad-blocked', 'bilibili-live-blocked', 'bilibili-user-blocked');
            } else {
                // 重新检查并应用相应的屏蔽类
                processVideoCard(element);
            }
        });

        updateCounter();
        alert(isTemporarilyDisabled ? '内容屏蔽已暂时关闭，刷新页面后将恢复屏蔽。' : '内容屏蔽已重新启用。');
    }

    // 转换时间字符串为秒数
    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;

        const parts = timeStr.split(':').map(part => parseInt(part, 10));

        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            return parts[0];
        }

        return 0;
    }

    // 处理视频卡片
    function processVideoCard(videoCard) {
        if (!videoCard) return {blocked: false, type: null};

        // 重置计数
        let wasBlocked = false;
        let blockType = null;

        // 移除之前的屏蔽类
        videoCard.classList.remove('bilibli-short-video-blocked', 'bilibili-ad-blocked', 'bilibili-live-blocked', 'bilibili-user-blocked');

        if (isTemporarilyDisabled) {
            return {blocked: false, type: null};
        }

        // 检查是否为推广/广告内容
        if (isAdContent(videoCard)) {
            videoCard.classList.add('bilibili-ad-blocked');
            return {blocked: true, type: 'ads'};
        }

        // 检查是否为直播内容
        if (isLiveContent(videoCard)) {
            videoCard.classList.add('bilibili-live-blocked');
            return {blocked: true, type: 'live'};
        }

        // 检查是否为被屏蔽的UP主
        if (isBlockedUser(videoCard)) {
            videoCard.classList.add('bilibili-user-blocked');
            return {blocked: true, type: 'users'};
        }

        // 检查短视频（仅在启用短视频屏蔽时）
        if (blockSettings.blockShortVideos) {
            let durationElement = videoCard.querySelector('.bili-video-card__stats__duration');

            if (!durationElement) {
                durationElement = videoCard.querySelector('.duration');
            }

            if (!durationElement) {
                durationElement = videoCard.querySelector('.bili-video-card__mask .bili-video-card__stats__duration');
            }

            if (!durationElement) {
                durationElement = videoCard.querySelector('.length');
            }

            if (!durationElement) {
                durationElement = videoCard.querySelector('.video-duration');
            }

            if (durationElement) {
                const durationStr = durationElement.textContent.trim();
                const durationSeconds = timeToSeconds(durationStr);

                if (durationSeconds > 0 && durationSeconds < minDuration) {
                    videoCard.classList.add('bilibli-short-video-blocked');
                    return {blocked: true, type: 'shortVideos'};
                }
            }
        }

        return {blocked: false, type: null};
    }

    // 视频卡片的选择器
    const VIDEO_CARD_SELECTORS = [
        '.bili-video-card__wrap',
        '.small-item',
        '.video-page-card-small',
        '.video-item-biref',
        '.rank-item',
        '.video-card',
        '.l-item',
        'li.video-item',
        '.video.matrix',
        '.opus-module-content .opus-item',
        '.spread-module',
        '.bili-live-card',
        '.ad-card',
        '.recommend-card'
    ];

    // 处理所有视频
    function processVideos() {
        if (!shouldEnableOnCurrentPage()) {
            return;
        }

        // 重置统计
        blockStats = {
            shortVideos: 0,
            ads: 0,
            live: 0,
            users: 0
        };

        VIDEO_CARD_SELECTORS.forEach(selector => {
            const cards = document.querySelectorAll(selector);
            cards.forEach(card => {
                const result = processVideoCard(card);
                if (result.blocked && result.type) {
                    blockStats[result.type]++;
                }
            });
        });

        updateCounter();
    }

    // 更新统计计数器
    function updateCounter() {
        if (!shouldEnableOnCurrentPage()) {
            const oldCounter = document.getElementById('bili-short-video-counter');
            if (oldCounter) oldCounter.style.display = 'none';
            return;
        }
        // 防抖：避免短时间内重复更新
        const now = Date.now();
        if (now - lastUpdateTime < 1000) { // 1秒内不重复更新
            return;
        }
        lastUpdateTime = now;
        let counter = document.getElementById('bili-short-video-counter');

        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'bili-short-video-counter';
            counter.className = 'bilibili-short-video-counter';
            counter.addEventListener('click', toggleBlockingState);
            document.body.appendChild(counter);
        }

        // 计算总屏蔽数量
        const totalBlocked = blockStats.shortVideos + blockStats.ads + blockStats.live + blockStats.users;

        // 显示详细统计信息
        const minutes = Math.floor(minDuration / 60);
        const seconds = minDuration % 60;
        const statusPrefix = isTemporarilyDisabled ? '已暂停屏蔽' : '已屏蔽';

        let counterText = `${statusPrefix} ${totalBlocked} 项内容`;

        if (totalBlocked > 0) {
            const details = [];
            if (blockStats.shortVideos > 0) details.push(`短视频${blockStats.shortVideos}`);
            if (blockStats.ads > 0) details.push(`推广${blockStats.ads}`);
            if (blockStats.live > 0) details.push(`直播${blockStats.live}`);
            if (blockStats.users > 0) details.push(`特定UP${blockStats.users}`);

            if (details.length > 0) {
                counterText += ` (${details.join('/')})`;
            }
        }

        counterText += `\n时长阈值: ${minutes}分${seconds > 0 ? seconds + '秒' : ''}`;

        counter.textContent = counterText;

        // 更新计数器状态样式
        if (isTemporarilyDisabled) {
            counter.classList.add('bilibili-short-video-disabled');
        } else {
            counter.classList.remove('bilibili-short-video-disabled');
        }

        counter.style.display = 'block';
        createFloatButton();

        // 清除之前的定时器，设置新的自动隐藏
        if (counterHideTimer) {
            clearTimeout(counterHideTimer);
        }
        counterHideTimer = setTimeout(() => {
            if (counter) {
                counter.style.display = 'none';
            }
            counterHideTimer = null;
        }, 5000);
    }

    // 创建悬浮按钮
    function createFloatButton() {
        let floatButton = document.getElementById('bili-short-video-float-button');

        if (!floatButton) {
            floatButton = document.createElement('div');
            floatButton.id = 'bili-short-video-float-button';
            floatButton.className = 'bilibili-short-video-float-button';
            floatButton.title = '点击显示统计信息';
            floatButton.addEventListener('click', () => {
                // 显示计数器
                const counter = document.getElementById('bili-short-video-counter');
                if (counter) {
                    counter.style.display = 'block';

                    // 清除之前的定时器，设置新的自动隐藏
                    if (counterHideTimer) {
                        clearTimeout(counterHideTimer);
                    }
                    counterHideTimer = setTimeout(() => {
                        if (counter) {
                            counter.style.display = 'none';
                        }
                        counterHideTimer = null;
                    }, 5000);
                    document.body.appendChild(floatButton);
                }

                // 如果当前页面不启用，隐藏按钮
                if (!shouldEnableOnCurrentPage()) {
                    floatButton.style.display = 'none';
                    return;
                } else {
                    floatButton.style.display = 'block';
                }

                // 更新文本
                floatButton.textContent = isTemporarilyDisabled ? '🔴 短视频过滤已暂停' : '🟢 短视频过滤器';
            })
        }
    }

    // 监视DOM变化，处理动态加载的内容
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }

            if (shouldProcess) {
                // 防抖，避免频繁处理
                clearTimeout(window.biliShortVideoTimer);
                window.biliShortVideoTimer = setTimeout(() => {
                    processVideos();
                }, 500); // 增加到500ms，减少频繁触发
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    function init() {
        // 初始化延迟一点，确保页面加载
        setTimeout(() => {
            // 首次处理页面上的视频
            processVideos();

            // 开始监视DOM变化
            observeDOM();
        }, 500);
    }

    // 当页面加载完成后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 如果已经加载完成，直接初始化
        init();
    }
})();