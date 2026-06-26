/** 活动子类 */
export interface ActivityItem {
  emoji: string;
  title: string;
  desc: string;
  tags?: string[];             // 热门标签
  hot?: string;                // 热门推荐文案，如 "新店开业"
  dpKeyword?: string;          // 大众点评搜索词
  xhsKeyword?: string;         // 小红书搜索词
}

/** 活动大类 */
export interface ActivityCategory {
  icon: string;
  title: string;
  desc: string;
  items: ActivityItem[];
}

/** 大众点评搜索链接（去掉城市限制，全国搜索） */
export function dpSearch(keyword: string): string {
  // 去掉城市代码 7（深圳），用空城市表示全国
  return `https://www.dianping.com/search/keyword/0_${encodeURIComponent(keyword)}`;
}

/** 大众点评 App 跳转 scheme */
export function dpAppScheme(keyword: string): string {
  return `dianping://search?q=${encodeURIComponent(keyword)}`;
}

/** 小红书搜索链接 */
export function xhsSearch(keyword: string): string {
  return `https://www.xiaohongshu.com/explore/${encodeURIComponent(keyword)}`;
}

/** 小红书 App 跳转 scheme */
export function xhsAppScheme(keyword: string): string {
  return `xhsdiscover://search/${encodeURIComponent(keyword)}`;
}

/** 智能打开：先尝试唤起 App，失败则打开网页 */
export function smartOpen(webUrl: string, appScheme: string): void {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    window.open(webUrl, '_blank');
    return;
  }

  // 尝试唤起 App
  const start = Date.now();
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = appScheme;
  document.body.appendChild(iframe);

  // 2 秒后如果 App 没响应，打开网页
  setTimeout(() => {
    document.body.removeChild(iframe);
    if (Date.now() - start > 2200) return; // App 打开了
    window.open(webUrl, '_blank');
  }, 2000);
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    icon: '🍽️', title: '吃饭', desc: '火锅日料烧烤，约饭走起',
    items: [
      { emoji: '🍲', title: '火锅', desc: '麻辣/潮汕/寿喜锅', tags: ['聚餐首选'], dpKeyword: '火锅', xhsKeyword: '火锅推荐' },
      { emoji: '🍣', title: '日料', desc: '刺身/寿司/居酒屋', dpKeyword: '日料', xhsKeyword: '日料推荐' },
      { emoji: '🍖', title: '烧烤', desc: '烤肉/串串/铁板', tags: ['夜宵'], dpKeyword: '烧烤', xhsKeyword: '烧烤推荐' },
      { emoji: '🌶️', title: '川菜/湘菜', desc: '麻辣鲜香', dpKeyword: '川菜', xhsKeyword: '川菜推荐' },
      { emoji: '🥟', title: '粤菜/茶餐厅', desc: '点心/烧腊/煲汤', dpKeyword: '粤菜', xhsKeyword: '粤菜推荐' },
      { emoji: '🍝', title: '西餐/创意菜', desc: '意面/bistro/融合', tags: ['约会'], dpKeyword: '西餐', xhsKeyword: '西餐推荐' },
      { emoji: '🍜', title: '面馆/小吃', desc: '拉面/小笼/各地小吃', dpKeyword: '面馆', xhsKeyword: '面馆推荐' },
      { emoji: '🦞', title: '小龙虾/海鲜', desc: '夏天标配', tags: ['季节性'], dpKeyword: '小龙虾', xhsKeyword: '小龙虾推荐', hot: '🦞 又到了小龙虾季节！' },
    ],
  },
  {
    icon: '🍺', title: '喝酒', desc: '小酌一杯，微醺夜晚',
    items: [
      { emoji: '🍻', title: '精酿啤酒', desc: '精酿吧/taproom', dpKeyword: '精酿酒吧', xhsKeyword: '精酿推荐' },
      { emoji: '🍸', title: '鸡尾酒吧', desc: 'speakeasy/创意调酒', tags: ['氛围好'], dpKeyword: '鸡尾酒吧', xhsKeyword: '鸡尾酒推荐' },
      { emoji: '🏮', title: '居酒屋', desc: '烧鸟/清酒/嗨棒', dpKeyword: '居酒屋', xhsKeyword: '居酒屋推荐' },
      { emoji: '🎵', title: 'LiveHouse', desc: '现场音乐+酒', dpKeyword: 'LiveHouse', xhsKeyword: 'LiveHouse推荐' },
      { emoji: '🎤', title: 'KTV', desc: '唱歌喝酒一条龙', dpKeyword: 'KTV', xhsKeyword: 'KTV推荐' },
      { emoji: '🌃', title: ' rooftop/露台', desc: '看夜景喝酒', tags: ['拍照出片'], dpKeyword: '露台酒吧', xhsKeyword: '露台酒吧推荐', hot: '🌃 夏日露台季，氛围感拉满' },
    ],
  },
  {
    icon: '☕', title: '咖啡/下午茶', desc: '闲聊八卦好去处',
    items: [
      { emoji: '☕', title: '独立咖啡馆', desc: '手冲/冷萃/特调', tags: ['办公友好'], dpKeyword: '咖啡馆', xhsKeyword: '咖啡馆探店' },
      { emoji: '🍰', title: '甜品店', desc: '蛋糕/冰品/舒芙蕾', dpKeyword: '甜品店', xhsKeyword: '甜品推荐' },
      { emoji: '🍵', title: '茶馆/茶室', desc: '中式茶/围炉煮茶', tags: ['安静'], dpKeyword: '茶馆', xhsKeyword: '茶馆推荐' },
      { emoji: '🧋', title: '奶茶/糖水', desc: '新式茶饮/广式糖水', dpKeyword: '奶茶', xhsKeyword: '奶茶推荐' },
      { emoji: '🥐', title: 'Brunch/早午餐', desc: '周末慵懒时光', tags: ['周末限定'], dpKeyword: '早午餐', xhsKeyword: 'Brunch推荐' },
      { emoji: '📸', title: '网红打卡店', desc: '拍照好看+好吃', tags: ['出片'], dpKeyword: '网红店', xhsKeyword: '网红店打卡', hot: '📸 最近好几家新店刷屏了' },
    ],
  },
  {
    icon: '🚗', title: '自驾/周边', desc: '说走就走的短途',
    items: [
      { emoji: '🏘️', title: '古镇/古村', desc: '江南水乡/徽派村落', dpKeyword: '古镇', xhsKeyword: '古镇攻略' },
      { emoji: '⛰️', title: '爬山/徒步', desc: '周边山野一日游', dpKeyword: '爬山', xhsKeyword: '徒步路线推荐' },
      { emoji: '🏕️', title: '露营/野餐', desc: '帐篷/天幕/烧烤', tags: ['热门'], dpKeyword: '露营地', xhsKeyword: '露营推荐' },
      { emoji: '♨️', title: '温泉', desc: '泡汤放松', dpKeyword: '温泉', xhsKeyword: '温泉推荐' },
      { emoji: '🍓', title: '采摘/农场', desc: '草莓/樱桃/葡萄园', tags: ['季节性'], dpKeyword: '采摘园', xhsKeyword: '采摘推荐' },
      { emoji: '🏎️', title: '卡丁车/户外', desc: '速度与激情', dpKeyword: '卡丁车', xhsKeyword: '卡丁车推荐' },
      { emoji: '🚴', title: '骑行路线', desc: '城市周边骑行', dpKeyword: '骑行', xhsKeyword: '骑行路线' },
      { emoji: '🏖️', title: '海边/湖边', desc: '看海/环湖自驾', dpKeyword: '海边', xhsKeyword: '海边自驾', hot: '🏖️ 夏天到了，海边走起！' },
    ],
  },
  {
    icon: '🎬', title: '娱乐', desc: '一起嗨皮',
    items: [
      { emoji: '🎬', title: '看电影', desc: 'IMAX/Dolby/艺术院线', dpKeyword: '电影院', xhsKeyword: '电影推荐' },
      { emoji: '🏠', title: '密室逃脱', desc: '沉浸式解谜', dpKeyword: '密室逃脱', xhsKeyword: '密室推荐' },
      { emoji: '🎱', title: '桌游吧', desc: '狼人杀/剧本杀/德扑', tags: ['聚会'], dpKeyword: '桌游', xhsKeyword: '剧本杀推荐' },
      { emoji: '🎨', title: '看展/美术馆', desc: '艺术/装置/拍照', tags: ['文艺'], dpKeyword: '美术馆', xhsKeyword: '展览推荐', hot: '🎨 最近好几个大展在展' },
      { emoji: '🎢', title: '游乐园', desc: '迪士尼/环球/欢乐谷', dpKeyword: '游乐园', xhsKeyword: '游乐园攻略' },
      { emoji: '🏹', title: '射箭/射击', desc: '小众运动体验', dpKeyword: '射箭馆', xhsKeyword: '射箭体验' },
    ],
  },
  {
    icon: '🛍️', title: '逛街/购物', desc: '买买买才是正经事',
    items: [
      { emoji: '🏬', title: '大型商场', desc: '一站式逛吃', dpKeyword: '购物中心', xhsKeyword: '商场推荐' },
      { emoji: '🎪', title: '市集/夜市', desc: '文创/手作/小吃', tags: ['周末限定'], dpKeyword: '市集', xhsKeyword: '周末市集' },
      { emoji: '👗', title: '买手店/古着', desc: '小众品牌/二手', dpKeyword: '买手店', xhsKeyword: '买手店推荐' },
      { emoji: '🪴', title: '花市/植物园', desc: '买花/拍照/治愈', dpKeyword: '花市', xhsKeyword: '花市推荐' },
    ],
  },
  {
    icon: '💆', title: '放松/养生', desc: '犒劳一下自己',
    items: [
      { emoji: '💆', title: 'SPA/按摩', desc: '精油/泰式/足疗', dpKeyword: 'SPA', xhsKeyword: 'SPA推荐' },
      { emoji: '♨️', title: '温泉/汤泉', desc: '泡汤/汗蒸', dpKeyword: '温泉', xhsKeyword: '温泉推荐' },
      { emoji: '🧘', title: '瑜伽/普拉提', desc: '一起拉伸放松', dpKeyword: '瑜伽馆', xhsKeyword: '瑜伽推荐' },
      { emoji: '🎮', title: '电竞/主机吧', desc: 'PS5/Switch/PC', tags: ['宅'], dpKeyword: '电竞馆', xhsKeyword: '电竞酒店' },
    ],
  },
  {
    icon: '✈️', title: '旅行', desc: '需要更多时间，但值得',
    items: [
      { emoji: '🏙️', title: '城市探索', desc: '2~3天打卡新城市', dpKeyword: '旅游攻略', xhsKeyword: '城市旅行攻略' },
      { emoji: '🏝️', title: '海岛度假', desc: '阳光沙滩海浪', dpKeyword: '海岛', xhsKeyword: '海岛旅行' },
      { emoji: '🚙', title: '长途自驾', desc: '3天+自由行', dpKeyword: '自驾游', xhsKeyword: '自驾路线' },
      { emoji: '⛺', title: '野外露营', desc: '过夜露营/篝火', dpKeyword: '露营', xhsKeyword: '露营过夜' },
      { emoji: '🗻', title: '名山/国家公园', desc: '五岳/黄山/张家界', dpKeyword: '旅游景点', xhsKeyword: '国内旅游推荐' },
    ],
  },
];
