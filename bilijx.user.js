// ==UserScript==
// @name         BiliBili 视频解析脚本(增强型)
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      2.5.3
// @description  只因你实在是太美 Baby!
// @author       laomo
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://t.bilibili.com/*
// @match        https://live.bilibili.com/*
// @downloadURL  https://raw.githubusercontent.com/gujimy/BiliBili-JX/main/bilijx.user.js
// @updateURL    https://raw.githubusercontent.com/gujimy/BiliBili-JX/main/bilijx.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      api.bilibili.com
// @connect      live.bilibili.com
// @connect      kanda-akihito-kun.github.io
// ==/UserScript==

(function () {
    'use strict';

    // ============================== 常量定义 ==============================

    const DEBOUNCE_DELAY = 300;

    // CDN相关常量
    const CDN_STORAGE_KEY = 'bilijx_cdn_node';
    const REGION_STORAGE_KEY = 'bilijx_region';
    const CDN_LOCK_ENABLED_KEY = 'bilijx_cdn_lock_enabled';
    const CUSTOM_CDN_STORAGE_KEY = 'bilijx_custom_cdn_list';
    const CDN_API_URL = 'https://kanda-akihito-kun.github.io/ccb/api';

    // URL清理相关常量
    const TRACKING_PARAMS = new Set([
        'spm_id_from', 'from_source', 'msource', 'bsource', 'seid', 'source',
        'session_id', 'visit_id', 'sourceFrom', 'from_spmid', 'share_source',
        'share_medium', 'share_plat', 'share_session_id', 'share_tag', 'unique_k',
        'csource', 'vd_source', 'tab', 'is_story_h5', 'share_from', 'plat_id',
        '-Arouter', 'spmid',
    ]);

    // CDN域名常量池
    const CDNS = {
        ALI: 'upos-sz-mirrorali.bilivideo.com',
        ALIOV: 'upos-sz-mirroraliov.bilivideo.com',
        ALIB: 'upos-sz-mirroralib.bilivideo.com',
        ALIO1: 'upos-sz-mirroralio1.bilivideo.com',
        ALI02: 'upos-sz-mirrorali02.bilivideo.com',
        COS: 'upos-sz-mirrorcos.bilivideo.com',
        COSB: 'upos-sz-mirrorcosb.bilivideo.com',
        COSO1: 'upos-sz-mirrorcoso1.bilivideo.com',
        COSDISP: 'upos-sz-mirrorcosdisp.bilivideo.com',
        HW: 'upos-sz-mirrorhw.bilivideo.com',
        HWB: 'upos-sz-mirrorhwb.bilivideo.com',
        HWO1: 'upos-sz-mirrorhwo1.bilivideo.com',
        HWDISP: 'upos-sz-mirrorhwdisp.bilivideo.com',
        BD: 'upos-sz-mirrorbd.bilivideo.com',
        M08C: 'upos-sz-mirror08c.bilivideo.com',
        M08H: 'upos-sz-mirror08h.bilivideo.com',
        M08CT: 'upos-sz-mirror08ct.bilivideo.com',
        ESTGCOS: 'upos-sz-estgcos.bilivideo.com',
        ESTGOSS: 'upos-sz-estgoss.bilivideo.com',
        ESTGHW: 'upos-sz-estghw.bilivideo.com',
        UPCDNBDA2: 'upos-sz-upcdnbda2.bilivideo.com',
        RALI: 'upos-sz-mirrorrali.bilivideo.com',
    };

    // 初始CDN列表
    const INIT_CDN_LIST = [CDNS.ALI, CDNS.ALIOV, CDNS.ALIB, CDNS.ESTGCOS];

    // VRChat世界CDN白名单
    const VRCHAT_CDN_MAP = {
        '🌍 VRC-中文新手教程': [CDNS.ALI, CDNS.ALIB, CDNS.ALIO1, CDNS.ALI02, CDNS.ESTGOSS, CDNS.COS, CDNS.COSB, CDNS.COSO1, CDNS.COSDISP, CDNS.HW, CDNS.HWB, CDNS.M08CT, CDNS.HWO1, CDNS.M08C, CDNS.M08H, CDNS.BD, CDNS.UPCDNBDA2, CDNS.HWDISP],
        '🌍 VRC-中文吧': [CDNS.ALI, CDNS.ESTGHW, CDNS.BD, CDNS.COS, CDNS.M08C],
        '🌍 VRC-台北纯K': [CDNS.BD, CDNS.COS, CDNS.M08C, CDNS.ALI],
        '🌍 栖隙居所': [CDNS.ALIO1, CDNS.ALIB, CDNS.COS, CDNS.M08C, CDNS.RALI],
    };

    // ============================== 工具函数 ==============================

    // 防抖函数
    function debounce(func, delay) {
        let timer = null;
        return function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
                timer = null;
            }, delay);
        };
    }

    // ============================== URL清理模块 ==============================

    const URLCleaner = {
        // 验证并解析URL
        parseURL(url, base) {
            try {
                if (typeof url === "string" && /^[\W\w]+\.[\W\w]+/.test(url) && !/^[a-z]+:/.test(url)) {
                    const prefix = url.startsWith("//") ? "" : "//";
                    url = location.protocol + prefix + url;
                }
                return new URL(url, base);
            } catch (e) {
                return null;
            }
        },

        // 清理URL中的跟踪参数
        cleanURL(urlString) {
            if (!/.*:\/\/.*.bilibili.com\/.*/.test(urlString) || urlString.includes('passport.bilibili.com')) {
                return urlString;
            }

            const url = this.parseURL(urlString);
            if (!url) return urlString;

            TRACKING_PARAMS.forEach(param => url.searchParams.delete(param));
            return url.toString();
        },

        // 清理链接元素
        cleanLinks(links) {
            links.forEach(link => {
                if (!link.href) return;

                // 修复失效的tv域名
                if (link.href.includes("bilibili.tv")) {
                    link.href = link.href.replace("bilibili.tv", "bilibili.com");
                }

                link.href = this.cleanURL(link.href);
            });
        },

        // 查找并清理点击的链接
        handleClick(event) {
            let element = event.target;
            while (element && element.tagName !== "A") {
                element = element.parentNode;
            }
            if (element && element.tagName === "A") {
                this.cleanLinks([element]);
            }
        },

        // 初始化URL清理功能
        init() {
            let locationBackup;

            // 清理地址栏
            const cleanLocation = () => {
                const { href } = location;
                if (href === locationBackup) return;
                locationBackup = this.cleanURL(href);
                window.history.replaceState(window.history.state, "", locationBackup);
            };

            cleanLocation();

            // 监听点击和右键事件
            const clickHandler = (e) => this.handleClick(e);
            window.addEventListener("click", clickHandler, true);
            window.addEventListener("contextmenu", clickHandler, true);

            // 重写window.open
            const originalOpen = window.open;
            window.open = (url, name, params) => {
                return originalOpen(this.cleanURL(url), name, params);
            };
        }
    };

    // 初始化URL清理
    URLCleaner.init();

    // ============================== CDN管理模块 ==============================

    const CDNManager = {
        cdnList: [...INIT_CDN_LIST],
        regionList: ['默认', '📝 自定义CDN', '🌍 VRC-中文新手教程', '🌍 VRC-中文吧', '🌍 VRC-台北纯K', '🌍 栖隙居所'],

        // 获取自定义CDN列表
        getCustomList() {
            try {
                return JSON.parse(GM_getValue(CUSTOM_CDN_STORAGE_KEY, '[]'));
            } catch (e) {
                return [];
            }
        },

        // 保存自定义CDN列表
        saveCustomList(list) {
            GM_setValue(CUSTOM_CDN_STORAGE_KEY, JSON.stringify(list));
        },

        // 添加自定义CDN
        addCustom(name, url) {
            const list = this.getCustomList();
            if (list.some(item => item.url === url)) {
                return { success: false, message: '该CDN地址已存在' };
            }
            list.push({ name, url, id: Date.now() });
            this.saveCustomList(list);
            return { success: true, message: '添加成功' };
        },

        // 删除自定义CDN
        removeCustom(id) {
            const list = this.getCustomList();
            const newList = list.filter(item => item.id !== id);
            this.saveCustomList(newList);
            return newList;
        },

        // 获取自定义CDN的URL列表
        getCustomUrls() {
            return this.getCustomList().map(item => item.url);
        },

        // 获取当前选择的CDN节点
        getCurrentCdn() {
            return GM_getValue(CDN_STORAGE_KEY, this.cdnList[0] || '');
        },

        // 获取当前选择的地区
        getCurrentRegion() {
            return GM_getValue(REGION_STORAGE_KEY, this.regionList[0]);
        },

        // 判断是否启用了CDN锁定
        isLockEnabled() {
            return GM_getValue(CDN_LOCK_ENABLED_KEY, false);
        },

        // 替换视频URL中的CDN域名
        replaceCdnInUrl(url) {
            if (!this.isLockEnabled()) return url;
            const currentCdn = this.getCurrentCdn();
            return url.replace(/https:\/\/[^\/]+\//, `https://${currentCdn}/`);
        },

        // 获取地区列表
        async fetchRegionList() {
            const specialOptions = ['📝 自定义CDN', '🌍 VRC-中文新手教程', '🌍 VRC-中文吧', '🌍 VRC-台北纯K', '🌍 栖隙居所'];

            try {
                const response = await fetch(`${CDN_API_URL}/region.json`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                this.regionList = ['默认', ...specialOptions, ...data];
                console.log('已更新地区列表:', this.regionList);
            } catch (error) {
                console.error('获取地区列表失败:', error);
                this.regionList = ['默认', ...specialOptions];
            }
        },

        // 根据地区获取CDN列表
        async fetchCdnListByRegion(region) {
            try {
                // 处理"默认"选项
                if (region === '默认' || region === '-') {
                    this.cdnList = [...INIT_CDN_LIST];
                    updateCdnSelector();
                    updateCustomCdnVisibility(false);
                    return;
                }

                // 处理"📝 自定义CDN"选项
                if (region === '📝 自定义CDN') {
                    const customUrls = this.getCustomUrls();
                    this.cdnList = customUrls.length > 0 ? customUrls : ['暂无自定义CDN，请先添加'];
                    updateCdnSelector();
                    updateCustomCdnVisibility(true);
                    console.log('已切换到自定义CDN列表:', this.cdnList);
                    return;
                }

                // 处理VRChat世界选项
                if (VRCHAT_CDN_MAP[region]) {
                    this.cdnList = [...VRCHAT_CDN_MAP[region]];
                    updateCdnSelector();
                    updateCustomCdnVisibility(false);
                    console.log(`已切换到 ${region} CDN列表:`, this.cdnList);
                    return;
                }

                // 从API获取CDN列表
                const response = await fetch(`${CDN_API_URL}/cdn.json`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();

                this.cdnList = [...(data[region] || [])];
                updateCdnSelector();
                updateCustomCdnVisibility(false);
                console.log(`已更新 ${region} 地区的CDN列表:`, this.cdnList);
            } catch (error) {
                console.error(`获取 ${region} 地区CDN列表失败:`, error);
                this.cdnList = [...INIT_CDN_LIST];
                updateCdnSelector();
                updateCustomCdnVisibility(false);
            }
        }
    };

    // 更新自定义CDN区域的显示/隐藏
    function updateCustomCdnVisibility(show) {
        const customCdnSection = document.getElementById('bilijx-custom-cdn-section');
        if (customCdnSection) {
            customCdnSection.style.display = show ? 'block' : 'none';
        }
    }

    // 安全渲染下拉选项
    function renderOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;

        selectElement.replaceChildren();
        options.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = value === selectedValue;
            selectElement.appendChild(option);
        });
    }

    // 刷新自定义CDN列表显示
    function refreshCustomCdnList() {
        const listContainer = document.getElementById('bilijx-custom-cdn-list');
        if (!listContainer) return;

        const customList = CDNManager.getCustomList();
        listContainer.replaceChildren();

        if (customList.length === 0) {
            const emptyText = document.createElement('p');
            emptyText.style.color = '#999';
            emptyText.style.fontSize = '12px';
            emptyText.style.margin = '0';
            emptyText.textContent = '暂无自定义CDN';
            listContainer.appendChild(emptyText);
        } else {
            customList.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'bilijx-custom-cdn-item';
                itemElement.dataset.id = String(item.id);

                const infoElement = document.createElement('div');
                infoElement.className = 'bilijx-custom-cdn-info';

                const nameElement = document.createElement('span');
                nameElement.className = 'bilijx-custom-cdn-name';
                nameElement.textContent = item.name;

                const urlElement = document.createElement('span');
                urlElement.className = 'bilijx-custom-cdn-url';
                urlElement.textContent = item.url;

                const deleteButton = document.createElement('button');
                deleteButton.className = 'bilijx-custom-cdn-delete';
                deleteButton.dataset.id = String(item.id);
                deleteButton.textContent = '×';
                deleteButton.addEventListener('click', function () {
                    const id = parseInt(this.dataset.id, 10);
                    CDNManager.removeCustom(id);
                    refreshCustomCdnList();
                    // 更新CDN选择器
                    const customUrls = CDNManager.getCustomUrls();
                    CDNManager.cdnList = customUrls.length > 0 ? customUrls : ['暂无自定义CDN，请先添加'];
                    updateCdnSelector();
                    showNotification('删除成功', '自定义CDN已删除', false);
                });

                infoElement.append(nameElement, urlElement);
                itemElement.append(infoElement, deleteButton);
                listContainer.appendChild(itemElement);
            });
        }
    }

    // 更新设置面板中的CDN选择器
    function updateCdnSelector() {
        const cdnSelect = document.getElementById('bilijx-cdn-select');
        renderOptions(cdnSelect, CDNManager.cdnList, CDNManager.getCurrentCdn());
    }

    // 创建设置面板
    function createSettingsPanel() {
        // 如果已经存在设置面板，则返回
        if (document.getElementById('bilijx-settings-panel')) return;

        // 创建设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'bilijx-settings-panel';
        settingsPanel.style.display = 'none';

        // 设置面板样式
        GM_addStyle(`#bilijx-settings-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;background-color:#fff;border:1px solid #ddd;border-radius:8px;z-index:10000;padding:20px}#bilijx-settings-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #eee}#bilijx-settings-header h2{margin:0;color:#FB7299;font-size:18px}#bilijx-settings-close{cursor:pointer;font-size:20px;color:#999}#bilijx-settings-close:hover{color:#FB7299}.bilijx-settings-group{margin-bottom:15px}.bilijx-settings-group h3{margin:0 0 10px;font-size:16px;color:#333}.bilijx-settings-group select{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f9f9f9;font-size:14px}.bilijx-settings-footer{display:flex;justify-content:flex-end;margin-top:20px}.bilijx-settings-footer button{padding:8px 15px;border:none;border-radius:4px;cursor:pointer;font-size:14px;margin-left:10px}#bilijx-settings-save{background-color:#FB7299;color:#fff}#bilijx-settings-save:hover{opacity:.8}#bilijx-settings-cancel{background-color:#f0f0f0;color:#666}#bilijx-settings-cancel:hover{background-color:#e0e0e0}#bilijx-main-button{position:fixed;bottom:20px;left:20px;min-width:60px;height:36px;background-color:#FB7299;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;padding:0 12px}#bilijx-main-button:hover{opacity:.8}#bilijx-main-button:active{opacity:1}#bilijx-main-button.loading{background-color:#faa2c1}#bilijx-main-button.success{background-color:#52c41a}#bilijx-main-button.error{background-color:#ff4d4f}#bilijx-custom-cdn-section{display:none;margin-top:15px;padding:15px;background-color:#f5f5f5;border-radius:6px;border:1px dashed #ddd}#bilijx-custom-cdn-section h4{margin:0 0 12px;font-size:14px;color:#666}.bilijx-custom-cdn-inputs{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.bilijx-custom-cdn-inputs input{flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px}#bilijx-add-custom-cdn{padding:8px 16px;background-color:#FB7299;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px}#bilijx-add-custom-cdn:hover{opacity:.8}#bilijx-custom-cdn-list{max-height:150px;overflow-y:auto}.bilijx-custom-cdn-item{display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:6px;background-color:#fff;border-radius:4px;border:1px solid #eee}.bilijx-custom-cdn-info{display:flex;flex-direction:column;flex:1;min-width:0}.bilijx-custom-cdn-name{font-weight:700;font-size:13px;color:#333}.bilijx-custom-cdn-url{font-size:11px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bilijx-custom-cdn-delete{width:24px;height:24px;border:none;background-color:#ff5252;color:#fff;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;margin-left:8px;flex-shrink:0}.bilijx-custom-cdn-delete:hover{opacity:.8}`);

        // 设置面板内容
        settingsPanel.innerHTML = `
            <div id="bilijx-settings-header">
                <h2>B站解析脚本设置</h2>
                <span id="bilijx-settings-close">×</span>
            </div>

            <div class="bilijx-settings-group">
                <h3>CDN 锁定</h3>
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="bilijx-cdn-lock-enabled" style="margin-right: 8px;">
                    <span>启用CDN锁定</span>
                </label>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    勾选后，视频解析将强制使用下方选择的CDN节点。
                </p>
            </div>
            
            <div class="bilijx-settings-group">
                <h3>地区选择</h3>
                <select id="bilijx-region-select">
                    <option>加载中...</option>
                </select>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    选择您所在的地区，以获取该地区最优的CDN节点列表<br>
                    <strong style="color: #FB7299;">💡 VRChat用户请选择对应世界的CDN白名单</strong>
                </p>
            </div>
            
            <div class="bilijx-settings-group">
                <h3>CDN节点选择</h3>
                <select id="bilijx-cdn-select">
                    <option>请先选择地区</option>
                </select>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    选择特定CDN节点可以提高视频加载速度，如遇视频加载慢可尝试切换。
                </p>
            </div>
            
            <div id="bilijx-custom-cdn-section">
                <h4>添加自定义CDN:</h4>
                <div class="bilijx-custom-cdn-inputs">
                    <input type="text" id="bilijx-custom-cdn-name" placeholder="名称 (如: 我的CDN)">
                    <input type="text" id="bilijx-custom-cdn-url" placeholder="CDN地址 (如: upos-xxx.bilivideo.com)">
                    <button id="bilijx-add-custom-cdn">添加</button>
                </div>
                <div id="bilijx-custom-cdn-list">
                    <p style="color: #999; font-size: 12px; margin: 0;">暂无自定义CDN</p>
                </div>
            </div>
            
            <div class="bilijx-settings-footer">
                <button id="bilijx-settings-cancel">取消</button>
                <button id="bilijx-settings-save">保存设置</button>
            </div>
        `;

        // 添加设置面板到页面
        document.body.appendChild(settingsPanel);

        // 设置CDN锁定复选框的初始状态
        document.getElementById('bilijx-cdn-lock-enabled').checked = GM_getValue(CDN_LOCK_ENABLED_KEY, false);

        // 添加设置/解析按钮
        const mainButton = document.createElement('button');
        mainButton.id = 'bilijx-main-button';
        mainButton.innerHTML = '解析';
        mainButton.title = 'B站解析脚本';
        document.body.appendChild(mainButton);

        // 主按钮点击事件 - 根据页面类型决定行为
        mainButton.addEventListener('click', async function () {
            // 在视频或直播页面时执行解析
            if (window.isVideoPage) {
                ButtonFeedback.setLoading(this);
                clickVideoAnalysis({ currentTarget: this });
            } else if (window.isLivePage) {
                ButtonFeedback.setLoading(this);
                clickLiveAnalysis({ currentTarget: this });
            } else {
                // 其他页面打开设置面板
                document.getElementById('bilijx-settings-panel').style.display = 'block';

                // 每次打开时，都重新设置一下勾选状态
                document.getElementById('bilijx-cdn-lock-enabled').checked = GM_getValue(CDN_LOCK_ENABLED_KEY, false);

                // 首次打开时加载数据
                if (!this.dataset.loaded) {
                    this.dataset.loaded = true; // 标记为已加载，避免重复加载

                    await CDNManager.fetchRegionList();
                    const regionSelect = document.getElementById('bilijx-region-select');
                    renderOptions(regionSelect, CDNManager.regionList, CDNManager.getCurrentRegion());
                    await CDNManager.fetchCdnListByRegion(CDNManager.getCurrentRegion());
                }
            }
        });

        // 更新按钮状态的函数
        function updateMainButtonState() {
            if (window.isVideoPage || window.isLivePage) {
                mainButton.innerHTML = '解析';
                mainButton.title = window.isLivePage ? '点击解析当前直播间' : '点击解析当前视频';
            } else {
                mainButton.innerHTML = '⚙️';
                mainButton.title = 'B站解析脚本设置';
            }
        }

        // 首次更新按钮状态
        updateMainButtonState();

        // 关闭按钮点击事件
        document.getElementById('bilijx-settings-close').addEventListener('click', function () {
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });

        // 取消按钮点击事件
        document.getElementById('bilijx-settings-cancel').addEventListener('click', function () {
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });

        // 地区选择变化事件
        document.getElementById('bilijx-region-select').addEventListener('change', async function (e) {
            const selectedRegion = e.target.value;
            // 根据选择的地区更新CDN列表
            await CDNManager.fetchCdnListByRegion(selectedRegion);
        });

        // 添加自定义CDN按钮点击事件
        document.getElementById('bilijx-add-custom-cdn').addEventListener('click', function () {
            const nameInput = document.getElementById('bilijx-custom-cdn-name');
            const urlInput = document.getElementById('bilijx-custom-cdn-url');

            const name = nameInput.value.trim();
            let url = urlInput.value.trim();

            // 验证输入
            if (!name) {
                showNotification('添加失败', '请输入CDN名称', true);
                return;
            }
            if (!url) {
                showNotification('添加失败', '请输入CDN地址', true);
                return;
            }

            // 处理URL格式 - 移除协议头和尾部斜杠
            url = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');

            // 验证URL格式
            if (!url.includes('.')) {
                showNotification('添加失败', '请输入有效的CDN地址', true);
                return;
            }

            // 添加CDN
            const result = CDNManager.addCustom(name, url);
            if (result.success) {
                // 清空输入框
                nameInput.value = '';
                urlInput.value = '';
                // 刷新列表
                refreshCustomCdnList();
                // 更新CDN选择器
                const customUrls = CDNManager.getCustomUrls();
                CDNManager.cdnList = customUrls.length > 0 ? customUrls : ['暂无自定义CDN，请先添加'];
                updateCdnSelector();
                showNotification('添加成功', `已添加CDN: ${name}`, false);
            } else {
                showNotification('添加失败', result.message, true);
            }
        });

        // 初始化自定义CDN列表显示
        refreshCustomCdnList();

        // 保存按钮点击事件
        document.getElementById('bilijx-settings-save').addEventListener('click', function () {
            // 获取选择的值
            const cdnLockEnabled = document.getElementById('bilijx-cdn-lock-enabled').checked;
            const selectedRegion = document.getElementById('bilijx-region-select').value;
            const selectedCdn = document.getElementById('bilijx-cdn-select').value;

            // 保存设置
            GM_setValue(CDN_LOCK_ENABLED_KEY, cdnLockEnabled);
            GM_setValue(REGION_STORAGE_KEY, selectedRegion);
            GM_setValue(CDN_STORAGE_KEY, selectedCdn);

            // 显示保存成功提示
            showNotification('设置已保存', '新的CDN设置将在下次解析时生效', false);

            // 关闭设置面板
            document.getElementById('bilijx-settings-panel').style.display = 'none';
        });
    }

    // 添加按钮样式
    GM_addStyle(`:root{--video-color:rgb(0,174,236);--video-color-transparent:rgba(0,174,236,0.8);--live-color:#FB7299;--live-color-transparent:rgba(251,114,153,0.8);--success-color:#52c41a;--error-color:#ff4d4f}@keyframes bilijx-spin{to{transform:rotate(360deg)}}.cover-analysis-btn{position:absolute;bottom:10px;right:10px;color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:16px;font-weight:700;cursor:pointer;z-index:100;opacity:0;transition:opacity .2s ease}*:hover>.cover-analysis-btn{opacity:1}.cover-analysis-btn.loading{pointer-events:none;opacity:.7}.cover-analysis-btn.success{background:var(--success-color)!important}.cover-analysis-btn.error{background:var(--error-color)!important}.video-cover-analysis-btn{background:var(--video-color-transparent)}.video-cover-analysis-btn:hover{background:var(--video-color)}.live-cover-analysis-btn{background:var(--live-color-transparent)}.live-cover-analysis-btn:hover{background:var(--live-color)}`);

    // ============================== 按钮反馈管理器 ==============================

    const ButtonFeedback = {
        states: new WeakMap(),
        currentButton: null,

        // 设置加载状态
        setLoading(button) {
            this.reset(button);
            this.states.set(button, {
                originalText: button.innerText.trim(),
                timer: null
            });
            this.currentButton = button;
            button.classList.remove('success', 'error');
            button.classList.add('loading');
            button.innerText = '解析中';
        },

        // 设置成功状态
        setSuccess(button, message = '✓') {
            const state = this.getState(button);
            if (state.timer) clearTimeout(state.timer);
            button.classList.remove('loading', 'error');
            button.classList.add('success');
            button.innerText = message;

            // 3秒后恢复
            state.timer = setTimeout(() => this.reset(button), 3000);
            this.states.set(button, state);
        },

        // 设置错误状态
        setError(button, message = '✕') {
            const state = this.getState(button);
            if (state.timer) clearTimeout(state.timer);
            button.classList.remove('loading', 'success');
            button.classList.add('error');
            button.innerText = message;

            // 3秒后恢复
            state.timer = setTimeout(() => this.reset(button), 3000);
            this.states.set(button, state);
        },

        // 获取按钮状态
        getState(button) {
            return this.states.get(button) || {
                originalText: button.innerText.trim(),
                timer: null
            };
        },

        // 恢复按钮原始状态
        reset(button) {
            const state = this.states.get(button);
            if (state && state.timer) clearTimeout(state.timer);
            button.classList.remove('loading', 'success', 'error');
            if (state) {
                button.innerText = state.originalText;
                this.states.delete(button);
            }
            if (this.currentButton === button) {
                this.currentButton = null;
            }
        }
    };

    // 向后兼容的函数别名 - 但现在作用于按钮
    const showNotification = (title, message, isError, type) => {
        // 如果有当前活动的按钮，在按钮上显示反馈
        const activeButton = ButtonFeedback.currentButton;
        if (activeButton) {
            if (isError) {
                ButtonFeedback.setError(activeButton, '失败');
            } else {
                ButtonFeedback.setSuccess(activeButton, '✓');
            }
        }
        // 同时也输出到控制台作为备用
        console.log(isError ? `❌ ${title}: ${message}` : `✅ ${title}: ${message}`);
    };

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
    window.isLivePage = window.location.hostname === 'live.bilibili.com' ||
        window.location.href.includes('live.bilibili.com');
    window.isVideoPage = !window.isLivePage &&
        (window.location.href.includes('/video/') ||
            window.location.href.includes('bvid='));

    // 移除旧按钮
    removeOldButtons();

    // 添加视频封面解析按钮的函数
    function addCoverAnalysisButtons(root = document) {
        // 视频封面
        addVideoCoverButtons(root);
        // 直播封面
        addLiveCoverButtons(root);
    }

    // 视频封面选择器缓存 (已合并为单一字符串以提高性能)
    const videoCoverSelector = [
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
        // 首页顶部收藏弹窗
        '.favorite-panel-popover .header-fav-card',
        // 番剧、影视
        '.bangumi-card .cover-box',
        '.bangumi-card-media .media-cover',
        '.bangumi-list .cover',
        '.season-wrap .cover',
        '.media-card .cover-container'
    ].join(',');

    // 直播封面选择器缓存 (已合并为单一字符串以提高性能)
    const liveCoverSelector = [
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
    ].join(',');

    // 添加视频封面按钮
    function addVideoCoverButtons(root = document) {
        // 使用合并后的选择器查找所有可能的视频封面
        processElementsBySelector(videoCoverSelector, processVideoElement, root);

        // 尝试查找所有a标签，但必须包含图片元素才添加按钮
        try {
            getElementsBySelector('a', root).forEach(linkElement => {
                const href = linkElement.href || '';
                // 确保链接包含视频ID、包含图片元素、没有已经添加的按钮、不是标题元素
                if ((href.includes('/video/BV') || href.includes('bvid=')) &&
                    linkElement.querySelector('img') && // 必须有图片才算封面
                    !isLikelyTitleElement(linkElement)) {
                    processVideoElement(linkElement);
                }
            });
        } catch (e) {
            console.error('Error processing link elements:', e);
        }

        // 专门处理历史记录页面
        if (root === document && window.location.href.includes('/history')) {
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
    function addLiveCoverButtons(root = document) {
        // 使用合并后的选择器查找所有可能的直播封面
        processElementsBySelector(liveCoverSelector, processLiveElement, root);

        // 尝试查找所有包含直播链接的a标签
        try {
            getElementsBySelector('a', root).forEach(linkElement => {
                const href = linkElement.href || '';
                if (href.includes('live.bilibili.com') &&
                    linkElement.querySelector('img')) {
                    processLiveElement(linkElement);
                }
            });
        } catch (e) {
            console.error('Error processing live link elements:', e);
        }
    }

    // 获取根节点自身和子节点中匹配选择器的元素
    function getElementsBySelector(selector, root = document) {
        const elements = [];
        if (root.nodeType === 1 && root.matches(selector)) {
            elements.push(root);
        }
        if (root.querySelectorAll) {
            elements.push(...root.querySelectorAll(selector));
        }
        return elements;
    }

    // 使用单一选择器字符串处理元素 (性能优化)
    function processElementsBySelector(selector, processor, root = document) {
        try {
            getElementsBySelector(selector, root).forEach(processor);
        } catch (e) {
            console.error('Error processing selector:', selector, e);
        }
    }

    // 从元素自身、祖先或子元素中获取目标链接
    function getElementLink(element, isLive) {
        if (!element) return '';

        const directLink = element.href || element.getAttribute('href');
        if (directLink) return directLink;

        const selector = isLive
            ? 'a[href*="live.bilibili.com"]'
            : 'a[href*="/video/"], a[href*="bvid="]';

        const closestLink = element.closest ? element.closest(selector) : null;
        if (closestLink) {
            return closestLink.href || closestLink.getAttribute('href') || '';
        }

        const childLink = element.querySelector ? element.querySelector(selector) : null;
        return childLink ? (childLink.href || childLink.getAttribute('href') || '') : '';
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
        analysisBtn.dataset.isLive = isLive ? '1' : '0';

        // 添加点击事件
        analysisBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            // 设置加载状态
            ButtonFeedback.setLoading(this);
            const currentLink = getElementLink(this, isLive) || getElementLink(element, isLive);
            const currentId = extractIdFromLink(currentLink, isLive) || this.dataset.id;
            if (currentId) {
                this.dataset.id = currentId;
            }
            // 调用原始处理函数，传入按钮引用
            clickHandler(currentId, this);
        });

        // 添加按钮到封面
        element.appendChild(analysisBtn);

        return analysisBtn;
    }

    // 处理单个视频元素
    function processVideoElement(coverElement) {
        // 忽略明显是标题的元素
        if (isLikelyTitleElement(coverElement)) return;

        // 获取视频链接
        const videoLink = getElementLink(coverElement, false);
        if (!videoLink || (!videoLink.includes('bilibili.com/video') && !videoLink.includes('bvid='))) return;

        // 从链接中提取BV号
        const bvid = extractIdFromLink(videoLink, false);
        if (!bvid) return;

        // 确认元素包含图片才是封面
        if (!coverElement.querySelector('img')) return;

        // 收藏弹窗等动态区域会复用DOM节点，已存在的按钮也要同步最新BV号
        const existingButton = coverElement.querySelector('.video-cover-analysis-btn');
        if (existingButton) {
            existingButton.dataset.id = bvid;
            return;
        }

        // 创建解析按钮
        createCoverButton(coverElement, bvid, false, analysisVideo);
    }

    // 处理直播封面元素
    function processLiveElement(coverElement) {
        // 获取直播链接
        const liveLink = getElementLink(coverElement, true);

        if (!liveLink || !liveLink.includes('live.bilibili.com')) return;

        // 从链接中提取房间号
        const roomId = extractIdFromLink(liveLink, true);
        if (!roomId) return;

        // 动态区域复用DOM节点时，同步最新房间号
        const existingButton = coverElement.querySelector('.live-cover-analysis-btn');
        if (existingButton) {
            existingButton.dataset.id = roomId;
            return;
        }

        // 创建直播解析按钮
        createCoverButton(coverElement, roomId, true, analysisLiveCover);
    }

    // 通用视频解析函数 (已使用 async/await 重构)
    async function getVideoUrl(bvid, p = 1, customCallback = null) {
        const activeButton = ButtonFeedback.currentButton;

        if (!bvid) {
            if (activeButton) ButtonFeedback.setError(activeButton, '失败');
            return;
        }

        // 确保bvid格式正确
        if (typeof bvid === 'object' && bvid[0]) {
            bvid = bvid[0];
        }
        if (typeof bvid === 'string' && !bvid.startsWith('BV')) {
            const match = bvid.match(/BV\w+/);
            if (match) {
                bvid = match[0];
            } else {
                if (activeButton) ButtonFeedback.setError(activeButton, '失败');
                return;
            }
        }

        console.log('开始解析视频:', bvid, '第', p, '个分P');

        try {
            // 1. 获取CID
            const pageListUrl = `https://api.bilibili.com/x/player/pagelist?bvid=${bvid}`;
            const pageListResponse = await fetch(pageListUrl);
            if (!pageListResponse.ok) throw new Error('获取视频信息失败');
            const pageListData = await pageListResponse.json();

            if (!pageListData.data || pageListData.data.length === 0) {
                throw new Error('无法获取视频信息，可能是视频不存在或已被删除');
            }

            const pIndex = Math.max(0, Math.min(p - 1, pageListData.data.length - 1));
            const cid = pageListData.data[pIndex].cid;
            console.log('获取到CID:', cid);

            // 2. 获取视频链接
            const playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=116&type=&otype=json&platform=html5&high_quality=1`;
            const playUrlResponse = await fetch(playUrl, { credentials: 'include' });
            if (!playUrlResponse.ok) throw new Error('获取视频链接请求失败');
            const playUrlData = await playUrlResponse.json();

            if (!playUrlData.data || !playUrlData.data.durl || playUrlData.data.durl.length === 0) {
                throw new Error('无法获取视频链接，可能需要登录或该视频有访问限制');
            }

            let videoUrl = playUrlData.data.durl[0].url;

            // 3. 应用CDN锁定
            if (CDNManager.isLockEnabled()) {
                const originalUrl = videoUrl;
                videoUrl = CDNManager.replaceCdnInUrl(videoUrl);
                console.log('CDN已锁定，原始URL:', originalUrl);
                console.log('替换后URL:', videoUrl);
            }

            // 4. 复制到剪贴板并显示通知
            await navigator.clipboard.writeText(videoUrl);
            console.log('获取到视频链接:', videoUrl);

            if (customCallback) {
                customCallback(videoUrl);
            } else {
                if (activeButton) ButtonFeedback.setSuccess(activeButton, '✓');
            }

        } catch (error) {
            console.error('视频解析过程中发生错误:', error);
            if (activeButton) ButtonFeedback.setError(activeButton, '失败');
        }
    }

    // 封面按钮点击解析视频
    function analysisVideo(bvid, button) {
        // 调用通用视频解析函数，默认P1
        getVideoUrl(bvid, 1, function (videoUrl) {
            if (button) ButtonFeedback.setSuccess(button, '✓');
        });
    }

    // 封面按钮点击解析直播
    function analysisLiveCover(roomId, button) {
        // 调用直播解析函数
        analysisLive(roomId, button);
    }

    // 从当前页面获取视频BV号的健壮性函数
    function getCurrentBvid() {
        const url = window.location.href;
        let match;

        // 1. 从 URL 路径中提取 (e.g., /video/BV...)
        match = url.match(/(?=BV).*?(?=\?|\/)/);
        if (match) return match[0];

        // 2. 从 URL 查询参数中提取 (e.g., ?bvid=BV...)
        match = url.match(/(?<=bvid=).*?(?=&|$)/);
        if (match) return match[0];

        // 3. 从页面元数据中获取
        const metaElement = document.querySelector('meta[itemprop="url"]');
        if (metaElement) {
            const content = metaElement.getAttribute('content');
            if (content) {
                match = content.match(/(?=BV).*?(?=\?|\/|$)/);
                if (match) return match[0];
            }
        }

        // 4. 从分享按钮的数据属性中获取
        const shareBtn = document.querySelector('.share-info');
        if (shareBtn) {
            const shareUrl = shareBtn.getAttribute('data-link') || '';
            match = shareUrl.match(/(?=BV).*?(?=\?|\/|$)/);
            if (match) return match[0];
        }

        // 5. 从播放器元素的数据属性中获取 (作为备用)
        const videoElement = document.querySelector('.bilibili-player-video');
        if (videoElement) {
            const bvidAttr = videoElement.getAttribute('data-bvid');
            if (bvidAttr) return bvidAttr;
        }

        return null;
    }

    // 视频页面的解析按钮点击事件 (已重构)
    function clickVideoAnalysis(event) {
        const button = event.currentTarget;
        ButtonFeedback.setLoading(button);

        const bvid = getCurrentBvid();

        if (!bvid) {
            console.error('无法获取视频BV号');
            ButtonFeedback.setError(button, '失败');
            return;
        }

        const url = window.location.href;
        const pMatch = url.match(/(?<=p=).*?(?=&|$)/);
        const p = pMatch ? parseInt(pMatch[0], 10) : 1;

        console.log('获取到BV号:', bvid);
        console.log('获取到P号:', p);

        // 直接调用通用视频解析函数
        getVideoUrl(bvid, p);
    }

    // 直播页面的解析按钮点击事件
    function clickLiveAnalysis(event) {
        const button = event.currentTarget;
        ButtonFeedback.setLoading(button);

        const url = window.location.href;
        const roomIdMatch = url.match(/live\.bilibili\.com\/(\d+)/);
        if (roomIdMatch && roomIdMatch[1]) {
            analysisLive(roomIdMatch[1], button);
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
                analysisLive(foundRoomId, button);
            } else {
                ButtonFeedback.setError(button, '失败');
            }
        }
    }

    // 直播解析函数 (已使用 async/await 重构)
    async function analysisLive(roomId, button) {
        if (!roomId) return;

        console.log('开始解析直播:', roomId);

        try {
            // 优先尝试新版API
            const newApiUrl = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=10000&platform=web&ptype=8&dolby=5&panorama=1`;
            const response = await fetch(newApiUrl, {
                credentials: 'include',
                headers: {
                    'Referer': 'https://live.bilibili.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) throw new Error('新API请求失败');

            const data = await response.json();
            if (data.code === 0) {
                const streamUrl = getLiveStreamUrl(data);
                if (streamUrl) {
                    await handleLiveStreamUrl(streamUrl, button);
                    return; // 解析成功，直接返回
                }
            }
            // 如果新API失败或未找到流，则自动尝试旧API
            throw new Error(data.message || '新API未能获取直播流');

        } catch (error) {
            console.warn('新版API解析失败:', error.message, '正在尝试回退到旧版API...');
            try {
                // 回退到旧版API (M3U8)
                const oldApiM3u8Url = `https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${roomId}&qn=10000&platform=h5`;
                const m3u8Response = await fetch(oldApiM3u8Url, { credentials: 'include' });
                if (!m3u8Response.ok) throw new Error('旧API(M3U8)请求失败');

                const m3u8Data = await m3u8Response.json();
                if (m3u8Data.data && m3u8Data.data.durl && m3u8Data.data.durl.length > 0) {
                    await handleLiveStreamUrl(m3u8Data.data.durl[0].url, button);
                    return;
                }

                // 回退到旧版API (FLV)
                console.warn('旧版API(M3U8)解析失败，尝试FLV格式...');
                const oldApiFlvUrl = `https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${roomId}&qn=10000&platform=web`;
                const flvResponse = await fetch(oldApiFlvUrl, { credentials: 'include' });
                if (!flvResponse.ok) throw new Error('旧API(FLV)请求失败');

                const flvData = await flvResponse.json();
                if (flvData.data && flvData.data.durl && flvData.data.durl.length > 0) {
                    await handleLiveStreamUrl(flvData.data.durl[0].url, button);
                    return;
                }

                throw new Error('所有API尝试均失败');

            } catch (fallbackError) {
                console.error('直播解析最终失败:', fallbackError);
                if (button) ButtonFeedback.setError(button, '失败');
            }
        }
    }

    // 辅助函数：处理获取到的直播流URL
    async function handleLiveStreamUrl(streamUrl, button) {
        let format = '未知';
        if (streamUrl.includes('.m3u8')) format = 'M3U8';
        else if (streamUrl.includes('.flv')) format = 'FLV';

        await navigator.clipboard.writeText(streamUrl);
        console.log(`直播流地址 (${format}):`, streamUrl);
        if (button) ButtonFeedback.setSuccess(button, '✓');
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

    // 旧的回退函数已被整合到新的 analysisLive 函数中，可以安全移除

    // 初始执行一次
    addCoverAnalysisButtons();

    // 创建设置面板
    createSettingsPanel();

    // 使用统一的MutationObserver监听所有DOM变化
    const observer = new MutationObserver(debounce(function (mutations) {
        let hasAddedElement = false;

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return; // 只处理元素节点
                hasAddedElement = true;

                // 1. 清理动态加载内容中的链接
                const linksToClean = getElementsBySelector('a', node);
                if (linksToClean.length > 0) {
                    URLCleaner.cleanLinks(linksToClean);
                }

                // 2. 只处理新增节点范围内的视频/直播封面
                addCoverAnalysisButtons(node);
            });
        });

        if (!hasAddedElement) return;

        // 3. 移除可能重新出现的旧按钮
        removeOldButtons();
    }, DEBOUNCE_DELAY));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 在页面滚动时也检查新加载的视频
    window.addEventListener('scroll', debounce(function () {
        // 移除可能重新出现的旧按钮
        removeOldButtons();
        // 添加封面解析按钮
        addCoverAnalysisButtons();
    }, DEBOUNCE_DELAY));

    // ============================== URL变化监听 ==============================

    let lastUrl = window.location.href;

    function setupUrlChangeListener() {
        const handleUrlChange = debounce(() => {
            const currentUrl = window.location.href;
            if (currentUrl === lastUrl) return;

            console.log('URL已变化:', currentUrl);
            lastUrl = currentUrl;

            // 检测页面类型
            const isCurrentLivePage = currentUrl.includes('live.bilibili.com');
            const isCurrentVideoPage = !isCurrentLivePage &&
                (currentUrl.includes('/video/') ||
                    currentUrl.includes('bvid='));

            // 更新全局页面类型变量
            window.isLivePage = isCurrentLivePage;
            window.isVideoPage = isCurrentVideoPage;

            // 移除可能重新出现的旧按钮
            removeOldButtons();

            // 更新主按钮状态
            const mainButton = document.getElementById('bilijx-main-button');
            if (mainButton) {
                if (isCurrentVideoPage || isCurrentLivePage) {
                    mainButton.innerHTML = '解析';
                    mainButton.title = isCurrentLivePage ? '点击解析当前直播间' : '点击解析当前视频';
                } else {
                    mainButton.innerHTML = '⚙️';
                    mainButton.title = 'B站解析脚本设置';
                }
            }

            // 延迟更新封面解析按钮，等待页面内容加载
            setTimeout(addCoverAnalysisButtons, 500);

        }, DEBOUNCE_DELAY);

        // 监听浏览器前进后退
        window.addEventListener('popstate', handleUrlChange);

        // 封装并重写 history 方法
        const wrapHistoryMethod = (method) => {
            const original = history[method];
            history[method] = function (...args) {
                const result = original.apply(this, args);
                const event = new Event(method.toLowerCase());
                event.arguments = args;
                window.dispatchEvent(event);
                handleUrlChange();
                return result;
            };
        };

        // 重写 pushState 和 replaceState
        wrapHistoryMethod('pushState');
        wrapHistoryMethod('replaceState');
    }

    // 启动URL变化监听
    setupUrlChangeListener();
})();
