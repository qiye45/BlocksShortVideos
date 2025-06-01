// ==UserScript==
// @name         哔哩哔哩短视频屏蔽
// @namespace    https://github.com/qiye45/BlocksShortVideos
// @version      1.0
// @description  屏蔽哔哩哔哩网页版上的短视频（可设置最短时长，默认2分钟）
// @author       qiye45
// @match        *://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @license      GPL-3.0 license
// ==/UserScript==

(function() {
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

    // 添加CSS样式
    GM_addStyle(`
        .bilibli-short-video-blocked {
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
            width: 400px;
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

        .bilibili-settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }

        .bilibili-settings-buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .bilibili-settings-button {
            padding: 5px 15px;
            border-radius: 4px;
            margin-left: 10px;
            cursor: pointer;
            border: none;
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
        }
    `);

    // 注册菜单命令
    GM_registerMenuCommand('设置最短视频时长', showSettings);
    GM_registerMenuCommand('临时显示被屏蔽视频', toggleBlockingState);
    GM_registerMenuCommand('高级设置', showAdvancedSettings);

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

        // 默认启用
        return true;
    }

    // 高级设置界面
    function showAdvancedSettings() {
        const modal = document.createElement('div');
        modal.className = 'bilibili-settings-modal';

        modal.innerHTML = `
            <div class="bilibili-settings-content">
                <div class="bilibili-settings-title">哔哩哔哩短视频屏蔽 - 高级设置</div>

                <div class="bilibili-settings-row">
                    <label>最短视频时长：</label>
                    <div class="bilibili-time-input">
                        <input type="number" id="bili-minutes" min="0" value="${Math.floor(minDuration / 60)}"> 分
                        <input type="number" id="bili-seconds" min="0" max="59" value="${minDuration % 60}"> 秒
                    </div>
                </div>

                <div class="bilibili-settings-title" style="font-size: 14px; margin-top: 20px;">在以下页面启用屏蔽：</div>

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

                <div class="bilibili-settings-buttons">
                    <button class="bilibili-settings-button bilibili-settings-cancel">取消</button>
                    <button class="bilibili-settings-button bilibili-settings-save">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

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

            // 获取页面启用设置
            const newEnabledPages = {
                home: document.getElementById('bili-home').checked,
                video: document.getElementById('bili-video').checked,
                channel: document.getElementById('bili-channel').checked,
                search: document.getElementById('bili-search').checked,
                space: document.getElementById('bili-space').checked,
                dynamic: document.getElementById('bili-dynamic').checked
            };

            // 保存页面设置
            enabledPages = newEnabledPages;
            GM_setValue('enabledPages', enabledPages);

            // 关闭设置面板
            document.body.removeChild(modal);

            // 重新应用屏蔽
            isTemporarilyDisabled = false;
            processVideos();
            updateCounter();
        });
    }

    // 设置界面
    function showSettings() {
        const currentMinutes = Math.floor(minDuration / 60);
        const currentSeconds = minDuration % 60;

        const minutesStr = window.prompt('请输入最短视频时长（分钟）：', currentMinutes);
        if (minutesStr === null) return; // 用户取消

        const minutes = parseInt(minutesStr, 10);
        if (isNaN(minutes) || minutes < 0) {
            alert('请输入有效的数字！');
            return;
        }

        const secondsStr = window.prompt('请输入额外的秒数：', currentSeconds);
        if (secondsStr === null) return; // 用户取消

        const seconds = parseInt(secondsStr, 10);
        if (isNaN(seconds) || seconds < 0 || seconds > 59) {
            alert('请输入0-59之间的有效秒数！');
            return;
        }

        const newDuration = minutes * 60 + seconds;
        GM_setValue('minDuration', newDuration);
        minDuration = newDuration;

        alert(`设置已保存！当前屏蔽 ${minutes} 分 ${seconds} 秒以下的视频。`);

        // 重新过滤页面上的视频
        isTemporarilyDisabled = false;
        processVideos();

        // 更新计数器
        updateCounter();
    }

    // 切换屏蔽状态
    function toggleBlockingState() {
        isTemporarilyDisabled = !isTemporarilyDisabled;

        // 移除或应用屏蔽类
        const blockedVideos = document.querySelectorAll('.bilibli-short-video-blocked');
        blockedVideos.forEach(video => {
            if (isTemporarilyDisabled) {
                video.classList.remove('bilibli-short-video-blocked');
            } else {
                video.classList.add('bilibli-short-video-blocked');
            }
        });

        // 更新计数器样式
        updateCounter();

        // 显示状态提示
        alert(isTemporarilyDisabled ? '短视频屏蔽已暂时关闭，刷新页面后将恢复屏蔽。' : '短视频屏蔽已重新启用。');
    }

    // 转换时间字符串为秒数
    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;

        const parts = timeStr.split(':').map(part => parseInt(part, 10));

        if (parts.length === 3) { // HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) { // MM:SS
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) { // SS
            return parts[0];
        }

        return 0;
    }

    // 处理视频卡片
    function processVideoCard(videoCard) {
        if (!videoCard) return false;

        // 首页、分区页视频卡片
        let durationElement = videoCard.querySelector('.bili-video-card__stats__duration');

        // 视频播放页右侧推荐视频
        if (!durationElement) {
            durationElement = videoCard.querySelector('.duration');
        }

        // 搜索结果页
        if (!durationElement) {
            durationElement = videoCard.querySelector('.bili-video-card__mask .bili-video-card__stats__duration');
        }

        // 热门视频、排行榜等
        if (!durationElement) {
            durationElement = videoCard.querySelector('.length');
        }

        // UP主空间页
        if (!durationElement) {
            durationElement = videoCard.querySelector('.video-duration');
        }

        if (!durationElement) return false;

        const durationStr = durationElement.textContent.trim();
        const durationSeconds = timeToSeconds(durationStr);

        if (durationSeconds < minDuration) {
            if (!isTemporarilyDisabled) {
                videoCard.classList.add('bilibli-short-video-blocked');
            }
            return true;
        } else {
            // 确保移除类名
            videoCard.classList.remove('bilibli-short-video-blocked');
        }

        return false;
    }

    // 视频卡片的选择器
    const VIDEO_CARD_SELECTORS = [
        '.bili-video-card__wrap',                   // 标准视频卡片
        '.small-item',                              // 右侧推荐视频
        '.video-page-card-small',                   // 播放页推荐
        '.video-item-biref',                        // 搜索结果
        '.rank-item',                               // 排行榜
        '.video-card',                              // UP主空间
        '.l-item',                                  // 热门视频
        'li.video-item',                            // 分区推荐
        '.video.matrix',                            // 合集视频
        '.opus-module-content .opus-item',          // 动态推荐
        '.spread-module',                           // 广告视频
        '.bili-live-card'                           // 直播卡片（不处理，但需要考虑）
    ];

    // 统计屏蔽的视频数量
    let blockedCount = 0;

    // 处理所有视频
    function processVideos() {
        // 检查当前页面是否需要启用屏蔽
        if (!shouldEnableOnCurrentPage()) {
            return;
        }

        let newBlockedCount = 0;

        // 遍历所有可能的卡片选择器
        VIDEO_CARD_SELECTORS.forEach(selector => {
            const cards = document.querySelectorAll(selector);
            cards.forEach(card => {
                if (processVideoCard(card)) {
                    newBlockedCount++;
                }
            });
        });

        // 如果屏蔽数量有变化，更新计数器
        if (newBlockedCount !== blockedCount) {
            blockedCount = newBlockedCount;
            updateCounter();
        }
    }

    // 更新统计计数器
    function updateCounter() {
        // 如果当前页面不启用，不显示计数器
        if (!shouldEnableOnCurrentPage()) {
            const oldCounter = document.getElementById('bili-short-video-counter');
            if (oldCounter) oldCounter.style.display = 'none';
            const oldButton = document.getElementById('bili-short-video-float-button');
            if (oldButton) oldButton.style.display = 'none';
            return;
        }

        let counter = document.getElementById('bili-short-video-counter');

        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'bili-short-video-counter';
            counter.className = 'bilibili-short-video-counter';
            counter.addEventListener('click', toggleBlockingState);
            document.body.appendChild(counter);
        }

        // 显示当前屏蔽数量和设置
        const minutes = Math.floor(minDuration / 60);
        const seconds = minDuration % 60;
        const statusPrefix = isTemporarilyDisabled ? '已暂停屏蔽' : '已屏蔽';
        counter.textContent = `${statusPrefix} ${blockedCount} 个短视频 (阈值: ${minutes}分${seconds > 0 ? seconds + '秒' : ''})`;

        // 更新计数器状态样式
        if (isTemporarilyDisabled) {
            counter.classList.add('bilibili-short-video-disabled');
        } else {
            counter.classList.remove('bilibili-short-video-disabled');
        }

        // 显示计数器
        counter.style.display = 'block';

        // 创建悬浮按钮
        createFloatButton();

        // 5秒后自动隐藏计数器
        setTimeout(() => {
            counter.style.display = 'none';
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

                    // 5秒后自动隐藏
                    setTimeout(() => {
                        counter.style.display = 'none';
                    }, 5000);
                }
            });
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
                }, 200);
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