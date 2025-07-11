# B站视频和直播解析脚本

<div align="center">
  <a href="https://raw.githubusercontent.com/gujimy/BiliBili-JX/main/bilijx.user.js">
    <img src="https://img.shields.io/badge/安装-哔哩视频解析脚本-FF6699.svg?style=for-the-badge&logo=tampermonkey&logoColor=white&labelColor=101F2E" alt="安装哔哩视频解析脚本">
  </a>
</div>

**安装cdn加速**：点击 [安装脚本](https://raw.gitmirror.com/gujimy/BiliBili-JX/main/bilijx.user.js)

## 功能特点

- 视频解析：一键获取B站视频的直链地址，支持多种清晰度
- 直播解析：获取B站直播间的直播流地址，支持FLV和M3U8格式
- 解析按钮：在视频页面右下角添加便捷解析按钮
- 封面按钮：为视频/直播封面添加快捷解析按钮
- 干净链接：自动清理B站URL中的跟踪参数
- CDN锁定：根据地区智能选择最优CDN节点，提高视频加载速度
- 设置面板：提供友好的设置界面，自定义脚本行为

## 安装方法

1. 首先安装 [Tampermonkey](https://www.tampermonkey.net/) 或其他用户脚本管理器
2. 点击上方的"安装哔哩视频解析脚本"按钮
3. 在打开的页面中点击"安装"按钮

## 使用方法

### 视频解析
- 在视频播放页面，点击右下角"视频解析"按钮
- 或在任意页面，鼠标悬停在视频封面上，点击出现的"解析"按钮
- 解析成功后，视频直链会自动复制到剪贴板

### 直播解析
- 在直播页面，点击右下角或左上角的"直播解析"按钮
- 或在任意页面，鼠标悬停在直播封面上，点击出现的"直播解析"按钮
- 解析成功后，直播流地址会自动复制到剪贴板

### CDN锁定
- 点击页面左下角的⚙️设置按钮打开设置面板
- 先选择您所在的地区，系统会自动加载该地区最优的CDN节点列表
- 从列表中选择一个CDN节点（或保留"使用默认CDN"）
- 点击"保存设置"按钮应用更改
- 下次解析视频时将使用您选择的CDN节点

## 兼容页面

- 视频播放页：`https://www.bilibili.com/video/*`
- 直播页面：`https://live.bilibili.com/*`
- 首页：`https://www.bilibili.com/`
- 热门页：`https://www.bilibili.com/v/popular*`
- 搜索结果页：`https://search.bilibili.com/*`
- 用户空间页：`https://space.bilibili.com/*`
- 排行榜页：`https://www.bilibili.com/v/*/ranked*`
- 频道页：`https://www.bilibili.com/channel/*`
- 专栏首页：`https://www.bilibili.com/read/home*`
- 动态页：`https://t.bilibili.com/*`
- 历史记录页：`https://www.bilibili.com/history*`
- 番剧页面：`https://www.bilibili.com/bangumi/*`

## 技术特性

- 使用MutationObserver监听DOM变化，动态添加解析按钮
- 滚动事件防抖处理，提高性能
- 支持多种视频卡片布局的CSS选择器
- 干净链接功能，移除URL中的跟踪参数
- 使用GM_setValue/GM_getValue存储用户设置
- 根据地区动态获取最优CDN节点列表

## 更新日志

- v2.6: 优化CDN锁定功能，支持根据地区动态获取最优CDN节点
- v2.5: 优化解析提示效果，减少通知显示时间
- v2.4: 添加干净链接功能，清理URL跟踪参数
- v2.3: 代码优化，提高性能和可维护性
- v2.2: 修复标题区域显示解析按钮的问题
- v2.1: 优化直播解析，优先使用m3u8格式
- v2.0: 增加直播解析功能
- v1.9: 扩展封面解析按钮覆盖范围
- v1.8: 添加鼠标悬停显示解析按钮
- v1.7: 增加封面解析按钮
- v1.0: 首次发布，基本视频解析功能

## 注意事项

- 本脚本仅供学习和研究使用，请勿用于商业用途
- 请尊重B站内容创作者的权益，合理使用解析功能
- 部分视频可能需要登录B站账号才能解析高清晰度
- CDN锁定功能可能因网络环境不同而效果各异

## 免责声明

本脚本仅作为技术研究，使用者应自行承担使用本脚本产生的一切后果。

## 致谢

- 感谢 [CCB](https://github.com/Kanda-Akihito-kun/ccb) 项目提供的CDN节点数据
- 感谢 [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 提供的B站API参考
- 感谢 [mmyo456/BiliAnalysis](https://github.com/mmyo456/BiliAnalysis) 提供的代码参考
- 感谢 [Bilibili 干净链接](https://greasyfork.org/zh-CN/scripts/393995-bilibili-%E5%B9%B2%E5%87%80%E9%93%BE%E6%8E%A5) 提供的清理URL功能参考 
