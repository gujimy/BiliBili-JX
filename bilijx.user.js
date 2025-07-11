// ==UserScript==
// @name         BiliBili 视频解析脚本(增强型)
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      2.6
// @description  只因你实在是太美 Baby!
// @author       laomo
// @match        https://www.bilibili.com/video*
// @match        https://www.bilibili.com/*bvid*
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/v/popular*
// @match        https://search.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://www.bilibili.com/v/*/ranked*
// @match        https://www.bilibili.com/channel/*
// @match        https://www.bilibili.com/read/home*
// @match        https://t.bilibili.com/*
// @match        https://www.bilibili.com/history*
// @match        https://live.bilibili.com/*
// @match        https://www.bilibili.com/bangumi/*
// @downloadURL  https://raw.githubusercontent.com/gujimy/BiliBili-JX/main/bilijx.user.js
// @updateURL    https://raw.githubusercontent.com/gujimy/BiliBili-JX/main/bilijx.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/jquery/3.2.1/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';
    
    // ------------------------------ 干净链接功能 ------------------------------
    // 清理B站URL中的垃圾参数
    function cleanBilibiliUrls() {
        function isURL(url, base) {
            try {
                if (typeof url === "string" && /^[\W\w]+\.[\W\w]+/.test(url) && !/^[a-z]+:/.test(url)) {
                    // 处理省略协议头情况
                    const str = url.startsWith("//") ? "" : "//";
                    url = location.protocol + str + url;
                }
                return new URL(url, base);
            } catch (e) {
                return false;
            }
        }
        
        /** 垃圾参数 */
        const paramsSet = new Set([
            'spm_id_from',
            'from_source',
            'msource',
            'bsource',
            'seid',
            'source',
            'session_id',
            'visit_id',
            'sourceFrom',
            'from_spmid',
            'share_source',
            'share_medium',
            'share_plat',
            'share_session_id',
            'share_tag',
            'unique_k',
            "csource",
            "vd_source",
            "tab",
            "is_story_h5",
            "share_from",
            "plat_id",
            "-Arouter",
            "spmid",
        ]);
        
        /** 节点监听暂存 */
        const nodelist = [];
        
        /**
         * 清理url
         * @param str 原url
         * @returns 新url
         */
        function clean(str) {
            if (/.*:\/\/.*.bilibili.com\/.*/.test(str) && !str.includes('passport.bilibili.com')) {
                const url = isURL(str);
                if (url) {
                    paramsSet.forEach(d => {
                        url.searchParams.delete(d);
                    });
                    return url.toJSON();
                }
            }
            return str;
        }
        
        /** 地址备份 */
        let locationBackup;
        
        /** 处理地址栏 */
        function cleanLocation() {
            const { href } = location;
            if (href === locationBackup) return;
            replaceUrl(locationBackup = clean(href));
        }
        
        /** 处理href属性 */
        function anchor(list) {
            list.forEach(d => {
                if (!d.href) return;
                d.href.includes("bilibili.tv") && (d.href = d.href.replace("bilibili.tv", "bilibili.com")); // tv域名失效
                d.href = clean(d.href);
            });
        }
        
        /** 检查a标签 */
        function click(e) { // 代码copy自B站spm.js
            var f = e.target;
            for (; f && "A" !== f.tagName;) {
                f = f.parentNode
            }
            if ("A" !== (null == f ? void 0 : f.tagName)) {
                return
            }
            anchor([f]);
        }
        
        /**
         * 修改当前URL而不触发重定向
         * **无法跨域操作！**
         * @param url 新URL
         */
        function replaceUrl(url) {
            window.history.replaceState(window.history.state, "", url);
        }
        
        cleanLocation(); // 及时处理地址栏
        
        // 处理注入的节点
        let timer = 0;
        observerAddedNodes((node) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                cleanLocation();
                anchor(document.querySelectorAll("a"));
            }, 100);
        });
        
        // 处理点击事件
        window.addEventListener("click", click, !1);
        
        // 处理右键菜单
        window.addEventListener("contextmenu", click, !1);
        
        // 页面载入完成
        document.addEventListener("load", () => anchor(document.querySelectorAll("a")), !1);
        
        /**
         * 注册节点添加监听
         * **监听节点变动开销极大，如非必要请改用其他方法并且用后立即销毁！**
         * @param callback 添加节点后执行的回调函数
         * @returns 注册编号
         */
        function observerAddedNodes(callback) {
            try {
                if (typeof callback === "function") nodelist.push(callback);
                return nodelist.length - 1;
            } catch (e) { console.error(e) }
        }
        
        const observe = new MutationObserver(d => d.forEach(d => {
            d.addedNodes[0] && nodelist.forEach(async f => {
                try {
                    f(d.addedNodes[0])
                } catch (e) { console.error(e) }
            })
        }));
        
        observe.observe(document, { childList: true, subtree: true });
        
        // 重写window.open
        window.open = ((__open__) => {
            return (url, name, params) => {
                return __open__(clean(url), name, params)
            }
        })(window.open);
        
        // 处理navigation API (如果支持)
        if(window.navigation) {
            window.navigation.addEventListener('navigate', e => {
                const newURL = clean(e.destination.url)
                if(e.destination.url != newURL) {
                    e.preventDefault(); // 返回前先阻止原事件
                    if(newURL == window.location.href) return // 如果清理后和原来一样就直接返回
                    // 否则处理清理后的链接
                    window.history.replaceState(window.history.state, "", newURL)
                }
            });
        }
    }
    
    // 初始化干净链接功能
    cleanBilibiliUrls();
    
    // ------------------------------ 主脚本功能 ------------------------------
  
    // 定义一些常量
    const NOTIFICATION_TIMEOUT = 5000; // 5秒 (原来是10秒，已缩减一半)
    const ERROR_TIMEOUT = 5000; // 5秒
    const NOTIFICATION_IMAGE = 'https://wp-cdn.4ce.cn/v2/8OzfSAD.gif';
    const TYPE_VIDEO = 'video';
    const TYPE_LIVE = 'live';
    const DEBOUNCE_DELAY = 300; // 防抖延迟时间
    
    // 存储上一次的URL，用于检测URL变化
    let lastUrl = window.location.href;
    
    // 监听URL变化的函数
    function setupUrlChangeListener() {
        // 使用定时器定期检查URL变化
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                console.log('URL已变化:', currentUrl);
                lastUrl = currentUrl;
                
                // 检测页面类型
                const isCurrentLivePage = currentUrl.includes('live.bilibili.com');
                const isCurrentVideoPage = !isCurrentLivePage && 
                                  (currentUrl.includes('/video/') || 
                                   currentUrl.includes('bvid='));
                
                // 重新添加解析按钮
                removeOldButtons();
                
                // 根据新的页面类型创建相应的解析按钮
                if (isCurrentVideoPage) {
                    console.log('URL变化后重新创建视频解析按钮');
                    createAnalysisButton('videoAnalysis1', true, false);
                    createAnalysisButton('videoAnalysis2', false, false);
                } else if (isCurrentLivePage) {
                    console.log('URL变化后重新创建直播解析按钮');
                    createAnalysisButton('liveAnalysis1', true, true);
                    createAnalysisButton('liveAnalysis2', false, true);
                }
                
                // 更新封面解析按钮
                setTimeout(addCoverAnalysisButtons, 500);
            }
        }, 1000); // 每秒检查一次URL变化
    }
    
    // ------------------------------ CDN锁定功能 ------------------------------
    // CDN相关常量
    const DEFAULT_CDN = '使用默认CDN';
    const CDN_STORAGE_KEY = 'bilijx_cdn_node';
    const REGION_STORAGE_KEY = 'bilijx_region';
    const CDN_API_URL = 'https://kanda-akihito-kun.github.io/ccb/api';
    
    // 初始CDN列表 (仅作为备用)
    const initCdnList = [
        'upos-sz-mirrorali.bilivideo.com',
        'upos-sz-mirroraliov.bilivideo.com',
        'upos-sz-mirroralib.bilivideo.com',
        'upos-sz-estgcos.bilivideo.com',

    ];
    
    // 地区列表和CDN列表 (会被动态更新)
    let regionList = ['默认'];
    let cdnList = [DEFAULT_CDN, ...initCdnList];
    
    // 获取当前选择的CDN节点
    function getCurrentCdn() {
        return GM_getValue(CDN_STORAGE_KEY, DEFAULT_CDN);
    }
    
    // 获取当前选择的地区
    function getCurrentRegion() {
        return GM_getValue(REGION_STORAGE_KEY, regionList[0]);
    }
    
    // 判断是否启用了CDN锁定
    function isCdnLockEnabled() {
        return getCurrentCdn() !== DEFAULT_CDN;
    }
    
    // 替换视频URL中的CDN域名
    function replaceCdnInUrl(url) {
        if (!isCdnLockEnabled()) return url;
        
        const currentCdn = getCurrentCdn();
        // 替换URL中的CDN域名部分
        return url.replace(
            /https:\/\/[^\/]+\//,
            'https://' + currentCdn + '/'
        );
    }
    
    // 获取地区列表
    async function getRegionList() {
        try {
            const response = await fetch(`${CDN_API_URL}/region.json`);
            if (!response.ok) {
                console.error('获取地区列表失败:', response.statusText);
                return;
            }
            
            const data = await response.json();
            regionList = ['默认', ...data];
            console.log('已更新地区列表:', regionList);
        } catch (error) {
            console.error('获取地区列表失败:', error);
        }
    }
    
    // 根据地区获取CDN列表
    async function getCdnListByRegion(region) {
        try {
            if (region === '默认' || region === '-') {
                cdnList = [DEFAULT_CDN, ...initCdnList];
                return;
            }
            
            const response = await fetch(`${CDN_API_URL}/cdn.json`);
            if (!response.ok) {
                console.error('获取CDN列表失败:', response.statusText);
                return;
            }
            
            const data = await response.json();
            
            // 从完整的CDN数据中获取指定地区的数据
            const regionData = data[region] || [];
            cdnList = [DEFAULT_CDN, ...regionData];
            
            // 更新设置面板中的CDN选择器
            updateCdnSelector();
            
            console.log(`已更新 ${region} 地区的CDN列表:`, cdnList);
        } catch (error) {
            console.error('获取CDN列表失败:', error);
        }
    }
    
    // 更新设置面板中的CDN选择器
    function updateCdnSelector() {
        const cdnSelect = document.getElementById('bilijx-cdn-select');
        if (cdnSelect) {
            cdnSelect.innerHTML = cdnList.map(cdn => 
                `<option value="${cdn}"${cdn === getCurrentCdn() ? ' selected' : ''}>${cdn}</option>`
            ).join('');
        }
    }
    
    // 创建设置面板
    async function createSettingsPanel() {
        // 如果已经存在设置面板，则返回
        if (document.getElementById('bilijx-settings-panel')) return;
        
        // 先获取最新的地区和CDN列表
        await getRegionList();
        await getCdnListByRegion(getCurrentRegion());
        
        // 创建设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'bilijx-settings-panel';
        settingsPanel.style.display = 'none';
        
        // 设置面板样式
        GM_addStyle(`
            #bilijx-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                padding: 20px;
                font-family: "Microsoft YaHei", sans-serif;
            }
            
            #bilijx-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            #bilijx-settings-header h2 {
                margin: 0;
                color: #FB7299;
                font-size: 18px;
            }
            
            #bilijx-settings-close {
                cursor: pointer;
                font-size: 20px;
                color: #999;
            }
            
            #bilijx-settings-close:hover {
                color: #FB7299;
            }
            
            .bilijx-settings-group {
                margin-bottom: 15px;
            }
            
            .bilijx-settings-group h3 {
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #333;
            }
            
            .bilijx-settings-group select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f9f9f9;
                font-size: 14px;
            }
            
            .bilijx-settings-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
            }
            
            .bilijx-settings-footer button {
                padding: 8px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-left: 10px;
            }
            
            #bilijx-settings-save {
                background-color: #FB7299;
                color: white;
            }
            
            #bilijx-settings-save:hover {
                background-color: #fc8bab;
            }
            
            #bilijx-settings-cancel {
                background-color: #f0f0f0;
                color: #666;
            }
            
            #bilijx-settings-cancel:hover {
                background-color: #e0e0e0;
            }
            
            #bilijx-settings-button {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 45px;
                height: 45px;
                background-color: rgba(251, 114, 153, 0.8);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
            }
            
            #bilijx-settings-button:hover {
                background-color: rgba(251, 114, 153, 1);
                transform: scale(1.1);
            }
        `);
        
        // 设置面板内容
        settingsPanel.innerHTML = `
            <div id="bilijx-settings-header">
                <h2>B站解析脚本设置</h2>
                <span id="bilijx-settings-close">×</span>
            </div>
            
            <div class="bilijx-settings-group">
                <h3>地区选择</h3>
                <select id="bilijx-region-select">
                    ${regionList.map(region => 
                        `<option value="${region}" ${region === getCurrentRegion() ? 'selected' : ''}>${region}</option>`
                    ).join('')}
                </select>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    选择您所在的地区，以获取该地区最优的CDN节点列表
                </p>
            </div>
            
            <div class="bilijx-settings-group">
                <h3>CDN节点选择</h3>
                <select id="bilijx-cdn-select">
                    ${cdnList.map(cdn => 
                        `<option value="${cdn}" ${cdn === getCurrentCdn() ? 'selected' : ''}>${cdn}</option>`
                    ).join('')}
                </select>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    选择特定CDN节点可以提高视频加载速度，如遇视频加载慢可尝试切换。
                </p>
            </div>
            
            <div class="bilijx-settings-footer">
                <button id="bilijx-settings-cancel">取消</button>
                <button id="bilijx-settings-save">保存设置</button>
            </div>
        `;
        
        // 添加设置面板到页面
        document.body.appendChild(settingsPanel);
        
        // 添加设置按钮
        const settingsButton = document.createElement('button');
        settingsButton.id = 'bilijx-settings-button';
        settingsButton.innerHTML = '⚙️';
        settingsButton.title = 'B站解析脚本设置';
        document.body.appendChild(settingsButton);
        
        // 设置按钮点击事件
        settingsButton.addEventListener('click', function() {
            document.getElementById('bilijx-settings-panel').style.display = 'block';
        });
        
        // 关闭按钮点击事件
        document.getElementById('bilijx-settings-close').addEventListener('click', function() {
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });
        
        // 取消按钮点击事件
        document.getElementById('bilijx-settings-cancel').addEventListener('click', function() {
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });
        
        // 地区选择变化事件
        document.getElementById('bilijx-region-select').addEventListener('change', async function(e) {
            const selectedRegion = e.target.value;
            // 根据选择的地区更新CDN列表
            await getCdnListByRegion(selectedRegion);
        });
        
        // 保存按钮点击事件
        document.getElementById('bilijx-settings-save').addEventListener('click', function() {
            // 获取选择的值
            const selectedRegion = document.getElementById('bilijx-region-select').value;
            const selectedCdn = document.getElementById('bilijx-cdn-select').value;
            
            // 保存设置
            GM_setValue(REGION_STORAGE_KEY, selectedRegion);
            GM_setValue(CDN_STORAGE_KEY, selectedCdn);
            
            // 显示保存成功提示
            showNotification('设置已保存', '新的CDN设置将在下次解析时生效', false);
            
            // 关闭设置面板
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });
    }
    
    // 添加提示框的样式
    GM_addStyle(`
        :root {
            --video-color: rgb(0, 174, 236);
            --video-color-transparent: rgba(0, 174, 236, 0.8);
            --live-color: rgb(242, 82, 154);
            --live-color-transparent: rgba(242, 82, 154, 0.8);
            --white: rgb(255, 255, 255);
            --border-color: rgb(241, 242, 243);
            --default-notification-bg: rgba(80, 80, 80, 0.85);
            --video-notification-bg: rgba(0, 174, 236, 0.25);
            --live-notification-bg: rgba(242, 82, 154, 0.25);
            --error-notification-bg: rgba(231, 76, 60, 0.25);
        }
        
        #notificationBox {
            position: fixed;
            bottom: -100px; /* 初始位置在视口之外 */
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            padding: 20px;
            background-color: var(--default-notification-bg);
            color: var(--white);
            text-align: center;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: all 0.5s ease;
            z-index: 9999;
            backdrop-filter: blur(3px);
        }
        
        #notificationBox.show {
            bottom: 20px; /* 提示框弹出位置 */
            opacity: 1;
        }
        
        #notificationBox.video-type {
            background-color: var(--video-notification-bg);
            border-left: 4px solid var(--video-color);
        }
        
        #notificationBox.live-type {
            background-color: var(--live-notification-bg);
            border-left: 4px solid var(--live-color);
        }
        
        #notificationBox.error-type {
            background-color: var(--error-notification-bg);
            border-left: 4px solid rgb(231, 76, 60);
        }
        
        /* 通用封面按钮样式 */
        .cover-analysis-btn {
            position: absolute;
            bottom: 10px;
            right: 10px;
            color: var(--white);
            border: none;
            border-radius: 8px;
            padding: 4px 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        *:hover > .cover-analysis-btn {
            opacity: 1;
        }
        
        /* 视频封面按钮特定样式 */
        .video-cover-analysis-btn {
            background: var(--video-color-transparent);
        }
        
        .video-cover-analysis-btn:hover {
            background: var(--video-color);
        }
        
        /* 直播封面按钮特定样式 */
        .live-cover-analysis-btn {
            background: var(--live-color-transparent);
        }
        
        .live-cover-analysis-btn:hover {
            background: var(--live-color);
        }
        
        /* 通用固定解析按钮样式 */
        .analysis-btn {
            z-index: 999;
            width: 45px;
            height: 45px;
            color: var(--white);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 14px;
            position: fixed;
            cursor: pointer;
        }
        
        /* 视频解析按钮特定样式 */
        .video-analysis-btn {
            background: var(--video-color);
        }
        
        /* 直播解析按钮特定样式 */
        .live-analysis-btn {
            background: var(--live-color);
        }
    `);
  
    // 创建提示框元素
    const notificationBox = document.createElement('div');
    notificationBox.id = 'notificationBox';
    document.body.appendChild(notificationBox);
  
    // 通知框自动隐藏的定时器ID
    let notificationTimer = null;
    
    // 通用显示通知函数
    function showNotification(title, message, isError = false, type = null) {
        // 如果已经有通知显示中，先清除它的定时器
        if (notificationTimer) {
            clearTimeout(notificationTimer);
            notificationTimer = null;
            
            // 如果当前通知已经显示，则先将其隐藏，添加短暂延迟后再显示新通知
            if (notificationBox.classList.contains('show')) {
                notificationBox.classList.remove('show');
                
                // 使用setTimeout延迟一小段时间再显示新通知，制造动画效果
                setTimeout(() => showNewNotification(), 300);
                return;
            }
        }
        
        // 直接显示新通知
        showNewNotification();
        
        // 显示新通知的内部函数
        function showNewNotification() {
            // 移除所有可能的类型类
            notificationBox.classList.remove('video-type', 'live-type', 'error-type');
            
            // 设置通知内容
            notificationBox.innerHTML = `
                <img src="${NOTIFICATION_IMAGE}" alt="通知图标" style="width: 100px; height: 100px;">
                <h3>${title}</h3>
                <p>${message}</p>
            `;
            
            // 根据类型添加对应的样式类
            if (isError) {
                notificationBox.classList.add('error-type');
            } else if (type === TYPE_VIDEO) {
                notificationBox.classList.add('video-type');
            } else if (type === TYPE_LIVE) {
                notificationBox.classList.add('live-type');
            }
            
            // 显示通知
            notificationBox.classList.add('show');
            
            // 设置定时器，自动隐藏提示框
            notificationTimer = setTimeout(() => {
                notificationBox.classList.remove('show');
                notificationTimer = null;
            }, isError ? ERROR_TIMEOUT : NOTIFICATION_TIMEOUT);
        }
    }
    
    // 防抖函数
    function debounce(func, delay) {
        let timer = null;
        return function(...args) {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                func.apply(this, args);
                timer = null;
            }, delay);
        };
    }
    
    // 删除可能存在的所有旧按钮
    function removeOldButtons() {
        // 旧按钮ID列表
        const oldButtonIds = ['BiliAnalysis', 'BiliAnalysis1'];
        
        // 移除旧按钮
        oldButtonIds.forEach(id => {
            const oldButton = document.getElementById(id);
            if (oldButton) {
                oldButton.remove();
            }
        });
    }
  
    // 检测页面类型
    const isLivePage = window.location.hostname === 'live.bilibili.com' || 
                        window.location.href.includes('live.bilibili.com');
    const isVideoPage = !isLivePage && 
                        (window.location.href.includes('/video/') || 
                        window.location.href.includes('bvid='));
    
    // 移除旧按钮
    removeOldButtons();
    
    // 创建固定解析按钮
    function createAnalysisButton(id, isRightCorner, isLive) {
        const button = document.createElement('button');
        button.id = id;
        button.className = `analysis-btn ${isLive ? 'live-analysis-btn' : 'video-analysis-btn'}`;
        button.innerHTML = isLive ? '直播<br>解析' : '视频<br>解析';
        
        // 设置位置
        if (isRightCorner) {
            button.style.top = '800px';
            button.style.right = '0px';
        } else {
            button.style.top = '100px';
            button.style.left = '0px';
        }
        
        // 添加点击事件
        button.addEventListener('click', isLive ? clickLiveAnalysis : clickVideoAnalysis);
        
        // 添加到页面
        document.body.appendChild(button);
        
        return button;
    }
    
    // 根据页面类型创建相应的解析按钮
    if (isVideoPage) {
        console.log('创建视频解析按钮');
        // 创建右下角和左上角视频解析按钮
        createAnalysisButton('videoAnalysis1', true, false);
        createAnalysisButton('videoAnalysis2', false, false);
    } else if (isLivePage) {
        console.log('创建直播解析按钮');
        // 创建右下角和左上角直播解析按钮
        createAnalysisButton('liveAnalysis1', true, true);
        createAnalysisButton('liveAnalysis2', false, true);
    }

    // 添加视频封面解析按钮的函数
    function addCoverAnalysisButtons() {
        // 视频封面
        addVideoCoverButtons();
        // 直播封面
        addLiveCoverButtons();
    }
    
    // 视频封面选择器缓存
    const videoCoverSelectors = [
        // 首页、分区推荐
        '.video-card a.video-card__content',
        '.bili-video-card__wrap a.bili-video-card__image--link',
        '.bili-video-card .bili-video-card__image > a',
        '.bili-video-card__wrap > a', 
        // 视频卡片
        '.video-item .bili-video-card__wrap a',
        // 搜索结果页
        '.search-card .video-card__content',
        '.search-card .bili-video-card__image--link',
        '.search-card__content .bili-video-card__image--link',
        '.search-card__info .bili-video-card__image--link',
        // 旧版卡片
        'a.cover',
        '.cover-normal',
        '.cover > a',
        // 用户空间页视频
        '.upuser-video-card__content',
        '.small-item .cover-container',
        '.small-cover__content',
        '.video-content .cover-container',
        // 视频详情页下方和右侧推荐
        '.video-page-card-small',
        '.video-page-card',
        '.rec-list .video-card-reco',
        '.card-box .video-card-common',
        '.aside-panel-main a.pic-box',
        '.video-list-item .video-cover',
        '.card-box .pic',
        // 频道页、排行榜
        '.rank-item .content-wrap',
        '.rank-wrap .info-box',
        '.storey-box .spread-module',
        '.spread-item a.pic',
        '.channel-list .channel-item',
        // 动态页视频
        '.video-container .bili-video-card',
        '.bili-dyn-item a.bili-video-card__cover',
        '.bili-dyn-card-video__wrap',
        '.bili-dyn-content .bili-dyn-card-video',
        // 播放历史页面
        '.history-wrap .cover-contain',
        '.history-wrap .video-card__content',
        '.history-wrap .history-card',
        '.history-wrap .card-box .pic',
        '.history-wrap .bili-video-card__image--link',
        '.history-list .history-card .pic-box',
        '.history-list .cover a',
        // 番剧、影视
        '.bangumi-card .cover-box',
        '.bangumi-card-media .media-cover',
        '.bangumi-list .cover',
        '.season-wrap .cover',
        '.media-card .cover-container'
    ];
    
    // 直播封面选择器缓存
    const liveCoverSelectors = [
        // 首页推荐直播
        '.live-card .live-card-wrapper',
        '.live-card .cover-ctnr',
        '.live-card .cover',
        // 直播页面卡片
        '.room-card .cover-ctnr',
        '.room-card-wrapper .room-cover',
        '.bili-live-card__cover',
        '.bili-live-card__wrap',
        // 动态页直播
        '.bili-dyn-live-card',
        '.bili-video-card__wrap .bili-live-card',
        // 通用选择器
        'a[href*="live.bilibili.com"]',
        '.live-box .cover',
        '.room-list .room-card'
    ];
    
    // 添加视频封面按钮
    function addVideoCoverButtons() {
        // 使用选择器查找所有可能的视频封面
        processElementsWithSelectors(videoCoverSelectors, processVideoElement);
        
        // 尝试查找所有a标签，但必须包含图片元素才添加按钮
        try {
            document.querySelectorAll('a').forEach(linkElement => {
                const href = linkElement.href || '';
                // 确保链接包含视频ID、包含图片元素、没有已经添加的按钮、不是标题元素
                if ((href.includes('/video/BV') || href.includes('bvid=')) && 
                    linkElement.querySelector('img') && // 必须有图片才算封面
                    !linkElement.querySelector('.video-cover-analysis-btn') &&
                    !isLikelyTitleElement(linkElement)) {
                    processVideoElement(linkElement);
                }
            });
        } catch (e) {
            console.error('Error processing link elements:', e);
        }
        
        // 专门处理历史记录页面
        if (window.location.href.includes('/history')) {
            try {
                // 处理历史记录页特殊结构
                document.querySelectorAll('.history-list .history-card').forEach(card => {
                    const coverLink = card.querySelector('.cover a') || card.querySelector('.pic-box');
                    if (coverLink) {
                        processVideoElement(coverLink);
                    }
                });
            } catch (e) {
                console.error('Error processing history page:', e);
            }
        }
    }
    
    // 添加直播封面按钮
    function addLiveCoverButtons() {
        // 使用选择器查找所有可能的直播封面
        processElementsWithSelectors(liveCoverSelectors, processLiveElement);
        
        // 尝试查找所有包含直播链接的a标签
        try {
            document.querySelectorAll('a').forEach(linkElement => {
                const href = linkElement.href || '';
                if (href.includes('live.bilibili.com') && 
                    linkElement.querySelector('img') && 
                    !linkElement.querySelector('.live-cover-analysis-btn')) {
                    processLiveElement(linkElement);
                }
            });
        } catch (e) {
            console.error('Error processing live link elements:', e);
        }
    }
    
    // 处理多个选择器的元素
    function processElementsWithSelectors(selectors, processor) {
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    processor(element);
                });
            } catch (e) {
                console.error('Error processing selector:', selector, e);
            }
        });
    }
    
    // 判断元素是否可能是标题元素
    function isLikelyTitleElement(element) {
        // 判断元素类名是否包含"title"
        if (element.className.toLowerCase().includes('title')) return true;
        
        // 判断父元素或祖先元素是否包含"title"类
        let parent = element.parentElement;
        for (let i = 0; i < 3 && parent; i++) { // 只检查3层父元素
            if (parent.className.toLowerCase().includes('title')) return true;
            parent = parent.parentElement;
        }
        
        // 检查元素内部文本长度，标题通常较长
        const textContent = element.textContent.trim();
        if (textContent.length > 10 && !element.querySelector('img')) return true;
        
        // 检查标签结构，通常标题不会是图片的容器
        if (element.querySelector('img') && element.children.length === 1) return false;
        
        // 检查是否为h1-h6标签
        const tagName = element.tagName.toLowerCase();
        if (tagName.match(/h[1-6]/)) return true;
        
        return false;
    }
    
    // 从链接中提取ID的通用函数
    function extractIdFromLink(link, isLive) {
        if (!link) return null;
        
        if (isLive) {
            // 提取直播房间ID
            if (link.includes('live.bilibili.com')) {
                const match = link.match(/live\.bilibili\.com\/(\d+)/);
                return match ? match[1] : null;
            }
        } else {
            // 提取视频BV号
            if (link.includes('/video/')) {
                const match = link.match(/\/video\/(BV[a-zA-Z0-9]+)/);
                return match ? match[1] : null;
            } else if (link.includes('bvid=')) {
                const match = link.match(/bvid=(BV[a-zA-Z0-9]+)/);
                return match ? match[1] : null;
            }
        }
        
        return null;
    }
    
    // 创建封面解析按钮的通用函数
    function createCoverButton(element, id, isLive, clickHandler) {
        // 设置封面元素为相对定位，以便放置解析按钮
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        // 创建解析按钮
        const analysisBtn = document.createElement('button');
        analysisBtn.className = `cover-analysis-btn ${isLive ? 'live-cover-analysis-btn' : 'video-cover-analysis-btn'}`;
        analysisBtn.innerText = isLive ? '直播解析' : '解析';
        analysisBtn.dataset.id = id;
        
        // 添加点击事件
        analysisBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clickHandler(this.dataset.id);
        });
        
        // 添加按钮到封面
        element.appendChild(analysisBtn);
        
        return analysisBtn;
    }
    
    // 处理单个视频元素
    function processVideoElement(coverElement) {
        // 检查是否已经添加过按钮
        if (coverElement.querySelector('.video-cover-analysis-btn')) return;
        
        // 忽略明显是标题的元素
        if (isLikelyTitleElement(coverElement)) return;
        
        // 获取视频链接
        const videoLink = coverElement.href || coverElement.getAttribute('href');
        if (!videoLink || (!videoLink.includes('bilibili.com/video') && !videoLink.includes('bvid='))) return;
        
        // 从链接中提取BV号
        const bvid = extractIdFromLink(videoLink, false);
        if (!bvid) return;
        
        // 确认元素包含图片才是封面
        if (!coverElement.querySelector('img')) return;
        
        // 创建解析按钮
        createCoverButton(coverElement, bvid, false, analysisVideo);
    }
    
    // 处理直播封面元素
    function processLiveElement(coverElement) {
        // 检查是否已经添加过按钮
        if (coverElement.querySelector('.live-cover-analysis-btn')) return;
        
        // 获取直播链接
        const liveLink = coverElement.href || coverElement.getAttribute('href') || 
                        (coverElement.querySelector('a') ? coverElement.querySelector('a').href : '');
        
        if (!liveLink || !liveLink.includes('live.bilibili.com')) return;
        
        // 从链接中提取房间号
        const roomId = extractIdFromLink(liveLink, true);
        if (!roomId) return;
        
        // 创建直播解析按钮
        createCoverButton(coverElement, roomId, true, analysisLive);
    }
    
    // 通用视频解析函数
    function getVideoUrl(bvid, p = 1, customCallback = null) {
        if (!bvid) {
            showNotification('解析失败', '未提供有效的视频ID', true);
            return;
        }
        
        // 确保bvid格式正确
        if (typeof bvid === 'object' && bvid[0]) {
            bvid = bvid[0];
        }
        
        // 如果bvid不是以BV开头，可能是完整URL或其他格式
        if (typeof bvid === 'string' && !bvid.startsWith('BV')) {
            const match = bvid.match(/BV\w+/);
            if (match) {
                bvid = match[0];
            } else {
                showNotification('解析失败', '无效的视频ID格式', true);
                return;
            }
        }
        
        console.log('开始解析视频:', bvid, '第', p, '个分P');

        // 获取cid
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', 'https://api.bilibili.com/x/player/pagelist?bvid=' + bvid, true);
        httpRequest.send();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                var json = JSON.parse(httpRequest.responseText);
                
                if (!json.data || json.data.length === 0) {
                    console.error('获取CID失败: 没有视频数据');
                    showNotification('解析失败', '无法获取视频信息，可能是视频不存在或已被删除', true);
                    return;
                }
                
                // 确保p是有效的索引
                const pIndex = Math.max(0, Math.min(p - 1, json.data.length - 1));
                var cid = json.data[pIndex].cid;
                console.log('获取到CID:', cid);
        
                // 获取视频链接
                var httpRequest1 = new XMLHttpRequest();
                httpRequest1.open('GET', 'https://api.bilibili.com/x/player/playurl?bvid=' + bvid + '&cid=' + cid + '&qn=116&type=&otype=json&platform=html5&high_quality=1', true);
                httpRequest1.withCredentials = true;
                httpRequest1.send();
                httpRequest1.onreadystatechange = function () {
                    if (httpRequest1.readyState == 4 && httpRequest1.status == 200) {
                        var json = JSON.parse(httpRequest1.responseText);
                        
                        if (!json.data || !json.data.durl || json.data.durl.length === 0) {
                            console.error('获取视频链接失败:', json);
                            showNotification('解析失败', '无法获取视频链接，可能需要登录或该视频有访问限制', true);
                            return;
                        }
                        
                        let videoUrl = json.data.durl[0].url;
                        
                        // 应用CDN锁定功能
                        if (isCdnLockEnabled()) {
                            const originalUrl = videoUrl;
                            videoUrl = replaceCdnInUrl(videoUrl);
                            console.log('CDN已锁定，原始URL:', originalUrl);
                            console.log('替换后URL:', videoUrl);
                        }
                        
                        navigator.clipboard.writeText(videoUrl).catch(e => console.error(e));
                        console.log('获取到视频链接:', videoUrl);
            
                        // 如果有自定义回调函数，则调用
                        if (customCallback) {
                            customCallback(videoUrl);
                        } else {
                            // 默认显示成功提示
                            let message = '链接已复制到剪贴板';
                            if (isCdnLockEnabled()) {
                                message += ' (已锁定CDN: ' + getCurrentCdn() + ')';
                            }
                            showNotification('视频解析成功', message, false, TYPE_VIDEO);
                        }
                    } else if (httpRequest1.readyState == 4) {
                        console.error('获取视频链接失败');
                        showNotification('解析失败', '无法获取视频链接', true);
                    }
                };
            } else if (httpRequest.readyState == 4) {
                console.error('获取CID失败');
                showNotification('解析失败', '无法获取视频CID', true);
            }
        };
    }
    
    // 封面按钮点击解析视频
    function analysisVideo(bvid) {
        // 调用通用视频解析函数，默认P1
        getVideoUrl(bvid, 1, function(videoUrl) {
            showNotification('解析成功', '链接已复制到剪贴板', false, TYPE_VIDEO);
        });
    }
    
    // 视频页面的解析按钮点击事件
    function clickVideoAnalysis() {
      var url = window.location.href;
      console.log('当前URL:', url);
      
      // 尝试从URL中提取BV号
      var BV = /(?=BV).*?(?=\?|\/)/;
      var P = /(?<=p=).*?(?=&|$)/; // 修改正则以匹配更多情况
      var BV1 = url.match(BV);
      var P1 = url.match(P);
  
      if (BV1 == null) {
        // 尝试其他格式的BV号提取
        BV1 = url.match(/(?<=bvid=).*?(?=&|$)/);
        
        // 如果仍然找不到，尝试从页面元素中获取
        if (BV1 == null) {
            // 尝试从视频播放器元素获取
            const videoElement = document.querySelector('.bilibili-player-video');
            if (videoElement) {
                const bvidAttr = videoElement.getAttribute('data-bvid');
                if (bvidAttr) {
                    BV1 = bvidAttr;
                }
            }
            
            // 尝试从页面元数据中获取
            if (BV1 == null) {
                const metaElement = document.querySelector('meta[itemprop="url"]');
                if (metaElement) {
                    const content = metaElement.getAttribute('content');
                    if (content) {
                        const match = content.match(/(?=BV).*?(?=\?|\/|$)/);
                        if (match) {
                            BV1 = match;
                        }
                    }
                }
            }
            
            // 尝试从页面其他元素获取
            if (BV1 == null) {
                // 从分享按钮获取
                const shareBtn = document.querySelector('.share-info');
                if (shareBtn) {
                    const shareUrl = shareBtn.getAttribute('data-link') || '';
                    const match = shareUrl.match(/(?=BV).*?(?=\?|\/|$)/);
                    if (match) {
                        BV1 = match;
                    }
                }
            }
        }
      }
      
      // 如果仍然找不到BV号，显示错误
      if (BV1 == null) {
        console.error('无法获取视频BV号');
        showNotification('解析失败', '无法获取当前视频的BV号，请刷新页面后重试', true);
        return;
      }
      
      // 确保BV1是字符串而不是数组
      if (Array.isArray(BV1)) {
        BV1 = BV1[0];
      }
      
      console.log('获取到BV号:', BV1);
  
      if (P1 == null) {
        P1 = 1;
      } else {
        P1 = parseInt(P1[0], 10); // 确保P1是数字
      }
      
      console.log('获取到P号:', P1);
    
      // 调用通用视频解析函数
      getVideoUrl(BV1, P1, function(videoUrl) {
          showNotification('视频解析成功', '链接已复制到剪贴板', false, TYPE_VIDEO);
      });
    }
    
    // 直播页面的解析按钮点击事件
    function clickLiveAnalysis() {
        var url = window.location.href;
        const roomIdMatch = url.match(/live\.bilibili\.com\/(\d+)/);
        if (roomIdMatch && roomIdMatch[1]) {
            analysisLive(roomIdMatch[1]);
        } else {
            // 如果在直播主页，尝试获取当前页面的第一个直播间
            const liveLinks = document.querySelectorAll('a[href*="live.bilibili.com/"]');
            let foundRoomId = null;
            
            // 遍历所有直播链接，寻找房间号
            for (let i = 0; i < liveLinks.length; i++) {
                const link = liveLinks[i].href;
                const match = link.match(/live\.bilibili\.com\/(\d+)/);
                if (match && match[1]) {
                    foundRoomId = match[1];
                    break;
                }
            }
            
            if (foundRoomId) {
                analysisLive(foundRoomId);
            } else {
                showNotification('解析失败', '无法获取直播间ID，请进入具体直播间再试', true);
            }
        }
    }
    
    // 直播解析函数 - 使用新的API
    function analysisLive(roomId) {
        if (!roomId) return;
        
        // 使用更现代的API获取直播流
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', 'https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=' + roomId + '&protocol=0,1&format=0,1,2&codec=0,1&qn=10000&platform=web&ptype=8&dolby=5&panorama=1', true);
        httpRequest.withCredentials = true;
        httpRequest.setRequestHeader('Referer', 'https://live.bilibili.com');
        httpRequest.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        httpRequest.send();
        
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                try {
                    var json = JSON.parse(httpRequest.responseText);
                    
                    if (json.code !== 0) {
                        showNotification('直播解析失败', json.message || '获取直播流失败', true);
                        fallbackToOldAPI(roomId);
                        return;
                    }
                    
                    // 获取直播流地址
                    const streamUrl = getLiveStreamUrl(json);
                    
                    if (streamUrl) {
                        // 确定流类型
                        let format = 'FLV';
                        if (streamUrl.includes('.m3u8')) {
                            format = 'M3U8';
                        } else if (streamUrl.includes('.flv')) {
                            format = 'FLV';
                        }
                        
                        navigator.clipboard.writeText(streamUrl).catch(e => console.error(e));
                        console.log('直播流地址 (' + format + '):', streamUrl);
                        
                        // 显示成功提示
                        showNotification('直播解析成功 (' + format + ')', '链接已复制到剪贴板', false, TYPE_LIVE);
                    } else {
                        console.error('未找到直播流地址');
                        fallbackToOldAPI(roomId);
                    }
                } catch (error) {
                    console.error('解析直播流失败:', error);
                    fallbackToOldAPI(roomId);
                }
            } else if (httpRequest.readyState == 4) {
                console.error('请求直播流失败');
                fallbackToOldAPI(roomId);
            }
        };
    }
    
    // 从响应中提取直播流地址
    function getLiveStreamUrl(response) {
        if (!response || !response.data || !response.data.playurl_info || !response.data.playurl_info.playurl || !response.data.playurl_info.playurl.stream) {
            return null;
        }
        
        const streams = response.data.playurl_info.playurl.stream;
        
        // 优先尝试获取HLS格式 (m3u8)
        // Stream[1]通常是http-hls或http-fmp4
        if (streams.length > 1) {
            const formats = streams[1].format;
            if (formats && formats.length > 0) {
                // 优先尝试hls格式 (format_name通常为"fmp4"或"ts")
                let hlsFormat = formats.find(f => f.format_name === 'ts' || f.format_name === 'fmp4');
                if (hlsFormat && hlsFormat.codec && hlsFormat.codec.length > 0) {
                    // 获取最高质量的编码
                    const codec = hlsFormat.codec[0];
                    if (codec.url_info && codec.url_info.length > 0 && codec.base_url) {
                        return codec.url_info[0].host + codec.base_url + codec.url_info[0].extra;
                    }
                }
            }
        }
        
        // 如果没有HLS，尝试FLV格式
        // 通常在Stream[0]中
        if (streams.length > 0) {
            const formats = streams[0].format;
            if (formats && formats.length > 0) {
                // 通常flv格式的format_name为"flv"
                let flvFormat = formats.find(f => f.format_name === 'flv');
                if (flvFormat && flvFormat.codec && flvFormat.codec.length > 0) {
                    // 获取最高质量的编码
                    const codec = flvFormat.codec[0];
                    if (codec.url_info && codec.url_info.length > 0 && codec.base_url) {
                        return codec.url_info[0].host + codec.base_url + codec.url_info[0].extra;
                    }
                }
            }
        }
        
        // 如果以上都失败，尝试任何可用的流
        for (const stream of streams) {
            if (stream.format && stream.format.length > 0) {
                for (const format of stream.format) {
                    if (format.codec && format.codec.length > 0) {
                        const codec = format.codec[0];
                        if (codec.url_info && codec.url_info.length > 0 && codec.base_url) {
                            return codec.url_info[0].host + codec.base_url + codec.url_info[0].extra;
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    // 如果新API失败，回退到旧API
    function fallbackToOldAPI(roomId) {
        console.log('尝试使用旧API获取直播流');
        
        // 尝试获取m3u8格式
      var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', 'https://api.live.bilibili.com/room/v1/Room/playUrl?cid=' + roomId + '&qn=10000&platform=h5', true);
        httpRequest.withCredentials = true;
      httpRequest.send();
      httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
          var json = JSON.parse(httpRequest.responseText);
                if (json.data && json.data.durl && json.data.durl.length > 0) {
                    // 获取最高质量的直播流
                    const liveUrl = json.data.durl[0].url;
                    navigator.clipboard.writeText(liveUrl).catch(e => console.error(e));
                    console.log('直播流地址(m3u8):', liveUrl);
                    
                    // 显示成功提示
                    let format = liveUrl.toLowerCase().includes('.m3u8') ? 'M3U8' : 'FLV';
                    showNotification('直播解析成功 ('+format+')', '链接已复制到剪贴板', false, TYPE_LIVE);
                } else {
                    // 如果m3u8格式获取失败，尝试获取flv格式
                    fallbackToFlvFormat(roomId);
                }
            } else if (httpRequest.readyState == 4) {
                // 如果m3u8格式请求失败，尝试获取flv格式
                fallbackToFlvFormat(roomId);
            }
        };
    }
    
    // 备用方案：获取flv格式直播流
    function fallbackToFlvFormat(roomId) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', 'https://api.live.bilibili.com/room/v1/Room/playUrl?cid=' + roomId + '&qn=10000&platform=web', true);
        httpRequest.withCredentials = true;
        httpRequest.send();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                var json = JSON.parse(httpRequest.responseText);
                if (json.data && json.data.durl && json.data.durl.length > 0) {
                    // 获取最高质量的直播流
                    const liveUrl = json.data.durl[0].url;
                    navigator.clipboard.writeText(liveUrl).catch(e => console.error(e));
                    console.log('直播流地址(flv):', liveUrl);
                    
                    // 显示成功提示
                    showNotification('直播解析成功 (FLV)', '链接已复制到剪贴板', false, TYPE_LIVE);
                } else {
                    console.error('获取直播流失败:', json);
                    showNotification('直播解析失败', '无法获取直播流地址', true);
                }
            } else if (httpRequest.readyState == 4) {
                console.error('获取直播流请求失败');
                showNotification('直播解析失败', '请求直播流地址失败', true);
            }
        };
    }
    
    // 初始执行一次
    addCoverAnalysisButtons();
    
    // 创建设置面板
    createSettingsPanel();
    
    // 使用MutationObserver监听DOM变化，为新加载的封面添加按钮
    const observer = new MutationObserver(debounce(function(mutations) {
        // 移除可能重新出现的旧按钮
        removeOldButtons();
        // 添加封面解析按钮
        addCoverAnalysisButtons();
    }, DEBOUNCE_DELAY));
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 在页面滚动时也检查新加载的视频
    window.addEventListener('scroll', debounce(function() {
        // 移除可能重新出现的旧按钮
        removeOldButtons();
        // 添加封面解析按钮
        addCoverAnalysisButtons();
    }, DEBOUNCE_DELAY));

    // 启动URL变化监听
    setupUrlChangeListener();
  })();
  